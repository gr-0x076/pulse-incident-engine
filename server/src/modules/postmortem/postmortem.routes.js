const express = require('express');
const router = express.Router();
const postmortemController = require('./postmortem.controller');
const authenticate = require('../../middleware/authenticate');
const authorize = require('../../middleware/authorize');
const validateRequest = require('../../middleware/validateRequest');
const { ROLES } = require('../../config/constants');
const {
  createPostmortemSchema,
  updatePostmortemSchema,
} = require('./postmortem.validation');

router.use(authenticate);

router.get('/', postmortemController.listPostmortems);
router.get('/incident/:incidentId', postmortemController.getPostmortemByIncident);
router.get('/:id', postmortemController.getPostmortemById);

router.post(
  '/',
  authorize(ROLES.ADMIN, ROLES.INCIDENT_COMMANDER, ROLES.RESPONDER),
  validateRequest(createPostmortemSchema),
  postmortemController.createPostmortem
);

router.put(
  '/:id',
  authorize(ROLES.ADMIN, ROLES.INCIDENT_COMMANDER, ROLES.RESPONDER),
  validateRequest(updatePostmortemSchema),
  postmortemController.updatePostmortem
);

router.post(
  '/:id/publish',
  authorize(ROLES.ADMIN, ROLES.INCIDENT_COMMANDER),
  postmortemController.publishPostmortem
);

module.exports = router;
