import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

export enum TransactionType {
  CREDIT = 'credit',
  DEBIT = 'debit',
}
export enum TransactionStatus {
  PENDING = 'pending',
  SUCCESS = 'success',
  FAILED = 'failed',
}

@Index(['walletId', 'createdAt'])
@Index(['status'])
@Index(['type'])
@Entity('transactions')
export class Transaction extends BaseEntity {
  @Column({ unique: true })
  reference: string;

  @Index()
  @Column()
  walletId: string;

  @Column({ type: 'enum', enum: TransactionType })
  type: TransactionType;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  amount: string;

  @Column({
    type: 'enum',
    enum: TransactionStatus,
    default: TransactionStatus.PENDING,
  })
  status: TransactionStatus;

  @Column({ unique: true })
  idempotencyKey: string;
}
