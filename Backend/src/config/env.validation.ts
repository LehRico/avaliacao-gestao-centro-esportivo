import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().port().default(3000),
  CORS_ORIGINS: Joi.string().default(
    'http://localhost:5500,http://127.0.0.1:5500',
  ),

  DATABASE_URL: Joi.string().uri({ scheme: ['postgresql', 'postgres'] }).required(),

  JWT_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRES_IN: Joi.string().default('1d'),

  UPLOAD_MAX_FILE_SIZE_MB: Joi.number().positive().default(5),
  UPLOAD_DEST: Joi.string().default('./uploads'),

  EXTERNAL_API_TIMEOUT_MS: Joi.number().positive().default(5000),
  HOLIDAYS_API_URL: Joi.string()
    .uri()
    .default('https://brasilapi.com.br/api/feriados/v1'),
  WEATHER_API_URL: Joi.string()
    .uri()
    .default('https://api.open-meteo.com/v1/forecast'),
  WEATHER_LATITUDE: Joi.number().default(-23.5505),
  WEATHER_LONGITUDE: Joi.number().default(-46.6333),
});
