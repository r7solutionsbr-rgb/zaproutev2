import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  // ===== CORE SETTINGS =====
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),

  PORT: Joi.number().port().default(3000),

  // ===== DATABASE (REQUIRED) =====
  DATABASE_URL: Joi.string().uri().required().messages({
    'any.required': 'DATABASE_URL é obrigatória. Configure no arquivo .env',
    'string.uri':
      'DATABASE_URL deve ser uma URL válida (ex: postgresql://user:pass@host:5432/db)',
  }),

  // ===== AUTHENTICATION (REQUIRED) =====
  JWT_SECRET: Joi.string().min(32).required().messages({
    'any.required': 'JWT_SECRET é obrigatório. Configure no arquivo .env',
    'string.min': 'JWT_SECRET deve ter no mínimo 32 caracteres para segurança',
  }),

  // ===== CORS =====
  ALLOWED_ORIGINS: Joi.string()
    .default('*')
    .description('Lista de origens permitidas separadas por vírgula'),

  CORS_ORIGIN: Joi.string()
    .optional()
    .description('Origem CORS (compatibilidade)'),

  // ===== EMAIL (OPTIONAL) =====
  EMAIL_HOST: Joi.string().hostname().optional().messages({
    'string.hostname':
      'EMAIL_HOST deve ser um hostname válido (ex: smtp.gmail.com)',
  }),

  MAIL_HOST: Joi.string().hostname().optional(),

  EMAIL_PORT: Joi.number().port().optional().default(587),

  MAIL_PORT: Joi.number().port().optional(),

  EMAIL_USER: Joi.string().email().empty('').optional().messages({
    'string.email': 'EMAIL_USER deve ser um email válido',
  }),

  MAIL_USER: Joi.string().email().empty('').optional(),

  EMAIL_PASS: Joi.string().optional(),

  MAIL_PASSWORD: Joi.string().optional(),

  EMAIL_FROM: Joi.string().email().empty('').default('noreply@zaproute.com'),

  MAIL_FROM: Joi.string().email().empty('').optional(),

  MAIL_FROM_NAME: Joi.string().optional(),

  MAIL_SECURE: Joi.boolean().optional(),

  // ===== AWS S3 / CLOUDFLARE R2 (OPTIONAL) =====
  R2_ACCOUNT_ID: Joi.string().optional(),

  R2_ACCESS_KEY_ID: Joi.string().optional(),

  R2_SECRET_ACCESS_KEY: Joi.string().optional(),

  R2_BUCKET_NAME: Joi.string().optional(),

  AWS_ACCESS_KEY_ID: Joi.string().optional(),

  AWS_SECRET_ACCESS_KEY: Joi.string().optional(),

  AWS_REGION: Joi.string().optional(),

  AWS_BUCKET_NAME: Joi.string().optional(),

  // ===== Z-API WHATSAPP (OPTIONAL) =====
  ZAPI_INSTANCE_ID: Joi.string().optional(),

  ZAPI_TOKEN: Joi.string().optional(),

  ZAPI_CLIENT_TOKEN: Joi.string().optional(),

  ZAPI_BASE_URL: Joi.string().uri().optional().default('https://api.z-api.io'),

  // ===== AI / GEMINI (OPTIONAL) =====
  GEMINI_API_KEY: Joi.string()
    .optional()
    .description('API Key do Google Gemini para features de IA'),

  API_KEY: Joi.string()
    .optional()
    .description('Alias para GEMINI_API_KEY (compatibilidade)'),

  // ===== ADMIN (OPTIONAL) =====
  ADMIN_KEY: Joi.string()
    .optional()
    .description('Chave de acesso para endpoints administrativos'),

  ADMIN_EMAIL: Joi.string().email().empty('').optional(),

  ADMIN_PASSWORD: Joi.string().optional(),

  ADMIN_NAME: Joi.string().optional(),

  // ===== REDIS CACHE (OPTIONAL) =====
  REDIS_HOST: Joi.string().hostname().optional().default('localhost'),

  REDIS_PORT: Joi.number().port().optional().default(6379),

  REDIS_PASSWORD: Joi.string().optional().allow(''),

  REDIS_TTL: Joi.number().optional().default(300),

  // ===== FEATURE FLAGS (OPTIONAL) =====
  ENABLE_AI_CHAT: Joi.boolean().optional(),

  ENABLE_WHATSAPP: Joi.boolean().optional(),

  ENABLE_EMAIL_NOTIFICATIONS: Joi.boolean().optional(),

  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'info', 'debug', 'verbose')
    .optional()
    .default('info'),

  // ===== METRICS (OPTIONAL) =====
  METRICS_ENABLED: Joi.boolean().optional().default(true),

  METRICS_TOKEN: Joi.string().optional(),

  // ===== MONITORING (OPTIONAL) =====
  SENTRY_DSN: Joi.string().uri().optional(),
});
