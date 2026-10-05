import {
  ArgumentsHost,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpStatus,
  NotFoundException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AllExceptionsFilter } from './all-exceptions.filter';

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;
  let status: jest.Mock;
  let json: jest.Mock;

  const hostFor = (
    method = 'GET',
    url = '/api/v1/meetings',
    requestId?: string,
  ): ArgumentsHost => {
    const request = {
      method,
      url,
      headers: requestId === undefined ? {} : { 'x-request-id': requestId },
    };

    return {
      switchToHttp: () => ({
        getResponse: () => ({ status, json }),
        getRequest: () => request,
      }),
    } as unknown as ArgumentsHost;
  };

  beforeEach(() => {
    filter = new AllExceptionsFilter();
    status = jest.fn().mockReturnThis();
    json = jest.fn();
  });

  describe('código y cuerpo del error', () => {
    it('responde con el código de la excepción conocida', () => {
      filter.catch(new NotFoundException('Reunión no encontrada'), hostFor());

      expect(status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 404,
          error: 'NOT_FOUND',
          message: 'Reunión no encontrada',
          path: '/api/v1/meetings',
        }),
      );
    });

    it('traduce cada código HTTP a su nombre', () => {
      filter.catch(new UnauthorizedException(), hostFor());
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 401, error: 'UNAUTHORIZED' }),
      );

      filter.catch(new ForbiddenException(), hostFor());
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 403, error: 'FORBIDDEN' }),
      );

      filter.catch(new BadRequestException(), hostFor());
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 400, error: 'BAD_REQUEST' }),
      );
    });

    it('usa el mensaje que trae la excepción cuando es un objeto', () => {
      filter.catch(
        new NotFoundException({ message: 'Equipo no encontrado' }),
        hostFor(),
      );

      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Equipo no encontrado' }),
      );
    });

    it('devuelve 500 y oculta el detalle cuando la excepción no es de HTTP', () => {
      filter.catch(new Error('conexión rechazada en postgres'), hostFor());

      expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 500,
          error: 'INTERNAL_SERVER_ERROR',
          message: 'Internal server error',
        }),
      );
      // El texto original solo puede verse en el log, nunca en la respuesta.
      expect(JSON.stringify(json.mock.calls[0][0])).not.toContain('postgres');
    });

    it('incluye marca de tiempo y requestId cuando viene', () => {
      filter.catch(
        new NotFoundException('No está'),
        hostFor('GET', '/x', 'r-9'),
      );

      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({
          timestamp: expect.any(String),
          requestId: 'r-9',
        }),
      );
    });

    it('omite requestId cuando la petición no trae el identificador', () => {
      filter.catch(new NotFoundException('No está'), hostFor());

      const body = json.mock.calls[0][0];
      expect(body.requestId).toBeUndefined();
    });
  });

  describe('errores de Prisma', () => {
    const known = (code: string, message = 'detalle interno') =>
      new Prisma.PrismaClientKnownRequestError(message, {
        code,
        clientVersion: '6.0.0',
      });

    it('devuelve 409 cuando se viola una restricción única', () => {
      filter.catch(known('P2002'), hostFor());

      expect(status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 409,
          error: 'CONFLICT',
          message: 'Ya existe un registro con ese valor único',
        }),
      );
    });

    it('devuelve 404 cuando Prisma no encuentra el registro', () => {
      filter.catch(known('P2025'), hostFor());

      expect(status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 404,
          error: 'NOT_FOUND',
          message: 'Recurso no encontrado',
        }),
      );
    });

    it('devuelve 400 cuando la referencia indicada no existe', () => {
      filter.catch(known('P2003'), hostFor());

      expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          message: 'La referencia indicada no existe o sigue en uso',
        }),
      );
    });

    it('devuelve 400 cuando el valor excede el límite de la columna', () => {
      filter.catch(known('P2000'), hostFor());

      expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    });

    it('devuelve 409 ante un conflicto de escritura concurrente', () => {
      filter.catch(known('P2034'), hostFor());

      expect(status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Conflicto de escritura concurrente, reintenta la operación',
        }),
      );
    });

    it('devuelve 400 si la consulta llega mal formada a Prisma', () => {
      filter.catch(
        new Prisma.PrismaClientValidationError('Invalid value for argument', {
          clientVersion: '6.0.0',
        }),
        hostFor(),
      );

      expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'La solicitud contiene datos no válidos',
        }),
      );
    });

    it('devuelve 503 si la base de datos no está disponible', () => {
      filter.catch(
        new Prisma.PrismaClientInitializationError(
          'Cannot reach database server',
          '6.0.0',
        ),
        hostFor(),
      );

      expect(status).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 503,
          message: 'Servicio no disponible temporalmente',
        }),
      );
    });

    it('mantiene 500 para un código de Prisma sin traducción', () => {
      filter.catch(known('P9999'), hostFor());

      expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Internal server error' }),
      );
    });

    it('nunca filtra el nombre de la tabla ni de la constraint', () => {
      filter.catch(
        known('P2002', 'Unique constraint failed on the fields: (`password`)'),
        hostFor(),
      );

      const serializado = JSON.stringify(json.mock.calls[0][0]);
      expect(serializado).not.toContain('password');
      expect(serializado).not.toContain('constraint');
    });

    it('no toca una HttpException aunque su mensaje parezca de Prisma', () => {
      filter.catch(
        new ConflictException('Ya existe una reunión ese día'),
        hostFor(),
      );

      expect(status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Ya existe una reunión ese día' }),
      );
    });
  });

  describe('errores de validación', () => {
    it('separa el campo del texto que Nest aplana', () => {
      // El ValidationPipe aplana los ValidationError en string[] porque
      // flattenValidationErrors viene activado: eso es lo que llega de verdad.
      filter.catch(
        new UnprocessableEntityException({
          message: [
            'timezone must be shorter than or equal to 64 characters',
            'locale must be one of the following values: es, en',
          ],
        }),
        hostFor(),
      );

      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 422,
          message: 'Validation failed',
          details: [
            {
              field: 'timezone',
              message:
                'timezone must be shorter than or equal to 64 characters',
            },
            {
              field: 'locale',
              message: 'locale must be one of the following values: es, en',
            },
          ],
        }),
      );
    });

    it('desglosa el campo cuando llegan errores sin aplanar', () => {
      filter.catch(
        new UnprocessableEntityException({
          message: [
            {
              property: 'name',
              constraints: { minLength: 'name debe tener al menos 1 caracter' },
            },
            {
              property: 'locale',
              constraints: { isIn: 'locale debe ser es o en' },
            },
          ],
        }),
        hostFor(),
      );

      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({
          details: [
            { field: 'name', message: 'name debe tener al menos 1 caracter' },
            { field: 'locale', message: 'locale debe ser es o en' },
          ],
        }),
      );
    });

    it('usa el texto tal cual cuando constraints es una cadena', () => {
      filter.catch(
        new UnprocessableEntityException({
          message: [{ property: 'x', constraints: 'debe existir' }],
        }),
        hostFor(),
      );

      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({
          details: [{ field: 'x', message: 'debe existir' }],
        }),
      );
    });

    it('deja el mensaje vacío si el error no trae constraints', () => {
      filter.catch(
        new UnprocessableEntityException({ message: [{ property: 'x' }] }),
        hostFor(),
      );

      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({
          details: [{ field: 'x', message: '' }],
        }),
      );
    });

    it('trata un array vacío como validación sin fallos que detallar', () => {
      filter.catch(
        new UnprocessableEntityException({ message: [], error: 'Falló' }),
        hostFor(),
      );

      const body = json.mock.calls[0][0];
      expect(body.message).toBe('Validation failed');
      expect(body.details).toEqual([]);
    });

    it('nunca deja un [object Object] en la respuesta', () => {
      filter.catch(
        new UnprocessableEntityException({
          message: [{ property: 'x' }, { property: 'y', constraints: {} }],
        }),
        hostFor(),
      );

      const serializado = JSON.stringify(json.mock.calls[0][0]);
      expect(serializado).not.toContain('[object Object]');
    });
  });
});
