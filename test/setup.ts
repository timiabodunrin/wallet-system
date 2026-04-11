import { randomUUID } from 'node:crypto';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { User, UserRole } from '../src/users/entities/user.entity';
import { Wallet } from '../src/wallet/entities/wallet.entity';

export async function initApp(): Promise<INestApplication> {
  process.env.NODE_ENV = 'test';

  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication();

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());

  await app.init();
  await app.get(DataSource).runMigrations();

  return app;
}

export async function cleanDatabase(app: INestApplication): Promise<void> {
  const dataSource = app.get(DataSource);

  await dataSource.query('SET FOREIGN_KEY_CHECKS = 0');
  await dataSource.query('TRUNCATE TABLE transactions');
  await dataSource.query('TRUNCATE TABLE wallets');
  await dataSource.query('TRUNCATE TABLE users');
  await dataSource.query('SET FOREIGN_KEY_CHECKS = 1');
}

export async function createAuthenticatedUser(
  app: INestApplication,
  options?: {
    balance?: string;
    role?: UserRole;
  },
): Promise<{
  accessToken: string;
  user: User;
  wallet: Wallet;
}> {
  const dataSource = app.get(DataSource);
  const jwtService = app.get(JwtService);
  const userRepository = dataSource.getRepository(User);
  const walletRepository = dataSource.getRepository(Wallet);
  const password = await bcrypt.hash('Test@1234', 12);

  const user = await userRepository.save(
    userRepository.create({
      email: `section6-${randomUUID()}@example.com`,
      password,
      role: options?.role ?? UserRole.USER,
    }),
  );

  const wallet = await walletRepository.save(
    walletRepository.create({
      userId: user.id,
      balance: options?.balance ?? '0.00',
      currency: 'NGN',
    }),
  );

  const accessToken = await jwtService.signAsync({
    sub: user.id,
    email: user.email,
    role: user.role,
  });

  return { accessToken, user, wallet };
}
