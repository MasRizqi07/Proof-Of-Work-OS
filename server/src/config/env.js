const { z } = require('zod');

const timezoneSchema = z
  .string()
  .default('Asia/Jakarta')
  .refine(
    (value) => {
      try {
        new Intl.DateTimeFormat('en-US', { timeZone: value });
        return true;
      } catch {
        return false;
      }
    },
    { message: 'Invalid IANA time zone' },
  );

const schema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(4000),
    DATABASE_URL: z.string().url().optional(),
    SUPABASE_URL: z.string().url().optional(),
    CORS_ORIGIN: z.string().default('http://localhost:5173'),
    RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900000),
    RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
    BODY_LIMIT: z.string().default('100kb'),
    TRUST_PROXY: z.coerce.number().int().min(0).default(0),
    APP_TIMEZONE: timezoneSchema,
  })
  .superRefine((value, ctx) => {
    if (value.NODE_ENV === 'production') {
      if (!value.DATABASE_URL || !value.SUPABASE_URL) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'DATABASE_URL and SUPABASE_URL are required in production',
        });
      }
      if (!process.env.CORS_ORIGIN) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'CORS_ORIGIN must be explicitly set in production',
        });
      }
    }
  });

const parsed = schema.safeParse(process.env);
if (!parsed.success)
  throw new Error(`Invalid environment: ${parsed.error.message}`);
const env = parsed.data;
module.exports = { env, schema };
