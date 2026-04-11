import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wallet } from './entities/wallet.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { BalanceResponseDto } from './dto/balance-response.dto';

@Injectable()
export class WalletService {
  constructor(
    @InjectRepository(Wallet)
    private readonly walletRepo: Repository<Wallet>,
  ) {}

  async getMyWallet(user: User): Promise<BalanceResponseDto> {
    const wallet = await this.walletRepo.findOne({
      where: { userId: user.id },
    });

    if (!wallet) throw new NotFoundException('Wallet not found');

    return { balance: wallet.balance };
  }

  async getWalletById(walletId: string, user: User): Promise<Wallet> {
    const wallet = await this.walletRepo.findOne({ where: { id: walletId } });
    if (!wallet) throw new NotFoundException('Wallet not found');

    if (user.role !== UserRole.ADMIN && wallet.userId !== user.id) {
      throw new ForbiddenException('Access denied');
    }

    return wallet;
  }
}
