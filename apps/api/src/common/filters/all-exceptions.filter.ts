import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiErrorResponse } from '@meetflow/types';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const body = this.buildBody(exception, status, request);

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `${request.method} ${request.url} -> ${status}: ${body.message}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.status(status).json(body);
  }

  private buildBody(
    exception: unknown,
    status: number,
    request: Request,
  ): ApiErrorResponse {
    const base = {
      statusCode: status,
      error: this.resolveErrorName(status),
      timestamp: new Date().toISOString(),
      path: request.url,
      requestId: (request.headers['x-request-id'] as string) ?? undefined,
    };

    if (exception instanceof HttpException) {
      const payload = exception.getResponse();

      if (typeof payload === 'string') {
        return { ...base, message: payload };
      }

      const record = payload as Record<string, any>;

      if (Array.isArray(record.message)) {
        return {
          ...base,
          message: 'Validation failed',
          details: record.message.map((item: any) => ({
            field: item?.property,
            message: Array.isArray(item?.constraints)
              ? Object.values(item.constraints).join(', ')
              : String(item?.constraints ?? item),
          })),
        };
      }

      return { ...base, message: record.message ?? exception.message };
    }

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      return { ...base, message: 'Internal server error' };
    }

    return { ...base, message: (exception as Error)?.message ?? 'Error' };
  }

  private resolveErrorName(status: number): string {
    const name = HttpStatus[status] as string | undefined;
    return name ?? 'Error';
  }
}
