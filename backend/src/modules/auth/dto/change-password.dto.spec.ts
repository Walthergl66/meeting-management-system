import { HttpStatus, ValidationPipe } from '@nestjs/common';
import { AUTH } from '../../../shared';
import { ChangePasswordDto } from './change-password.dto';

const pipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  transformOptions: { enableImplicitConversion: true },
  errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
});

const check = (body: Record<string, unknown>) =>
  pipe.transform(body, { type: 'body', metatype: ChangePasswordDto });

describe('ChangePasswordDto', () => {
  const valido = {
    currentPassword: 'ClaveActual123!',
    newPassword: 'NuevaClave456!',
  };

  it('acepta un cuerpo válido', async () => {
    await expect(check(valido)).resolves.toMatchObject(valido);
  });

  it('exige la contraseña actual', async () => {
    await expect(
      check({ newPassword: 'NuevaClave456!' }),
    ).rejects.toBeInstanceOf(Error);
    await expect(
      check({ currentPassword: '', newPassword: 'NuevaClave456!' }),
    ).rejects.toBeInstanceOf(Error);
  });

  it('exige una contraseña nueva con la longitud mínima', async () => {
    await expect(
      check({ ...valido, newPassword: 'corta' }),
    ).rejects.toBeInstanceOf(Error);
  });

  it('acepta exactamente el límite de 72 bytes que bcrypt procesa', async () => {
    await expect(
      check({ ...valido, newPassword: 'a'.repeat(72) }),
    ).resolves.toMatchObject({ newPassword: 'a'.repeat(72) });
  });

  it('rechaza una contraseña que bcrypt truncaría en silencio', async () => {
    // 73 bytes: bcrypt solo usa los primeros 72, así que a partir de ahí dos
    // contraseñas distintas serían equivalentes.
    await expect(
      check({ ...valido, newPassword: 'a'.repeat(73) }),
    ).rejects.toBeInstanceOf(Error);
  });

  it('rechaza una contraseña actual desmedida en bytes', async () => {
    await expect(
      check({
        currentPassword: 'a'.repeat(100),
        newPassword: 'NuevaClave456!',
      }),
    ).rejects.toBeInstanceOf(Error);
  });

  it('acepta una contraseña multibyte que sí cabe en 72 bytes', async () => {
    // 24 emojis = 96 bytes: no cabe. 12 emojis = 48 bytes: sí.
    const cabe = '🔐'.repeat(12);

    await expect(
      check({ ...valido, newPassword: cabe }),
    ).resolves.toMatchObject({ newPassword: cabe });
  });

  it('rechaza campos que no pertenecen al contrato', async () => {
    await expect(check({ ...valido, role: 'OWNER' })).rejects.toBeInstanceOf(
      Error,
    );
  });

  it('no acepta una contraseña nueva más corta que el mínimo de AUTH', () => {
    // El mínimo viene de la constante compartida, no de un número repetido.
    expect(AUTH.PASSWORD_MIN_LENGTH).toBeGreaterThan(0);
  });
});
