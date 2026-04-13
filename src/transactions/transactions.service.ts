import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  Transaction,
  TransactionStatus,
  TransactionType,
} from './entities/transaction.entity';
import { Wallet } from '../wallet/entities/wallet.entity';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { User } from '../users/entities/user.entity';
import { v4 as uuidv4 } from 'uuid';
import Decimal from 'decimal.js';

@Injectable()
export class TransactionService {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepo: Repository<Transaction>,
    @InjectRepository(Wallet)
    private readonly walletRepo: Repository<Wallet>,
    private readonly dataSource: DataSource,
  ) {}

  async processTransaction(
    dto: CreateTransactionDto,
    user: User,
  ): Promise<Transaction> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const existing = await queryRunner.manager.findOne(Transaction, {
        where: { idempotencyKey: dto.idempotencyKey },
      });

      if (existing) {
        await queryRunner.rollbackTransaction();
        return existing;
      }

      const wallet = await queryRunner.manager.findOne(Wallet, {
        where: { userId: user.id },
        lock: { mode: 'pessimistic_write' },
      });

      if (!wallet) {
        throw new NotFoundException('Wallet not found');
      }

      const currentBalance = new Decimal(wallet.balance);
      const amount = new Decimal(dto.amount);

      if (
        dto.type === TransactionType.DEBIT &&
        currentBalance.lessThan(amount)
      ) {
        throw new BadRequestException('Insufficient balance!');
      }

      wallet.balance =
        dto.type === TransactionType.DEBIT
          ? currentBalance.minus(amount).toFixed(2)
          : currentBalance.plus(amount).toFixed(2);

      await queryRunner.manager.save(wallet);

      const transaction = queryRunner.manager.create(Transaction, {
        reference: `TXN-${uuidv4()}`,
        walletId: wallet.id,
        type: dto.type,
        amount: amount.toFixed(2),
        status: TransactionStatus.SUCCESS,
        idempotencyKey: dto.idempotencyKey,
      });

      await queryRunner.manager.save(transaction);

      await queryRunner.commitTransaction();

      return transaction;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getTransactions(user: User, page: number = 1, limit: number = 10) {
    const wallet = await this.walletRepo.findOne({
      where: { userId: user.id },
    });

    if (!wallet) throw new NotFoundException('Wallet not found');

    const [transactions, total] = await this.transactionRepo.findAndCount({
      where: { walletId: wallet.id },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: transactions.map((tx) => ({
        id: tx.id,
        reference: tx.reference,
        type: tx.type,
        amount: tx.amount,
        status: tx.status,
        idempotencyKey: tx.idempotencyKey,
        createdAt: tx.createdAt,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
