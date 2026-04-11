import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';
import { TransactionType } from '../entities/transaction.entity';

export class CreateTransactionDto {
  @ApiProperty({
    example: 100.0,
    minimum: 0.01,
    description: 'Transaction amount with up to 2 decimal places',
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number;

  @ApiProperty({ enum: TransactionType, example: TransactionType.DEBIT })
  @IsEnum(TransactionType)
  type: TransactionType;

  @ApiProperty({ example: 'txn-request-20260410-001' })
  @IsString()
  @IsNotEmpty()
  idempotencyKey: string;
}
