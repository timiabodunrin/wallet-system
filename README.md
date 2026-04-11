# Secure Wallet & Transaction Processing API

Backend engineer assessment for SohCahToa Holdings.

This project is a controlled wallet system built with NestJS, MySQL, TypeORM, class-validator, JWT authentication, and TypeORM migrations. It is intentionally not a double-entry ledger. The wallet row is the source of truth for current balance, while transactions are the auditable records of credits and debits applied to that wallet.

## Stack

- NestJS
- MySQL 8
- TypeORM
- class-validator
- JWT access and refresh tokens
- TypeORM migrations
- Swagger
- Jest + Supertest integration tests
- Docker and Docker Compose

## Requirements Covered

- User registration and login with hashed passwords
- JWT authentication with refresh token flow
- One wallet per user
- Wallet balance stored as `decimal(18,2)`
- Credit and debit transaction processing
- Idempotent transaction creation
- Database transaction handling with `QueryRunner`
- Row-level locking with `pessimistic_write`
- Negative balance prevention
- Rate limiting for auth and transaction endpoints
- Global exception filter with consistent error format
- Integration tests for concurrency, idempotency, auth guard, and negative balance protection

## Architecture

The project follows a layered NestJS structure:

- `controllers` handle HTTP concerns only
- `services` contain business logic
- `entities` define persistence models
- `dto` classes validate and shape request/response data
- `database/migrations` contains the TypeORM migration history

Business logic is intentionally kept out of controllers. For example, transaction safety, idempotency checks, and wallet balance updates all live in `TransactionService`.

## Domain Model

### User

- `id`: UUID
- `email`: unique
- `password`: bcrypt hash
- `role`: `admin | user`
- `refreshToken`: stored hashed
- `createdAt`
- `updatedAt`

### Wallet

- `id`: UUID
- `userId`: unique, one-to-one with user
- `balance`: `decimal(18,2)`
- `currency`
- `createdAt`
- `updatedAt`

### Transaction

- `id`: UUID
- `reference`: unique
- `walletId`
- `type`: `credit | debit`
- `amount`: `decimal(18,2)`
- `status`: `pending | success | failed`
- `idempotencyKey`: unique
- `createdAt`

## TypeORM Design Choices

This implementation demonstrates the TypeORM features requested in the assessment:

- Unique constraints on `users.email`, `transactions.reference`, and `transactions.idempotencyKey`
- One-wallet-per-user enforced through the unique relation on `wallets.userId`
- Decimal precision via MySQL `decimal(18,2)` for wallet balances and transaction amounts
- Indexes on:
  - `transactions.walletId`
  - `transactions.walletId + createdAt`
  - `transactions.type`
  - `transactions.status`
  - `wallets.userId`
- Migrations stored in `src/database/migrations`
- Explicit transaction management via `QueryRunner`

## Authentication and Authorization

### Auth Endpoints

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`

### Token Strategy

- Access token expiry is controlled by `JWT_EXPIRES_IN` and is currently `15m`
- Refresh token expiry is controlled by `JWT_REFRESH_EXPIRES_IN` and is currently `1d`
- Refresh tokens are stored hashed in the database, not in plain text

### Access Control

- `GET /wallet` returns the authenticated user's wallet balance
- `GET /transactions` returns the authenticated user's transactions only
- `POST /transactions` always operates on the authenticated user's wallet
- `GET /wallet/:id` is admin-only

This prevents a normal user from passing another user's wallet ID to access someone else's data. Ownership is derived from the JWT-authenticated user, not from client-controlled request fields.

## API Endpoints

### Authentication

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`

### Wallet

- `GET /wallet`
- `GET /wallet/:id` admin only

### Transactions

- `POST /transactions`
- `GET /transactions?page=1&limit=10`

### Example Transaction Request

```json
{
  "amount": 100.0,
  "type": "debit",
  "idempotencyKey": "txn-request-001"
}
```

## How Race Conditions Are Prevented

This is one of the core evaluation points in the assessment.

When `POST /transactions` is called:

1. A database transaction is opened with `QueryRunner`.
2. The service checks whether the `idempotencyKey` already exists.
3. The wallet row for the authenticated user is loaded with `pessimistic_write`.
4. While that row is locked, the current balance is read and validated.
5. The balance is updated.
6. The transaction record is inserted.
7. The database transaction is committed.

