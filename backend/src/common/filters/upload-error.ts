import { HttpStatus } from '@nestjs/common';

interface MulterErrorLike extends Error {
  code?: string;
}

/**
 * Multer lanza sus propios errores al cortar el flujo de subida, y no son
 * HttpException: sin traducción un archivo demasiado grande salía como 500.
 *
 * Se reconoce por su nombre y no instanceof a propósito. Importar 'multer'
 * desde src no es seguro con el árbol de dependencias de pnpm, donde solo es
 * una dependencia transitiva de @nestjs/platform-express, y el nombre de la
 * clase es parte de su API pública.
 */
export function resolveUploadError(
  exception: unknown,
): { status: number; message: string } | null {
  if (!(exception instanceof Error) || exception.name !== 'MulterError') {
    return null;
  }

  const { code } = exception as MulterErrorLike;

  switch (code) {
    case 'LIMIT_FILE_SIZE':
      return {
        status: HttpStatus.PAYLOAD_TOO_LARGE,
        message: 'El archivo excede el tamaño máximo permitido',
      };
    case 'LIMIT_FILE_COUNT':
    case 'LIMIT_UNEXPECTED_FILE':
      return {
        status: HttpStatus.BAD_REQUEST,
        message: 'Solo se admite un archivo por petición',
      };
    case 'LIMIT_FIELD_VALUE':
    case 'LIMIT_FIELD_COUNT':
      return {
        status: HttpStatus.BAD_REQUEST,
        message: 'Los datos del formulario superan los límites permitidos',
      };
    case 'LIMIT_PART_COUNT':
      return {
        status: HttpStatus.BAD_REQUEST,
        message: 'El formulario tiene demasiadas partes',
      };
    default:
      return {
        status: HttpStatus.BAD_REQUEST,
        message: 'No se pudo procesar el archivo enviado',
      };
  }
}
