import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';
import { MaxBcryptBytes } from '../../../common/validators/max-bcrypt-bytes.validator';
import { AUTH } from '../../../shared';

export class ChangePasswordDto {
  @ApiProperty({
    description: 'La contraseña actual del usuario autenticado',
    example: 'ClaveActual123!',
  })
  @IsString()
  @MinLength(1, { message: 'La contraseña actual es obligatoria' })
  @MaxBcryptBytes()
  currentPassword: string;

  @ApiProperty({
    example: 'NuevaClave123!',
    minLength: AUTH.PASSWORD_MIN_LENGTH,
    maxLength: AUTH.PASSWORD_MAX_LENGTH,
  })
  @IsString()
  @MinLength(AUTH.PASSWORD_MIN_LENGTH, {
    message: `La contraseña debe tener al menos ${AUTH.PASSWORD_MIN_LENGTH} caracteres`,
  })
  @MaxBcryptBytes()
  newPassword: string;
}
