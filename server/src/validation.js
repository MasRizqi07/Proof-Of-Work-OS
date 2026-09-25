const { z } = require('zod');

const id = z.string().uuid();
const projectInput = z
  .object({
    name: z.string().trim().min(1).max(120),
    description: z.string().trim().max(2000).nullable().optional(),
  })
  .strict();
const taskInput = z
  .object({
    title: z.string().trim().min(1).max(200),
    description: z.string().trim().max(2000).nullable().optional(),
    status: z.enum(['todo', 'in-progress', 'done']).default('todo'),
    priority: z.enum(['low', 'medium', 'high']).default('medium'),
    progress: z.number().int().min(0).max(100).default(0),
    dueDate: z.coerce.date().nullable().optional(),
    projectId: id.nullable().optional(),
  })
  .strict();
function parse(schema, value) {
  const result = schema.safeParse(value);
  if (!result.success) {
    const error = new Error('Validation failed');
    error.statusCode = 400;
    error.details = result.error.flatten();
    throw error;
  }
  return result.data;
}
module.exports = { id, projectInput, taskInput, parse };
