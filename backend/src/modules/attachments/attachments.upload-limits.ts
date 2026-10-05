import { ATTACHMENT } from '../../shared';

/**
 * Límites que impone Multer mientras llega el archivo. Sin esto, Multer
 * bufferiza el cuerpo entero en memoria (memoryStorage) y el servicio solo
 * después decide si el archivo pasaba de 10 MB: cualquier usuario
 * autenticado podía mandar un cuerpo enorme y tumbar el proceso por OOM.
 *
 * El `fileSize` corta el flujo: Multer aborta al superarse el límite y el
 * resto del archivo nunca llega a almacenarse. La comprobación del servicio
 * sigue existiendo como red de seguridad para quien llame a upload() sin
 * pasar por HTTP.
 */
export const ATTACHMENT_UPLOAD_LIMITS = {
  fileSize: ATTACHMENT.MAX_SIZE_BYTES,
  files: 1,
  fields: 8,
} as const;
