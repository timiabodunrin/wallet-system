import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
}

import { Reflector } from '@nestjs/core';

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  ApiResponse<T>
> {
  constructor(private reflector: Reflector) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiResponse<T>> {
    const message =
      this.reflector.get<string>('response_message', context.getHandler()) ??
      'Successful';

    return next.handle().pipe(
      map((data) => ({
        success: true,
        message,
        data,
        timestamp: new Date().toISOString(),
      })),
    );
  }
}
