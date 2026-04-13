import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { DataSource } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Wallet } from '../src/wallet/entities/wallet.entity';
import { User, UserRole } from '../src/users/entities/user.entity';

export async function initApp(): Promise<INestApplication> {
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

  const dataSource = app.get(DataSource);
  await dataSource.runMigrations();

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

  const hashed = await bcrypt.hash('Test@1234', 12);

  const user = await userRepository.save(
    userRepository.create({
      email: `test@example.com`,
      password: hashed,
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

  const accessToken = await jwtService.signAsync(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
    },
    {
      secret: process.env.JWT_SECRET,
      expiresIn: process.env.JWT_EXPIRES_IN as any,
    },
  );

  return { accessToken, user, wallet };
}
