const { z } = require('zod');
const { ROOT_CAUSE_CATEGORIES } = require('../../config/constants');

const actionItemSchema = z.object({
  description: z.string().min(5, 'Action item description must be at least 5 characters'),
  assignee: z.string().regex(/^[0-9a-fA-F]{24}$/).optional().nullable(),
  dueDate: z.string().optional().nullable(),
  completed: z.boolean().optional().default(false),
});

const createPostmortemSchema = z.object({
  incidentId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid Incident ID'),
  title: z.string().min(5, 'Title must be at least 5 characters').max(300),
  summary: z.string().optional().default(''),
  impact: z
    .object({
      durationMinutes: z.number().int().nonnegative().optional().default(0),
      affectedServices: z.array(z.string()).optional().default([]),
    })
    .optional(),
  rootCause: z
    .object({
      category: z.enum(ROOT_CAUSE_CATEGORIES).optional().nullable(),
      description: z.string().optional().default(''),
    })
    .optional(),
  actionItems: z.array(actionItemSchema).optional().default([]),
  lessonsLearned: z.string().optional().default(''),
});

const updatePostmortemSchema = createPostmortemSchema.partial().omit({ incidentId: true });

module.exports = {
  createPostmortemSchema,
  updatePostmortemSchema,
};
