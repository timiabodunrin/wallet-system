import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { cleanDatabase, initApp } from './setup';

describe('Auth Guard (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await initApp();
  });

  beforeEach(async () => {
    await cleanDatabase(app);
  });

  afterAll(async () => {
    await app.close();
  });

  it('should reject GET /wallet without token', async () => {
    await request(app.getHttpServer())
      .get('/wallet')
      .expect(401)
      .expect(({ body }) => {
        expect(body.message).toBe('Unauthorized');
      });
  });

  it('should reject GET /transactions without token', async () => {
    await request(app.getHttpServer())
      .get('/transactions')
      .expect(401)
      .expect(({ body }) => {
        expect(body.message).toBe('Unauthorized');
      });
  });

  it('should reject POST /transactions without token', async () => {
    await request(app.getHttpServer())
      .post('/transactions')
      .send({ amount: 100, type: 'debit', idempotencyKey: 'guard-test' })
      .expect(401)
      .expect(({ body }) => {
        expect(body.message).toBe('Unauthorized');
      });
  });

  it('should allow access with a valid token', async () => {
    const email = `guard-${randomUUID()}@test.com`;

    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password: 'Test@1234' })
      .expect(201);

    const login = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: 'Test@1234' })
      .expect(201);

    const token = login.body.data.accessToken;

    await request(app.getHttpServer())
      .get('/wallet')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.data.balance).toBe('0.00');
      });
  });
});
