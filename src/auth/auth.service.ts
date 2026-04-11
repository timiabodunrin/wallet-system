import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { WalletService } from '../wallet/wallet.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { User } from '../users/entities/user.entity';
import { Wallet } from '../wallet/entities/wallet.entity';
import { UserRole } from '../users/entities/user.entity';

@Injectable()
export class AuthService {
  private readonly jwtSecret: string;
  private readonly jwtExpiresIn: string;
  private readonly jwtRefreshSecret: string;
  private readonly jwtRefreshExpiresIn: string;

  constructor(
    private usersService: UsersService,
    private walletService: WalletService,
    private jwtService: JwtService,
    private config: ConfigService,
    private dataSource: DataSource,
  ) {
    this.jwtSecret = this.config.getOrThrow<string>('JWT_SECRET');
    this.jwtExpiresIn = this.config.getOrThrow<string>('JWT_EXPIRES_IN');
    this.jwtRefreshSecret =
      this.config.getOrThrow<string>('JWT_REFRESH_SECRET');
    this.jwtRefreshExpiresIn = this.config.getOrThrow<string>(
      'JWT_REFRESH_EXPIRES_IN',
    );
  }

  async register(dto: RegisterDto): Promise<Partial<User>> {
    const existing = await this.usersService.findByEmail(dto.email);

    if (existing) {
      throw new ConflictException('User with email already registered');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 12);

    let savedUser!: User;

    await this.dataSource.transaction(async (manager) => {
      const user = manager.create(User, {
        email: dto.email,
        password: hashedPassword,
        role: UserRole.USER,
      });

      savedUser = await manager.save(user);

      const wallet = manager.create(Wallet, {
        userId: savedUser.id,
        balance: '0.00',
        currency: 'NGN',
      });

      await manager.save(wallet);
    });

    return {
      id: savedUser.id,
      email: savedUser.email,
      role: savedUser.role,
      createdAt: savedUser.createdAt,
      updatedAt: savedUser.updatedAt,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) throw new BadRequestException('Invalid credentials');

    const passwordMatch = await bcrypt.compare(dto.password, user.password);

    if (!passwordMatch) {
      throw new BadRequestException('Invalid credentials');
    }

    const tokens = await this.generateTokens(user);

    await this.usersService.updateRefreshToken(user.id, tokens.refreshToken);

    return tokens;
  }

  async refreshTokens(refreshToken: string) {
    let payload: { sub: string; email: string; role: UserRole };
    try {
      payload = this.jwtService.verify(refreshToken, {
        secret: this.jwtRefreshSecret,
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.usersService.findByIdWithRefreshToken(payload.sub);
    if (!user || !user.refreshToken) {
      throw new UnauthorizedException('Access denied');
    }

    const tokenMatch = await bcrypt.compare(refreshToken, user.refreshToken);
    if (!tokenMatch) throw new UnauthorizedException('Access denied');

    const tokens = await this.generateTokens(user);
    await this.usersService.updateRefreshToken(user.id, tokens.refreshToken);

    return tokens;
  }

  private async generateTokens(user: User): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.jwtSecret,
      expiresIn: this.jwtExpiresIn as `${number}${'s' | 'm' | 'h' | 'd'}`,
    });

    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: this.jwtRefreshSecret,
      expiresIn: this
        .jwtRefreshExpiresIn as `${number}${'s' | 'm' | 'h' | 'd'}`,
    });

    return { accessToken, refreshToken };
  }
}
