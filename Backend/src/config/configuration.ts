export default () => ({
  app: {
    env: process.env.NODE_ENV,
    port: parseInt(process.env.PORT ?? '3000', 10),
    corsOrigins: (
      process.env.CORS_ORIGINS ??
      'http://localhost:5500,http://127.0.0.1:5500'
    )
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
  },
  database: {
    url: process.env.DATABASE_URL,
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN,
  },
  upload: {
    maxFileSizeMb: parseInt(process.env.UPLOAD_MAX_FILE_SIZE_MB ?? '5', 10),
    dest: process.env.UPLOAD_DEST,
  },
  externalApi: {
    timeoutMs: parseInt(process.env.EXTERNAL_API_TIMEOUT_MS ?? '5000', 10),
    holidaysUrl: process.env.HOLIDAYS_API_URL,
    weatherUrl: process.env.WEATHER_API_URL,
    weatherLatitude: parseFloat(process.env.WEATHER_LATITUDE ?? '-23.5505'),
    weatherLongitude: parseFloat(process.env.WEATHER_LONGITUDE ?? '-46.6333'),
  },
});
