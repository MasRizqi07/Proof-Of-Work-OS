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
  parse,
  // Backwards-compatible aliases for consumers of the initial foundation.
  projectInput: projectCreate,
  taskInput: taskCreate,
};
