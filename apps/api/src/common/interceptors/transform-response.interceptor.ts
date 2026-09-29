import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Response } from 'express';
import { Observable, map } from 'rxjs';

@Injectable()
export class TransformResponseInterceptor<T> implements NestInterceptor<
  T,
  { data: T; message?: string }
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<{ data: T; message?: string }> {
    const response = context.switchToHttp().getResponse<Response>();
    response.setHeader('X-Request-Id', response.req?.headers?.['x-request-id']);

    return next.handle().pipe(
      map((data) => {
        if (data === null || data === undefined) {
          return { data: null as T };
        }

        if (
          typeof data === 'object' &&
          'data' in (data as object) &&
          'meta' in (data as object)
        ) {
          return data as unknown as { data: T; message?: string };
        }

        if (
          typeof data === 'object' &&
          'data' in (data as object) &&
          'message' in (data as object)
        ) {
          return data as unknown as { data: T; message?: string };
        }

        return { data };
      }),
    );
  }
}
