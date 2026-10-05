import { HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';

/**
 * Traduce los errores de Prisma a la respuesta publica. Sin este mapeo todo
 * fallo de base de datos sale como 500: un correo duplicado se ve como fallo
 * del servidor y un cliente cierra la sesión de su usuario.
 *
 * Los mensajes son genericos a proposito. El texto original de Prisma incluye
 * la tabla, la columna y la constraint (por ejemplo "Unique constraint failed
 * on the fields: (`email`)"), que es detalle interno del esquema; los
 * servicios que pueden decir algo util lanzan su propia excepcion de negocio
 * antes de llegar aqui.
 */
export interface PrismaErrorTranslation {
  status: number;
  message: string;
}

const KNOWN_REQUEST_ERRORS: Record<string, PrismaErrorTranslation> = {
  // Violacion de unique: el recurso ya existe.
  P2002: {
    status: HttpStatus.CONFLICT,
    message: 'Ya existe un registro con ese valor único',
  },
  // Violacion de foreign key: la referencia no existe o sigue en uso.
  P2003: {
    status: HttpStatus.BAD_REQUEST,
    message: 'La referencia indicada no existe o sigue en uso',
  },
  // Registro que la operacion esperaba y no estaba.
  P2025: {
    status: HttpStatus.NOT_FOUND,
    message: 'Recurso no encontrado',
  },
  // Valor demasiado largo para la columna.
  P2000: {
    status: HttpStatus.BAD_REQUEST,
    message: 'El valor indicado es demasiado largo',
  },
  // Constraint del esquema que la operacion incumple.
  P2004: {
    status: HttpStatus.BAD_REQUEST,
    message: 'La operación incumple una restricción del modelo',
  },
  // Escritura concurrente: Prisma pide reintentar.
  P2034: {
    status: HttpStatus.CONFLICT,
    message: 'Conflicto de escritura concurrente, reintenta la operación',
  },
};

export function resolvePrismaError(
  exception: unknown,
): PrismaErrorTranslation | null {
  if (exception instanceof Prisma.PrismaClientKnownRequestError) {
    return (
      KNOWN_REQUEST_ERRORS[exception.code] ?? {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Internal server error',
      }
    );
  }

  if (exception instanceof Prisma.PrismaClientValidationError) {
    // Consulta mal formada: en la practica significa entrada invalida que
    // llego hasta Prisma. El detalle vive en el log, no en la respuesta.
    return {
      status: HttpStatus.BAD_REQUEST,
      message: 'La solicitud contiene datos no válidos',
    };
  }

  if (
    exception instanceof Prisma.PrismaClientInitializationError ||
    exception instanceof Prisma.PrismaClientRustPanicError
  ) {
    // La base de datos no responde: es una dependencia caida, no un error de
    // la peticion, asi que se distingue para que el cliente pueda reintentar.
    return {
      status: HttpStatus.SERVICE_UNAVAILABLE,
      message: 'Servicio no disponible temporalmente',
    };
  }

  return null;
}
