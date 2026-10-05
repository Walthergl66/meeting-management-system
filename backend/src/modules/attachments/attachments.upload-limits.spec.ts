import { ATTACHMENT } from '../../shared';
import { ATTACHMENT_UPLOAD_LIMITS } from './attachments.upload-limits';

describe('ATTACHMENT_UPLOAD_LIMITS', () => {
  it('corta la subida en el mismo tamaño que valida el servicio', () => {
    // Si Multer no cortara aquí, el archivo se guardaría entero en memoria
    // antes de que el servicio pudiera rechazarlo.
    expect(ATTACHMENT_UPLOAD_LIMITS.fileSize).toBe(ATTACHMENT.MAX_SIZE_BYTES);
    expect(ATTACHMENT_UPLOAD_LIMITS.fileSize).toBe(10 * 1024 * 1024);
  });

  it('admite un solo archivo por petición', () => {
    expect(ATTACHMENT_UPLOAD_LIMITS.files).toBe(1);
  });

  it('acota también los campos de texto del formulario', () => {
    expect(ATTACHMENT_UPLOAD_LIMITS.fields).toBeGreaterThan(0);
    expect(ATTACHMENT_UPLOAD_LIMITS.fields).toBeLessThanOrEqual(10);
  });
});
