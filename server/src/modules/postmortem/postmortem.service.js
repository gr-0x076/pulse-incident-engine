const { Postmortem, Incident, TimelineEvent } = require('../../models');
const { POSTMORTEM_STATUS, TIMELINE_EVENT_TYPES } = require('../../config/constants');
const AppError = require('../../utils/AppError');
const { emitToOrg, emitToIncident } = require('../../socket');

class PostmortemService {
  async listPostmortems(orgId) {
    return await Postmortem.find({ orgId })
      .populate('incidentId', 'incidentNumber title severity status createdAt resolvedAt')
      .populate('authorId', 'name email role')
      .populate('actionItems.assignee', 'name email')
      .sort({ createdAt: -1 })
      .lean();
  }

  async getPostmortemById(id, orgId) {
    const postmortem = await Postmortem.findOne({ _id: id, orgId })
      .populate('incidentId')
      .populate('authorId', 'name email role')
      .populate('actionItems.assignee', 'name email');

    if (!postmortem) {
      throw new AppError('Postmortem not found.', 404, 'POSTMORTEM_NOT_FOUND');
    }
    return postmortem;
  }

  async getPostmortemByIncident(incidentId, orgId) {
    const postmortem = await Postmortem.findOne({ incidentId, orgId })
      .populate('incidentId')
      .populate('authorId', 'name email role')
      .populate('actionItems.assignee', 'name email');

    return postmortem;
  }

  async createPostmortem(data, user) {
    const orgId = user.orgId._id || user.orgId;
    const incident = await Incident.findOne({ _id: data.incidentId, orgId });

    if (!incident) {
      throw new AppError('Incident not found.', 404, 'INCIDENT_NOT_FOUND');
    }

    const existing = await Postmortem.findOne({ incidentId: data.incidentId });
    if (existing) {
      throw new AppError('A postmortem report already exists for this incident.', 409, 'POSTMORTEM_ALREADY_EXISTS');
    }

    // Auto-calculate impact duration if resolved
    let durationMinutes = 0;
    if (incident.resolvedAt && incident.createdAt) {
      durationMinutes = Math.max(1, Math.round((incident.resolvedAt - incident.createdAt) / 60000));
    }

    const postmortem = await Postmortem.create({
      orgId,
      incidentId: incident._id,
      title: data.title || `Postmortem: INC-${incident.incidentNumber} - ${incident.title}`,
      summary: data.summary || '',
      impact: {
        durationMinutes: data.impact?.durationMinutes || durationMinutes,
        affectedServices: data.impact?.affectedServices || [],
      },
      rootCause: {
        category: data.rootCause?.category || incident.rootCause?.category || null,
        description: data.rootCause?.description || incident.rootCause?.description || '',
      },
      actionItems: data.actionItems || [],
      lessonsLearned: data.lessonsLearned || '',
      status: POSTMORTEM_STATUS.DRAFT,
      authorId: user._id,
    });

    incident.postmortemId = postmortem._id;
    await incident.save();

    await TimelineEvent.create({
      incidentId: incident._id,
      orgId,
      type: TIMELINE_EVENT_TYPES.SYSTEM,
      actor: user._id,
      actorName: user.name,
      content: `Draft Postmortem authored by ${user.name}: "${postmortem.title}".`,
    });

    return postmortem;
  }

  async updatePostmortem(id, data, orgId) {
    const postmortem = await Postmortem.findOne({ _id: id, orgId });
    if (!postmortem) {
      throw new AppError('Postmortem not found.', 404, 'POSTMORTEM_NOT_FOUND');
    }

    Object.assign(postmortem, data);
    await postmortem.save();

    return postmortem;
  }

  async publishPostmortem(id, user) {
    const orgId = user.orgId._id || user.orgId;
    const postmortem = await Postmortem.findOne({ _id: id, orgId }).populate('incidentId');

    if (!postmortem) {
      throw new AppError('Postmortem not found.', 404, 'POSTMORTEM_NOT_FOUND');
    }

    postmortem.status = POSTMORTEM_STATUS.PUBLISHED;
    await postmortem.save();

    const incident = await Incident.findById(postmortem.incidentId._id);
    if (incident) {
      incident.postmortemId = postmortem._id;
      await incident.save();

      const timelineEvent = await TimelineEvent.create({
        incidentId: incident._id,
        orgId,
        type: TIMELINE_EVENT_TYPES.SYSTEM,
        actor: user._id,
        actorName: user.name,
        content: `Postmortem published & linked. Incident INC-${incident.incidentNumber} is now unlocked for final closure.`,
      });

      emitToIncident(incident._id.toString(), 'timeline:new_event', timelineEvent);
      emitToOrg(orgId, 'incident:updated', incident);
    }

    emitToOrg(orgId, 'postmortem:published', postmortem);

    return postmortem;
  }
}

module.exports = new PostmortemService();
