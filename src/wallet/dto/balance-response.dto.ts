import { ApiProperty } from '@nestjs/swagger';

export class BalanceResponseDto {
  @ApiProperty({
    example: '150.00',
    description: 'Current wallet balance',
  })
  balance: string;
}
