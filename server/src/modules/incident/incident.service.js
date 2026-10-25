const {
  Incident,
  TimelineEvent,
  Counter,
  Runbook,
  User,
  Postmortem,
} = require('../../models');
const {
  INCIDENT_STATUS,
  TIMELINE_EVENT_TYPES,
  ROLES,
} = require('../../config/constants');
const stateMachine = require('./incident.statemachine');
const AppError = require('../../utils/AppError');
const { emitToOrg, emitToIncident } = require('../../socket');
const { runInSafeTransaction } = require('../../utils/safeTransaction');

class IncidentService {
  async listIncidents(orgId, query, user) {
    const { status, severity, search, assignedToMe, page = 1, limit = 25 } = query;
    const filter = { orgId };

    if (status) {
      if (status === 'ACTIVE') {
        filter.status = {
          $in: [
            INCIDENT_STATUS.FIRED,
            INCIDENT_STATUS.ACKNOWLEDGED,
            INCIDENT_STATUS.INVESTIGATING,
            INCIDENT_STATUS.ESCALATED,
          ],
        };
      } else if (status.includes(',')) {
        filter.status = { $in: status.split(',').map((s) => s.trim()) };
      } else {
        filter.status = status;
      }
    }

    if (severity) {
      if (severity.includes(',')) {
        filter.severity = { $in: severity.split(',').map((s) => s.trim()) };
      } else {
        filter.severity = severity;
      }
    }

    if (assignedToMe === 'true' && user) {
      filter.$or = [{ commander: user._id }, { responders: user._id }];
    }

    if (search) {
      const searchNum = parseInt(search.replace(/[^0-9]/g, ''), 10);
      const searchConditions = [{ title: { $regex: search, $options: 'i' } }];
      if (!isNaN(searchNum)) {
        searchConditions.push({ incidentNumber: searchNum });
      }
      if (filter.$or) {
        filter.$and = [{ $or: filter.$or }, { $or: searchConditions }];
        delete filter.$or;
      } else {
        filter.$or = searchConditions;
      }
    }

    const skip = (page - 1) * limit;

    const [incidents, total] = await Promise.all([
      Incident.find(filter)
        .populate('commander', 'name email role')
        .populate('responders', 'name email role')
        .populate('createdBy', 'name email')
        .populate('runbookId', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Incident.countDocuments(filter),
    ]);

    return {
      incidents,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async getIncidentById(id, orgId) {
    const incident = await Incident.findOne({ _id: id, orgId })
      .populate('commander', 'name email role')
      .populate('responders', 'name email role')
      .populate('createdBy', 'name email')
      .populate('runbookId')
      .populate('postmortemId');

    if (!incident) {
      throw new AppError('Incident not found in your organization.', 404, 'INCIDENT_NOT_FOUND');
    }

    const timeline = await TimelineEvent.find({ incidentId: id })
      .populate('actor', 'name email role')
      .sort({ createdAt: 1 })
      .lean();

    return { incident, timeline };
  }

  async createIncident(data, user) {
    const orgId = user.orgId._id || user.orgId;

    return await runInSafeTransaction(async (session) => {
      // 1. Atomically allocate sequence number
      const incidentNumber = await Counter.getNextSequence(orgId, 'incidentNumber');

      // 2. Scored runbook template auto-matcher
      const matchingRunbook = await Runbook.findMatchingRunbook(
        orgId,
        data.title,
        data.severity
      );

      let runbookProgress = [];
      let runbookId = null;

      if (matchingRunbook) {
        runbookId = matchingRunbook._id;
        runbookProgress = matchingRunbook.steps.map((step) => ({
          stepIndex: step.order,
          status: 'PENDING',
          verificationInput: '',
        }));
      }

      // 3. Assemble and create incident
      const incidentData = {
        orgId,
        incidentNumber,
        title: data.title,
        description: data.description || '',
        severity: data.severity,
        status: INCIDENT_STATUS.FIRED,
        createdBy: user._id,
        commander: data.commanderId || null,
        responders: data.responderIds || [],
        runbookId,
        runbookProgress,
        version: 0,
      };

      const [incident] = await Incident.create([incidentData], session ? { session } : {});

      // 4. Create initial timeline event
      const timelineEventData = {
        incidentId: incident._id,
        orgId,
        type: TIMELINE_EVENT_TYPES.STATE_CHANGE,
        actor: user._id,
        actorName: user.name,
        content: `Incident INC-${String(incidentNumber).padStart(5, '0')} declared at severity [${incident.severity}]. Status set to [FIRED].`,
        metadata: {
          toStatus: INCIDENT_STATUS.FIRED,
          newSeverity: incident.severity,
        },
      };

      await TimelineEvent.create([timelineEventData], session ? { session } : {});

      // 5. If runbook auto-attached, log timeline event
      if (matchingRunbook) {
        await TimelineEvent.create(
          [
            {
              incidentId: incident._id,
              orgId,
              type: TIMELINE_EVENT_TYPES.RUNBOOK_ATTACHED,
              actor: null,
              actorName: 'Pulse Playbook Engine',
              content: `Auto-attached runbook SOP: "${matchingRunbook.name}" (${matchingRunbook.steps.length} interactive diagnostic steps).`,
            },
          ],
          session ? { session } : {}
        );
      }

      // Populate for response and WebSocket broadcast
      const populated = await Incident.findById(incident._id)
        .populate('commander', 'name email role')
        .populate('responders', 'name email role')
        .populate('createdBy', 'name email')
        .populate('runbookId');

      emitToOrg(orgId, 'incident:created', populated);

      return populated;
    });
  }

  async transitionIncident(id, targetStatus, payload, user) {
    const orgId = user.orgId._id || user.orgId;

    const incident = await Incident.findOne({ _id: id, orgId });
    if (!incident) {
      throw new AppError('Incident not found.', 404, 'INCIDENT_NOT_FOUND');
    }

    // Optimistic Concurrency Control (OCC) Check
    if (payload.expectedVersion !== undefined && incident.version !== payload.expectedVersion) {
      throw new AppError(
        `State conflict: Incident has been modified by another responder (current v${incident.version}, expected v${payload.expectedVersion}).`,
        409,
        'INCIDENT_VERSION_CONFLICT',
        {
          currentVersion: incident.version,
          expectedVersion: payload.expectedVersion,
          currentStatus: incident.status,
        }
      );
    }

    // State machine guard validation
    const hasPostmortem = Boolean(incident.postmortemId);
    const validation = stateMachine.validateTransition({
      currentStatus: incident.status,
      targetStatus,
      userRole: user.role,
      payload,
      hasPostmortem,
    });

    if (!validation.isValid) {
      throw new AppError(
        validation.message,
        validation.errorCode === 'AUTHZ_INSUFFICIENT_ROLE' ? 403 : 422,
        validation.errorCode,
        validation.details
      );
    }

    const fromStatus = incident.status;

    return await runInSafeTransaction(async (session) => {
      // Apply status & timestamp mutations
      incident.status = targetStatus;

      if (targetStatus === INCIDENT_STATUS.ACKNOWLEDGED) {
        incident.acknowledgedAt = new Date();
      } else if (targetStatus === INCIDENT_STATUS.INVESTIGATING) {
        if (payload.assigneeIds && payload.assigneeIds.length > 0) {
          incident.responders = payload.assigneeIds;
          if (!incident.commander && payload.assigneeIds.length > 0) {
            incident.commander = payload.assigneeIds[0];
          }
        } else if (!incident.commander && user.role !== ROLES.VIEWER) {
          incident.commander = user._id;
          if (!incident.responders.includes(user._id)) {
            incident.responders.push(user._id);
          }
        }
      } else if (targetStatus === INCIDENT_STATUS.ESCALATED) {
        // Emergency escalation
        if (payload.reason) {
          incident.description = incident.description
            ? `${incident.description}\n[ESCALATION REASON]: ${payload.reason}`
            : `[ESCALATION REASON]: ${payload.reason}`;
        }
      } else if (targetStatus === INCIDENT_STATUS.MITIGATED) {
        incident.mitigatedAt = new Date();
        incident.mitigationSummary = payload.mitigationSummary;
      } else if (targetStatus === INCIDENT_STATUS.RESOLVED) {
        incident.resolvedAt = new Date();
        incident.rootCause = {
          category: payload.rootCauseCategory,
          description: payload.rootCauseDescription,
        };
      } else if (targetStatus === INCIDENT_STATUS.CLOSED) {
        incident.closedAt = new Date();
      }

      await incident.save(session ? { session } : {});

      // Record timeline event
      let timelineContent = `Status transitioned from [${fromStatus}] to [${targetStatus}].`;
      if (targetStatus === INCIDENT_STATUS.ESCALATED && payload.reason) {
        timelineContent += ` Escalation Reason: ${payload.reason}`;
      } else if (targetStatus === INCIDENT_STATUS.MITIGATED) {
        timelineContent += ` Mitigation: ${payload.mitigationSummary}`;
      } else if (targetStatus === INCIDENT_STATUS.RESOLVED) {
        timelineContent += ` Root Cause [${payload.rootCauseCategory}]: ${payload.rootCauseDescription}`;
      }

      const timelineEvent = await TimelineEvent.create(
        [
          {
            incidentId: incident._id,
            orgId,
            type:
              targetStatus === INCIDENT_STATUS.ESCALATED
                ? TIMELINE_EVENT_TYPES.ESCALATION
                : TIMELINE_EVENT_TYPES.STATE_CHANGE,
            actor: user._id,
            actorName: user.name,
            content: timelineContent,
            metadata: {
              fromStatus,
              toStatus: targetStatus,
              escalationReason: payload.reason,
            },
          },
        ],
        session ? { session } : {}
      );

      // Populate updated incident
      const updated = await Incident.findById(incident._id)
        .populate('commander', 'name email role')
        .populate('responders', 'name email role')
        .populate('createdBy', 'name email')
        .populate('runbookId')
        .populate('postmortemId');

      // Real-time broadcasts
      emitToOrg(orgId, 'incident:updated', updated);
      emitToIncident(incident._id.toString(), 'incident:transitioned', {
        incident: updated,
        timelineEvent: timelineEvent[0],
      });

      return { incident: updated, timelineEvent: timelineEvent[0] };
    });
  }

  async executeRunbookStep(id, stepIndex, { status, verificationInput }, user) {
    const orgId = user.orgId._id || user.orgId;
    const incident = await Incident.findOne({ _id: id, orgId }).populate('runbookId');

    if (!incident) {
      throw new AppError('Incident not found.', 404, 'INCIDENT_NOT_FOUND');
    }

    if (!incident.runbookId) {
      throw new AppError('No runbook attached to this incident.', 400, 'NO_RUNBOOK_ATTACHED');
    }

    const stepOrder = parseInt(stepIndex, 10);
    const progressItem = incident.runbookProgress.find((p) => p.stepIndex === stepOrder);
    const templateStep = incident.runbookId.steps.find((s) => s.order === stepOrder);

    if (!progressItem) {
      throw new AppError(`Runbook step ${stepOrder} not found in incident checklist.`, 404, 'STEP_NOT_FOUND');
    }

    // Mutate step progress
    progressItem.status = status;
    progressItem.completedBy = user._id;
    progressItem.completedAt = new Date();
    progressItem.verificationInput = verificationInput || '';

    await incident.save();

    // Append immutable timeline event
    const timelineEvent = await TimelineEvent.create({
      incidentId: incident._id,
      orgId,
      type: TIMELINE_EVENT_TYPES.RUNBOOK_STEP_EXECUTED,
      actor: user._id,
      actorName: user.name,
      content: `Runbook Step #${stepOrder} ("${templateStep?.title || 'Diagnostic Step'}") marked as [${status}].${
        verificationInput ? ` Output/Note: "${verificationInput}"` : ''
      }`,
      metadata: {
        runbookStepIndex: stepOrder,
        runbookStepTitle: templateStep?.title,
        runbookStepStatus: status,
      },
    });

    const payload = {
      incidentId: incident._id,
      runbookProgress: incident.runbookProgress,
      timelineEvent,
    };

    emitToIncident(incident._id.toString(), 'incident:runbook_updated', payload);
    emitToOrg(orgId, 'incident:updated', incident);

    return payload;
  }

  async addTimelineComment(id, content, user) {
    const orgId = user.orgId._id || user.orgId;
    const incident = await Incident.findOne({ _id: id, orgId });

    if (!incident) {
      throw new AppError('Incident not found.', 404, 'INCIDENT_NOT_FOUND');
    }

    const timelineEvent = await TimelineEvent.create({
      incidentId: incident._id,
      orgId,
      type: TIMELINE_EVENT_TYPES.COMMENT,
      actor: user._id,
      actorName: user.name,
      content,
    });

    emitToIncident(incident._id.toString(), 'timeline:new_event', timelineEvent);

    return timelineEvent;
  }
}

module.exports = new IncidentService();
