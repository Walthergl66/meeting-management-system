import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { RegisterDto } from '../../modules/auth/dto/register.dto';
import { ResetPasswordDto } from '../../modules/auth/dto/password.dto';

const register = (password: string) =>
  plainToInstance(RegisterDto, {
    email: 'ana@correo.com',
    firstName: 'Ana',
    lastName: 'García',
    alias: 'ana_garcia',
    phone: '+521234567890',
    password,
  });

const errorsOf = async (dto: object, property: string) => {
  const errors = await validate(dto as object);
  return errors.filter(
    (error) =>
      error.property === property &&
      error.constraints?.['maxBcryptBytes'] !== undefined,
  );
};

describe('límite de contraseña por bytes de bcrypt', () => {
  it('acepta una contraseña exactamente en el límite', async () => {
    const password = 'a'.repeat(72);

    expect(await errorsOf(register(password), 'password')).toHaveLength(0);
  });

  it('rechaza una contraseña de un asciibyte más', async () => {
    const password = 'a'.repeat(73);

    expect(await errorsOf(register(password), 'password')).toHaveLength(1);
  });

  it('rechaza una contraseña corta en caracteres pero larga en bytes', async () => {
    // 30 emojis = 120 bytes: un límite de 72 caracteres la habría dejado pasar.
    const password = '🔑'.repeat(30);

    expect(Buffer.byteLength(password, 'utf8')).toBe(120);
    expect(await errorsOf(register(password), 'password')).toHaveLength(1);
  });

  it('no acepta valores que no son cadenas', async () => {
    expect(await errorsOf(register(1234 as never), 'password')).toHaveLength(1);
  });

  it('aplica el mismo límite al restablecimiento de contraseña', async () => {
    const dto = plainToInstance(ResetPasswordDto, {
      token: 'token-opaco',
      password: 'a'.repeat(73),
    });

    expect(await errorsOf(dto, 'password')).toHaveLength(1);
  });

  it('explica en el mensaje que bcrypt trunca la contraseña', async () => {
    const errors = await validate(register('a'.repeat(73)) as object);
    const message = errors
      .flatMap((error) => Object.values(error.constraints ?? {}))
      .find((text) => text.includes('bcrypt'));

    expect(message).toContain('72');
    expect(message).toContain('trunca');
  });
});
