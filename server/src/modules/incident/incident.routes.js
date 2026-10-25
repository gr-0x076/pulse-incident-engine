const express = require('express');
const router = express.Router();
const incidentController = require('./incident.controller');
const authenticate = require('../../middleware/authenticate');
const authorize = require('../../middleware/authorize');
const validateRequest = require('../../middleware/validateRequest');
const { ROLES } = require('../../config/constants');
const {
  createIncidentSchema,
  transitionIncidentSchema,
  executeRunbookStepSchema,
  addCommentSchema,
  listIncidentsQuerySchema,
} = require('./incident.validation');

// All incident endpoints require valid authentication
router.use(authenticate);

router.get(
  '/',
  validateRequest(listIncidentsQuerySchema, 'query'),
  incidentController.listIncidents
);

router.post(
  '/',
  authorize(ROLES.ADMIN, ROLES.INCIDENT_COMMANDER, ROLES.RESPONDER),
  validateRequest(createIncidentSchema),
  incidentController.createIncident
);

router.get('/:id', incidentController.getIncidentById);

router.post(
  '/:id/transition',
  authorize(ROLES.ADMIN, ROLES.INCIDENT_COMMANDER, ROLES.RESPONDER),
  validateRequest(transitionIncidentSchema),
  incidentController.transitionIncident
);

router.patch(
  '/:id/runbook/steps/:stepIndex',
  authorize(ROLES.ADMIN, ROLES.INCIDENT_COMMANDER, ROLES.RESPONDER),
  validateRequest(executeRunbookStepSchema),
  incidentController.executeRunbookStep
);

router.post(
  '/:id/timeline/comment',
  authorize(ROLES.ADMIN, ROLES.INCIDENT_COMMANDER, ROLES.RESPONDER),
  validateRequest(addCommentSchema),
  incidentController.addTimelineComment
);

module.exports = router;
