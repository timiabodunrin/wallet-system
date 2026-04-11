import { ApiProperty } from '@nestjs/swagger';
import { BalanceResponseDto } from './balance-response.dto';

export class BalanceApiResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Wallet balance retrieved successfully' })
  message: string;

  @ApiProperty({ type: BalanceResponseDto })
  data: BalanceResponseDto;

  @ApiProperty({ example: '2026-04-11T09:03:55.287Z' })
  timestamp: string;
}
