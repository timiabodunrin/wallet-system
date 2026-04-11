import { ApiProperty } from '@nestjs/swagger';
import {
  TransactionStatus,
  TransactionType,
} from '../entities/transaction.entity';

export class TransactionResponseDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Transaction identifier',
  })
  id: string;

  @ApiProperty({
    example: 'TXN-20260410-0001',
    description: 'Transaction reference',
  })
  reference: string;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440001',
    description: 'Wallet identifier',
  })
  walletId: string;

  @ApiProperty({ enum: TransactionType, example: TransactionType.DEBIT })
  type: TransactionType;

  @ApiProperty({
    example: '100.00',
    description: 'Transaction amount',
  })
  amount: string;

  @ApiProperty({
    enum: TransactionStatus,
    example: TransactionStatus.SUCCESS,
  })
  status: TransactionStatus;

  @ApiProperty({
    example: 'txn-unique-idempotency-key-123',
    description: 'Idempotency key',
  })
  idempotencyKey: string;

  @ApiProperty({
    example: '2026-04-10T20:30:00.000Z',
    description: 'Creation timestamp',
    format: 'date-time',
  })
  createdAt: Date;

  @ApiProperty({
    example: '2026-04-10T20:30:00.000Z',
    description: 'Last update timestamp',
    format: 'date-time',
  })
  updatedAt: Date;
}
