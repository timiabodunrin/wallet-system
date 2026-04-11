import {
  Controller,
  Post,
  Body,
  Request,
  UseGuards,
  Get,
  Query,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { TransactionService } from './transactions.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { User } from '../users/entities/user.entity';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { TransactionResponseDto } from './dto/transaction-response.dto';

@ApiTags('transactions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionService) {}

  @Throttle({ transaction: { limit: 10, ttl: 60000 } })
  @ResponseMessage('Transaction processed successfully')
  @Post()
  @ApiOperation({ summary: 'Process a transaction' })
  @ApiResponse({
    status: 201,
    description: 'Transaction processed successfully',
    type: TransactionResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request or insufficient funds',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Wallet not found' })
  create(
    @Body() createTransactionDto: CreateTransactionDto,
    @Request() req: { user: User },
  ) {
    return this.transactionsService.processTransaction(
      createTransactionDto,
      req.user,
    );
  }

  @ResponseMessage('Transactions retrieved successfully')
  @ApiOperation({ summary: 'Get paginated transaction history' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @Get()
  getTransactions(
    @Request() req: { user: User },
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.transactionsService.getTransactions(req.user, +page, +limit);
  }
}
