import { ApiProperty } from '@nestjs/swagger';

export class WalletResponseDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Wallet identifier',
  })
  id: string;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440001',
    description: 'Owner user identifier',
  })
  userId: string;

  @ApiProperty({
    example: '150.00',
    description: 'Current wallet balance',
  })
  balance: string;

  @ApiProperty({
    example: 'NGN',
    description: 'Wallet currency',
  })
  currency: string;

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