Because the wallet row is locked during the critical section, two concurrent debit requests cannot both read the same starting balance and both succeed incorrectly.

### Simulated Assessment Scenario

Starting balance: `150.00`

Parallel requests:

- Debit `100.00`
- Debit `100.00`

Expected result:

- One request succeeds
- One request fails with insufficient balance
- Final balance is `50.00`
- Only one debit transaction is recorded

This behavior is covered by the integration test suite.

## Why I Chose Pessimistic Row Locking

I chose pessimistic row locking because wallet debits are high-integrity write operations on a single shared row.

Why this strategy fits the problem:

- It is simple to reason about
- It serializes conflicting balance updates safely
- It maps directly to the assessment's concurrency requirement
- It avoids the risk of lost updates in concurrent read-modify-write flows
- It works well with MySQL row-level locking semantics in InnoDB

I preferred this over optimistic concurrency for the assessment because correctness and predictability matter more here than maximizing write throughput.

## How Idempotency Works

`idempotencyKey` is enforced in two ways:

- Application-level pre-check before processing
- Database-level unique constraint on `transactions.idempotencyKey`

Current flow:

1. A client sends `POST /transactions` with an `idempotencyKey`
2. The service checks whether a transaction with that key already exists
3. If it exists, the original transaction is returned
4. If it does not exist, processing continues normally
5. The saved transaction stores the same key so later retries return the original result

This ensures duplicate retries do not debit the wallet twice in the normal retry path.

### What Happens If a Request Crashes Mid-Transaction

Both the wallet balance update and the transaction insert happen inside the same database transaction.

That means:

- If the process crashes before commit, MySQL rolls back the uncommitted work
- The wallet balance remains unchanged
- No partial transaction record is left behind
- A later retry can safely process the request again

If the crash happens after commit, the existing transaction row is already durable, so a retry with the same idempotency key returns the original transaction instead of applying a second debit.

### Replay Attack Considerations

Replay resistance in the current implementation comes from:

- JWT-protected transaction endpoints
- Unique transaction idempotency keys
- Rate limiting on transaction creation

For production hardening, I would additionally:

- Require high-entropy client-generated UUID idempotency keys
- Scope idempotency keys by wallet or user
- Add an idempotency retention policy
- Log suspicious repeated key reuse attempts

## Injection Prevention

The application protects against injection in the following ways:

- TypeORM repositories and query builder are used with bound parameters
- User lookup uses parameterized query builder conditions such as `where('user.email = :email', { email })`
- No raw unsafe SQL is used in application request flows
- Incoming payloads are validated with `class-validator`
- Global validation runs with:
  - `whitelist: true`
  - `forbidNonWhitelisted: true`
  - `transform: true`

This means unrecognized properties are rejected, and typed DTO validation happens before business logic executes.

## Mass Assignment Protection

The public API does not allow clients to set sensitive server-controlled fields such as:

- `role`
- `balance`
- `walletId`
- `userId`

Examples:

- Registration always creates users with the server-side default role of `user`
- Registration does not allow role assignment from the client
- Wallet balances are updated only inside transaction processing logic
- The wallet used for a transaction is derived from the authenticated user, not the request body

## Rate Limiting

Rate limiting is implemented with `@nestjs/throttler`.

Current limits:

- Auth endpoints: `5` requests per `60` seconds
- Transaction endpoint: `10` requests per `60` seconds
- Global default: `100` requests per `60` seconds

In production I would move throttling storage to Redis so limits are shared across multiple app instances.

## Sensitive Data Protection

Sensitive data handling in the project:

- Passwords are hashed with bcrypt
- Refresh tokens are hashed before storage
- `password` and `refreshToken` are marked `select: false`
- Passwords are never returned from API responses
- Errors are normalized through a global exception filter
- In production mode, unexpected errors do not expose stack traces to clients

## Error Handling

The application uses a global HTTP exception filter and a response-transform interceptor.

### Success Response Shape

```json
{
  "success": true,
  "message": "Transaction processed successfully",
  "data": {},
  "timestamp": "2026-04-11T12:00:00.000Z"
}
```

### Error Response Shape

