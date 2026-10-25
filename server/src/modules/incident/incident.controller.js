const incidentService = require('./incident.service');
const asyncHandler = require('../../utils/asyncHandler');

class IncidentController {
  listIncidents = asyncHandler(async (req, res) => {
    const result = await incidentService.listIncidents(req.orgId, req.query, req.user);
    res.status(200).json({
      success: true,
      data: result.incidents,
      pagination: result.pagination,
    });
  });

  getIncidentById = asyncHandler(async (req, res) => {
    const result = await incidentService.getIncidentById(req.params.id, req.orgId);
    res.status(200).json({
      success: true,
      data: result,
    });
  });

  createIncident = asyncHandler(async (req, res) => {
    const incident = await incidentService.createIncident(req.body, req.user);
    res.status(201).json({
      success: true,
      data: incident,
      message: 'Incident declared and response runbook attached.',
    });
  });

  transitionIncident = asyncHandler(async (req, res) => {
    const { targetStatus, expectedVersion, ...payload } = req.body;
    const result = await incidentService.transitionIncident(
      req.params.id,
      targetStatus,
      { ...payload, expectedVersion },
      req.user
    );
    res.status(200).json({
      success: true,
      data: result,
      message: `Incident transitioned to [${targetStatus}] successfully.`,
    });
  });

  executeRunbookStep = asyncHandler(async (req, res) => {
    const result = await incidentService.executeRunbookStep(
      req.params.id,
      req.params.stepIndex,
      req.body,
      req.user
    );
    res.status(200).json({
      success: true,
      data: result,
      message: `Runbook step #${req.params.stepIndex} updated.`,
    });
  });

  addTimelineComment = asyncHandler(async (req, res) => {
    const comment = await incidentService.addTimelineComment(
      req.params.id,
      req.body.content,
      req.user
    );
    res.status(201).json({
      success: true,
      data: comment,
      message: 'Timeline update posted.',
    });
  });
}

module.exports = new IncidentController();
