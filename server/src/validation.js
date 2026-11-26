const { z } = require('zod');

const id = z.string().uuid();

const projectCreate = z
  .object({
    name: z.string().trim().min(1).max(120),
    description: z.string().trim().max(2000).nullable().optional(),
    status: z.enum(['active', 'paused', 'completed']).default('active'),
  })
  .strict();

const projectUpdate = projectCreate
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  });

const taskCreate = z
  .object({
    title: z.string().trim().min(1).max(200),
    description: z.string().trim().max(2000).nullable().optional(),
    status: z
      .enum(['todo', 'in-progress', 'done', 'cancelled'])
      .default('todo'),
    priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
    progress: z.number().int().min(0).max(100).default(0),
    dueDate: z.coerce.date().nullable().optional(),
    projectId: id.nullable().optional(),
  })
  .strict();

const taskUpdate = taskCreate
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  });

const profileUpdate = z
  .object({
    bio: z.string().trim().max(500).nullable().optional(),
    focus: z.string().trim().max(200).nullable().optional(),
    name: z.string().trim().min(1).max(100).optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  });

const httpUrl = z
  .string()
  .trim()
  .min(1)
  .max(2048)
  .refine(
    (value) => {
      try {
        const protocol = new URL(value).protocol;
        return protocol === 'http:' || protocol === 'https:';
      } catch {
        return false;
      }
    },
    { message: 'URL must start with http:// or https://' },
  );

const evidenceLabel = z.string().trim().min(1).max(120);

const evidenceCreate = z.discriminatedUnion('kind', [
  z
    .object({
      kind: z.literal('url'),
      label: evidenceLabel,
      url: httpUrl,
    })
    .strict(),
  z
    .object({
      kind: z.literal('note'),
      label: evidenceLabel,
      body: z.string().trim().min(1).max(2000),
    })
    .strict(),
]);

const hasProofQuery = z.enum(['true', 'false']);
const searchQuery = z.string().trim().max(100);
const taskSearchQuery = z.string().trim().min(1).max(100);
const heatmapWeeksQuery = z
  .string()
  .trim()
  .regex(/^\d+$/, 'weeks must be an integer between 4 and 52')
  .transform(Number)
  .refine((n) => Number.isInteger(n) && n >= 4 && n <= 52, {
    message: 'weeks must be between 4 and 52',
  });
const reportDaysQuery = z.enum(['30', '90', '365']).transform(Number);

function parse(schema, value) {
  const result = schema.safeParse(value);
  if (!result.success) {
    const error = new Error('Request validation failed');
    error.statusCode = 400;
    error.code = 'VALIDATION_ERROR';
    error.details = result.error.issues.map(({ path, message, code }) => ({
      path,
      message,
      code,
    }));
    throw error;
  }
  return result.data;
}

module.exports = {
  id,
  projectCreate,
  projectUpdate,
  taskCreate,
  taskUpdate,
  profileUpdate,
  httpUrl,
  evidenceLabel,
  evidenceCreate,
  hasProofQuery,
  searchQuery,
  taskSearchQuery,
  heatmapWeeksQuery,
  reportDaysQuery,
  parse,
};
