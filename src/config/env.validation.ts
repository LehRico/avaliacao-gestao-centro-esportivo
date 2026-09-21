import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().port().default(3000),

  DATABASE_URL: Joi.string().uri({ scheme: ['postgresql', 'postgres'] }).required(),

  JWT_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRES_IN: Joi.string().default('1d'),

  UPLOAD_MAX_FILE_SIZE_MB: Joi.number().positive().default(5),
  UPLOAD_DEST: Joi.string().default('./uploads'),

  EXTERNAL_API_URL: Joi.string().uri().required(),
  EXTERNAL_API_TIMEOUT_MS: Joi.number().positive().default(5000),
});
