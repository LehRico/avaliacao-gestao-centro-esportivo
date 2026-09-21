export default () => ({
  app: {
    env: process.env.NODE_ENV,
    port: parseInt(process.env.PORT ?? '3000', 10),
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
    url: process.env.EXTERNAL_API_URL,
    timeoutMs: parseInt(process.env.EXTERNAL_API_TIMEOUT_MS ?? '5000', 10),
  },
});
