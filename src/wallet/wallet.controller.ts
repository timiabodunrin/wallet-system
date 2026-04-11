import { Controller, Get, Param, Request, UseGuards } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { User, UserRole } from '../users/entities/user.entity';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { WalletResponseDto } from './dto/wallet-response.dto';
import { BalanceApiResponseDto } from './dto/balance-api-response.dto';

@ApiTags('wallet')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('wallet')
export class WalletController {
  constructor(private walletService: WalletService) {}

  @Get()
  @ResponseMessage('Wallet balance retrieved successfully')
  @ApiOperation({ summary: 'Get current user wallet balance' })
  @ApiResponse({
    status: 200,
    description: 'Current user wallet balance retrieved successfully',
    type: BalanceApiResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Wallet not found' })
  getWallet(@Request() req: { user: User }) {
    return this.walletService.getMyWallet(req.user);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ResponseMessage('Wallet retrieved successfully')
  @ApiOperation({ summary: 'Get wallet by id (admin only)' })
  @ApiParam({ name: 'id', description: 'Wallet identifier', type: String })
  @ApiResponse({
    status: 200,
    description: 'Wallet retrieved successfully',
    type: WalletResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Wallet not found' })
  getWalletById(@Param('id') walletId: string, @Request() req: { user: User }) {
    return this.walletService.getWalletById(walletId, req.user);
  }
}
