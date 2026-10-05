import {
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  registerDecorator,
} from 'class-validator';
import { AUTH } from '../../shared';

/**
 * bcrypt solo procesa los primeros 72 bytes de la contraseña: el resto se
 * descarta en silencio. Dos contraseñas distintas que coincidan en esos 72
 * bytes produce el mismo hash, así que una de las dos entra sin su parte
 * diferencial. Por eso el límite se mide en BYTES y no en caracteres: 72
 * emojis ocupan 288 bytes y se truncarían igual con un @MaxLength(72).
 *
 * Solo se aplica en las escrituras (registro y restablecimiento). En el login
 * no se impone: una cuenta creada antes de este cambio puede tener una
 * contraseña de más de 72 bytes cuyo hash ya está truncado, y rechazarla la
 * dejaría fuera de su sesión. Ese hash no se puede explotar sin conocer los
 * 72 bytes reales, que son precisamente la contraseña válida.
 */
@ValidatorConstraint({ name: 'maxBcryptBytes', async: false })
export class MaxBcryptBytesConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (typeof value !== 'string') {
      return false;
    }

    return Buffer.byteLength(value, 'utf8') <= AUTH.PASSWORD_MAX_LENGTH;
  }

  defaultMessage(args: ValidationArguments): string {
    return (
      `${args.property}: la contraseña no puede superar los ` +
      `${AUTH.PASSWORD_MAX_LENGTH} bytes que bcrypt procesa; a partir de ahí ` +
      'se trunca en silencio y dos contraseñas distintas serían equivalentes'
    );
  }
}

export function MaxBcryptBytes(
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return function decorate(
    object: object,
    propertyName: string | symbol,
  ): void {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName as string,
      options: validationOptions,
      constraints: [],
      validator: MaxBcryptBytesConstraint,
    });
  };
}