```json
{
  "success": false,
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Insufficient balance!",
  "timestamp": "2026-04-11T12:00:00.000Z",
  "path": "/transactions",
  "method": "POST"
}
```

## OWASP API Top 10 Considerations

### BOLA / Broken Object Level Authorization

This is handled by not trusting client-supplied ownership values.

- `/wallet` resolves the wallet from `req.user`
- `/transactions` resolves the wallet from `req.user`
- Admin-only wallet lookup is guarded with `RolesGuard`
- Non-admin users cannot browse arbitrary wallet IDs

### Broken Authentication

- JWT access tokens protect private endpoints
- Refresh tokens are hashed in storage
- Login and auth routes are rate limited

### Injection

- DTO validation plus parameterized ORM queries

### Excessive Data Exposure

- Passwords and refresh tokens are never returned
- Role assignment is server-controlled

### Security Misconfiguration

Current code already normalizes errors and avoids leaking sensitive fields.

For production I would also ensure:

- HTTPS only
- strict CORS policy
- secret management via vault or environment injection
- centralized audit logging
- container image scanning

## Testing

Integration tests are stored in `test/` and cover the minimum required Section 6 scenarios:

- auth guard test
- concurrent debit test
- idempotency test
- negative balance prevention test

Files:

- `test/setup.ts`
- `test/auth.e2e-spec.ts`
- `test/transactions.e2e-spec.ts`

### Run Tests

```bash
npm test
```

or

```bash
npm run test:e2e
```

These tests run serially with `--runInBand` to avoid interference between integration cases.

## Local Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create environment file

Copy `.env.example` to `.env`.

Example values:

```env
NODE_ENV=development
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_NAME=wallet_db
DB_USERNAME=wallet_user
DB_PASSWORD=wallet_pass
DB_ROOT_PASSWORD=rootpass
JWT_SECRET=jwtsecret
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=jwtrefreshsecret
JWT_REFRESH_EXPIRES_IN=1d
```

### 3. Start MySQL

If using Docker:

```bash
docker compose up -d mysql
```

### 4. Run migrations

```bash
npm run migration:run
```

### 5. Start the API

```bash
npm run start:dev
```

### 6. Open Swagger

```text
http://localhost:3000/api/docs
```

## Docker

The repository includes Docker support.

To start the full stack:

```bash
docker compose up --build
```

This starts:

- MySQL
- the NestJS app

The container startup command also runs migrations automatically before launching the app.

## Production Changes I Would Make

If I were taking this beyond the assessment, I would make the following production improvements:

- Use Redis-backed distributed throttling
- Add structured logging and tracing
- Add a seed/admin provisioning flow outside public registration
- Scope idempotency keys by wallet or user and make duplicate-key recovery deterministic under concurrent same-key retries
- Add audit/outbox tables for downstream notifications and reporting
- Add metrics, alerts, and dead-letter handling for operational visibility
- Add stronger secret management and key rotation
- Add database backup, restore, and disaster recovery procedures

## How I Would Scale This System

### General Scaling Approach

- Keep MySQL primary for writes
- Add read replicas for transaction history queries
- Use Redis for throttling and short-lived caching
- Add connection pooling and proper timeout tuning
- Introduce a queue for non-critical asynchronous workloads
- Keep wallet balance mutation on the synchronous transactional path, but push secondary work to background workers

In a scaled version of this system, I would use a queue for operations that should not block transaction completion, such as:

- notifications
- webhooks
- audit fan-out
- reconciliation exports
- analytics/reporting pipelines

### Handling 1M Transactions Per Day

At that traffic level I would:

- partition or archive `transactions` by time range
- keep hot indexes lean and monitor index cardinality
- use read replicas for `GET /transactions`
- publish post-transaction events through an outbox pattern into a queue
- process notifications, webhooks, reporting jobs, and reconciliation tasks with background consumers
- monitor lock contention and slow queries
- add observability dashboards around error rate, lock wait time, and transaction throughput

The write path for wallet debits should remain strongly consistent and transaction-bound, while queue-backed background jobs and read-heavy workloads can scale horizontally.

## Notes

- Public registration creates only `user` accounts. Admin users should be provisioned through a controlled back-office or seed process.
- This project is a wallet system, not a ledger system.
- Swagger is available for manual API exploration.
