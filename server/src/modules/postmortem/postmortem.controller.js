const postmortemService = require('./postmortem.service');
const asyncHandler = require('../../utils/asyncHandler');

class PostmortemController {
  listPostmortems = asyncHandler(async (req, res) => {
    const result = await postmortemService.listPostmortems(req.orgId);
    res.status(200).json({ success: true, data: result });
  });

  getPostmortemById = asyncHandler(async (req, res) => {
    const result = await postmortemService.getPostmortemById(req.params.id, req.orgId);
    res.status(200).json({ success: true, data: result });
  });

  getPostmortemByIncident = asyncHandler(async (req, res) => {
    const result = await postmortemService.getPostmortemByIncident(req.params.incidentId, req.orgId);
    res.status(200).json({ success: true, data: result });
  });

  createPostmortem = asyncHandler(async (req, res) => {
    const result = await postmortemService.createPostmortem(req.body, req.user);
    res.status(201).json({
      success: true,
      data: result,
      message: 'Postmortem draft created and linked to incident.',
    });
  });

  updatePostmortem = asyncHandler(async (req, res) => {
    const result = await postmortemService.updatePostmortem(req.params.id, req.body, req.orgId);
    res.status(200).json({
      success: true,
      data: result,
      message: 'Postmortem draft updated.',
    });
  });

  publishPostmortem = asyncHandler(async (req, res) => {
    const result = await postmortemService.publishPostmortem(req.params.id, req.user);
    res.status(200).json({
      success: true,
      data: result,
      message: 'Postmortem published. Incident closure unlocked.',
    });
  });
}

module.exports = new PostmortemController();
