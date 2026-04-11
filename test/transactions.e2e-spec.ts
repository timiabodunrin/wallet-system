import { randomUUID } from 'node:crypto';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { cleanDatabase, createAuthenticatedUser, initApp } from './setup';
import { TransactionType } from '../src/transactions/entities/transaction.entity';

describe('Transactions (e2e)', () => {
  let app: INestApplication;
  let token: string;

  beforeAll(async () => {
    app = await initApp();
  });

  beforeEach(async () => {
    await cleanDatabase(app);

    const auth = await createAuthenticatedUser(app, {
      balance: '150.00',
    });

    token = auth.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it('should handle concurrent debits safely', async () => {
    const results = await Promise.all(
      Array.from({ length: 2 }).map((_, index) =>
        request(app.getHttpServer())
          .post('/transactions')
          .set('Authorization', `Bearer ${token}`)
          .send({
            amount: 100,
            type: TransactionType.DEBIT,
            idempotencyKey: `concurrent-${index}-${randomUUID()}`,
          }),
      ),
    );

    const successCount = results.filter((response) => response.status === 201);
    const failedCount = results.filter((response) => response.status === 400);

    expect(successCount).toHaveLength(1);
    expect(failedCount).toHaveLength(1);

    const walletRes = await request(app.getHttpServer())
      .get('/wallet')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(parseFloat(walletRes.body.data.balance)).toBe(50);

    const transactionsRes = await request(app.getHttpServer())
      .get('/transactions')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(transactionsRes.body.data.meta.total).toBe(1);
    expect(transactionsRes.body.data.data).toHaveLength(1);
    expect(transactionsRes.body.data.data[0].amount).toBe('100.00');
    expect(transactionsRes.body.data.data[0].type).toBe(TransactionType.DEBIT);
  });

  it('should not process a duplicate idempotency key twice', async () => {
    const payload = {
      amount: 50,
      type: TransactionType.DEBIT,
      idempotencyKey: `idempotency-${randomUUID()}`,
    };

    const first = await request(app.getHttpServer())
      .post('/transactions')
      .set('Authorization', `Bearer ${token}`)
      .send(payload)
      .expect(201);

    const second = await request(app.getHttpServer())
      .post('/transactions')
      .set('Authorization', `Bearer ${token}`)
      .send(payload)
      .expect(201);

    expect(first.body.data.reference).toBe(second.body.data.reference);
    expect(first.body.data.id).toBe(second.body.data.id);

    const walletRes = await request(app.getHttpServer())
      .get('/wallet')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(parseFloat(walletRes.body.data.balance)).toBe(100);

    const transactionsRes = await request(app.getHttpServer())
      .get('/transactions')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(transactionsRes.body.data.meta.total).toBe(1);
    expect(transactionsRes.body.data.data).toHaveLength(1);
    expect(transactionsRes.body.data.data[0].idempotencyKey).toBe(
      payload.idempotencyKey,
    );
  });

  it('should prevent negative balance', async () => {
    const res = await request(app.getHttpServer())
      .post('/transactions')
      .set('Authorization', `Bearer ${token}`)
      .send({
        amount: 999999,
        type: TransactionType.DEBIT,
        idempotencyKey: `negative-${randomUUID()}`,
      })
      .expect(400);

    expect(res.body.message).toBe('Insufficient balance!');

    const walletRes = await request(app.getHttpServer())
      .get('/wallet')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(parseFloat(walletRes.body.data.balance)).toBe(150);

    const transactionsRes = await request(app.getHttpServer())
      .get('/transactions')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(transactionsRes.body.data.meta.total).toBe(0);
    expect(transactionsRes.body.data.data).toHaveLength(0);
  });
});
