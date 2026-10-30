import 'dotenv/config';
import { z } from 'zod';

export const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.coerce.number().default(3000),
    DATABASE_URL: z.string().min(1, 'DATABASE_URL é obrigatória'),
    JWT_SECRET: z.string().min(32, 'JWT_SECRET deve ter no mínimo 32 caracteres'),
    CORS_ORIGINS: z
      .string()
      .default('http://localhost:5173,http://localhost:3000')
      .transform((val) => val.split(',').map((origin) => origin.trim()).filter(Boolean)),
    CPF_ENCRYPTION_KEY: z
      .string()
      .min(32, 'CPF_ENCRYPTION_KEY deve ter no mínimo 32 caracteres')
      .default('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'),
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.coerce.number().optional().default(587),
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),
    SMTP_FROM: z.string().default('MedConnect <nao-responda@medconnect.com.br>'),
    CLOUDINARY_CLOUD_NAME: z.string().optional(),
    CLOUDINARY_API_KEY: z.string().optional(),
    CLOUDINARY_API_SECRET: z.string().optional(),
    SENTRY_DSN: z.string().optional(),
    VET_ENABLED: z
      .union([z.boolean(), z.string()])
      .optional()
      .default(false)
      .transform((val) => (typeof val === 'boolean' ? val : val === 'true' || val === '1')),
    VET_ALLOW_FOOD_PRODUCING: z
      .union([z.boolean(), z.string()])
      .optional()
      .default(false)
      .transform((val) => (typeof val === 'boolean' ? val : val === 'true' || val === '1')),
    VET_CONTROLLED_ENABLED: z
      .union([z.boolean(), z.string()])
      .optional()
      .default(false)
      .transform((val) => (typeof val === 'boolean' ? val : val === 'true' || val === '1')),
  })
  .superRefine((data, ctx) => {
    if (data.NODE_ENV === 'production') {
      if (!data.CLOUDINARY_CLOUD_NAME) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['CLOUDINARY_CLOUD_NAME'],
          message: 'CLOUDINARY_CLOUD_NAME é obrigatória em produção',
        });
      }
      if (!data.CLOUDINARY_API_KEY) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['CLOUDINARY_API_KEY'],
          message: 'CLOUDINARY_API_KEY é obrigatória em produção',
        });
      }
      if (!data.CLOUDINARY_API_SECRET) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['CLOUDINARY_API_SECRET'],
          message: 'CLOUDINARY_API_SECRET é obrigatória em produção',
        });
      }
    }
  });

export type Env = z.infer<typeof envSchema>;

export function parseEnv(
  rawEnv: Record<string, string | undefined> = process.env,
  exitOnError: boolean = process.env.NODE_ENV !== 'test'
): Env {
  const result = envSchema.safeParse(rawEnv);

  if (!result.success) {
    const errorDetails = result.error.issues.map((issue) => {
      const field = issue.path.join('.') || 'geral';
      return `Variável ausente ou inválida: ${field} (${issue.message})`;
    });

    console.error('Falha na validação de variáveis de ambiente:');
    errorDetails.forEach((msg) => console.error(`  - ${msg}`));

    if (exitOnError) {
      process.exit(1);
    }
    throw new Error(`Falha na validação de variáveis de ambiente: ${errorDetails.join('; ')}`);
  }

  return result.data;
}

export const env: Env = parseEnv(process.env);
