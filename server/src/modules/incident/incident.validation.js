const { z } = require('zod');
const { SEVERITY, INCIDENT_STATUS, ROOT_CAUSE_CATEGORIES } = require('../../config/constants');

const createIncidentSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(200),
  description: z.string().max(2000).optional().default(''),
  severity: z.enum(Object.values(SEVERITY)),
  commanderId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Commander ID').optional(),
  responderIds: z.array(z.string().regex(/^[0-9a-fA-F]{24}$/)).optional().default([]),
});

const transitionIncidentSchema = z.object({
  targetStatus: z.enum(Object.values(INCIDENT_STATUS)),
  expectedVersion: z.number().int().nonnegative().optional(),
  // Specific payload fields based on transition
  reason: z.string().max(500).optional(),
  assigneeIds: z.array(z.string().regex(/^[0-9a-fA-F]{24}$/)).optional(),
  mitigationSummary: z.string().max(2000).optional(),
  rootCauseCategory: z.enum(ROOT_CAUSE_CATEGORIES).optional(),
  rootCauseDescription: z.string().max(2000).optional(),
});

const executeRunbookStepSchema = z.object({
  status: z.enum(['COMPLETED', 'SKIPPED']),
  verificationInput: z.string().max(1000).optional().default(''),
});

const addCommentSchema = z.object({
  content: z.string().min(1, 'Comment cannot be empty').max(2000),
});

const listIncidentsQuerySchema = z.object({
  status: z.string().optional(),
  severity: z.string().optional(),
  search: z.string().optional(),
  assignedToMe: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(25),
});

module.exports = {
  createIncidentSchema,
  transitionIncidentSchema,
  executeRunbookStepSchema,
  addCommentSchema,
  listIncidentsQuerySchema,
};
