import supertest from 'supertest';
import type { INestApplication } from '@nestjs/common';

/**
 * Wrapper do supertest que já injeta o header X-API-KEY exigido
 * globalmente pela API em toda requisição de teste.
 */
export function req(app: INestApplication) {
  const agent = supertest(app.getHttpServer());
  const withApiKey =
    (method: 'get' | 'post' | 'patch' | 'delete') => (url: string) =>
      agent[method](url).set('X-API-KEY', process.env.API_KEY as string);

  return {
    get: withApiKey('get'),
    post: withApiKey('post'),
    patch: withApiKey('patch'),
    delete: withApiKey('delete'),
  };
}
