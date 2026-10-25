const { z } = require('zod');
const { ROLES } = require('../../config/constants');

const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().trim().toLowerCase().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  orgName: z.string().trim().min(2, 'Organization name must be at least 2 characters').max(100),
  orgSlug: z
    .string()
    .trim()
    .toLowerCase()
    .min(2, 'Organization slug must be at least 2 characters')
    .max(50, 'Organization slug cannot exceed 50 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

const demoSwitchSchema = z.object({
  role: z.enum(Object.values(ROLES)),
});

module.exports = {
  registerSchema,
  loginSchema,
  refreshSchema,
  demoSwitchSchema,
};
