import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const isHttpException = exception instanceof HttpException;
    const status = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;
    const exceptionResponse = isHttpException ? exception.getResponse() : null;

    response.status(status).json({
      success: false,
      statusCode: status,
      error: this.getErrorName(status, exceptionResponse),
      message: this.getMessage(exception, exceptionResponse),
      timestamp: new Date().toISOString(),
      path: request.originalUrl ?? request.url,
      method: request.method,
    });
  }

  private getErrorName(
    status: number,
    exceptionResponse: string | object | null,
  ): string {
    if (
      exceptionResponse &&
      typeof exceptionResponse === 'object' &&
      'error' in exceptionResponse &&
      typeof exceptionResponse.error === 'string'
    ) {
      return exceptionResponse.error;
    }

    return HttpStatus[status] ?? 'Error';
  }

  private getMessage(
    exception: unknown,
    exceptionResponse: string | object | null,
  ): string | string[] {
    if (typeof exceptionResponse === 'string') {
      return exceptionResponse;
    }

    if (
      exceptionResponse &&
      typeof exceptionResponse === 'object' &&
      'message' in exceptionResponse
    ) {
      const { message } = exceptionResponse;

      if (
        typeof message === 'string' ||
        (Array.isArray(message) &&
          message.every((item) => typeof item === 'string'))
      ) {
        return message;
      }
    }

    if (process.env.NODE_ENV !== 'production' && exception instanceof Error) {
      return exception.message;
    }

    return 'An unexpected error occurred';
  }
}
