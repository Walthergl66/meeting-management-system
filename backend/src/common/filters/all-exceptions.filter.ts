import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiErrorDetail, ApiErrorResponse } from '../../shared';
import { resolvePrismaError } from './prisma-error';
import { resolveUploadError } from './upload-error';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Los errores de Prisma y los de Multer no son HttpException, pero
    // describen una peticion invalida o un conflicto de negocio: si no se
    // traducen salen como 500.
    const translated = this.resolveTranslation(exception);

    const status = translated
      ? translated.status
      : exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const body = translated
      ? this.buildPrismaBody(translated, status, request)
      : this.buildBody(exception, status, request);

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `${request.method} ${request.url} -> ${status}: ${body.message}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.status(status).json(body);
  }

  private resolveTranslation(
    exception: unknown,
  ): { status: number; message: string } | null {
    if (exception instanceof HttpException) return null;

    return resolvePrismaError(exception) ?? resolveUploadError(exception);
  }

  private buildBase(
    status: number,
    request: Request,
  ): Omit<ApiErrorResponse, 'message'> {
    return {
      statusCode: status,
      error: this.resolveErrorName(status),
      timestamp: new Date().toISOString(),
      path: request.url,
      requestId: (request.headers['x-request-id'] as string) ?? undefined,
    };
  }

  private buildPrismaBody(
    translation: { message: string },
    status: number,
    request: Request,
  ): ApiErrorResponse {
    return { ...this.buildBase(status, request), message: translation.message };
  }

  private buildBody(
    exception: unknown,
    status: number,
    request: Request,
  ): ApiErrorResponse {
    const base = this.buildBase(status, request);

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
          details: record.message.map((item: any) =>
            this.describeValidationIssue(item),
          ),
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

  /**
   * El ValidationPipe de Nest aplana los ValidationError en un string[] porque
   * flattenValidationErrors viene activado por defecto, así que lo normal es
   * recibir textos ya legibles ("timezone must be shorter than..."). El
   * contrato de error siempre dice details: { field, message }[], y de un texto
   * plano el campo es lo que va antes del primer espacio: es como
   * class-validator compone el mensaje. Si algún día se desactiva el
   * aplanado, el objeto con property y constraints se usa tal cual.
   */
  private describeValidationIssue(item: unknown): ApiErrorDetail {
    if (typeof item === 'string') {
      const separador = item.indexOf(' ');

      return separador > 0
        ? { field: item.slice(0, separador), message: item }
        : { field: undefined, message: item };
    }

    const issue = item as { property?: string; constraints?: unknown };

    return {
      field: issue?.property,
      message: this.describeConstraints(issue?.constraints),
    };
  }

  /**
   * class-validator entrega constraints como un objeto de textos por regla
   * ("minLength" -> "debe tener al menos 1 caracter"), no como un array, así
   * que se leen sus valores. Cuando no hay constraints se devuelve cadena
   * vacía: imprimir el objeto entero produciría "[object Object]" en el JSON.
   */
  private describeConstraints(constraints: unknown): string {
    if (
      constraints !== null &&
      typeof constraints === 'object' &&
      !Array.isArray(constraints)
    ) {
      return Object.values(constraints as Record<string, unknown>).join(', ');
    }

    return typeof constraints === 'string' ? constraints : '';
  }
}
