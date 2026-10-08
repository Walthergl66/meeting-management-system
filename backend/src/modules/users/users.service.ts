import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { composeName } from '../../common/utils/user-name';

export type UserEntity = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  alias: string;
  phone: string;
  /** Nombre para mostrar: first_name + last_name. */
  name: string;
  avatarUrl: string | null;
  timezone: string;
  locale: string;
  passwordHash: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type UserRow = Omit<UserEntity, 'name'>;

const toEntity = (row: UserRow): UserEntity => ({
  ...row,
  name: composeName(row),
});

const isUniqueViolation = (error: unknown): boolean =>
  (error as { code?: string }).code === 'P2002';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string): Promise<UserEntity | null> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    return user ? toEntity(user) : null;
  }

  async findById(id: string): Promise<UserEntity | null> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    return user ? toEntity(user) : null;
  }

  async findActiveById(id: string): Promise<UserEntity> {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('La cuenta está desactivada');
    }

    return toEntity(user);
  }

  async create(data: {
    email: string;
    firstName: string;
    lastName: string;
    alias: string;
    phone: string;
    passwordHash: string;
    timezone?: string;
  }): Promise<UserEntity> {
    try {
      const user = await this.prisma.user.create({
        data: {
          email: data.email,
          firstName: data.firstName,
          lastName: data.lastName,
          alias: data.alias,
          phone: data.phone,
          passwordHash: data.passwordHash,
          timezone: data.timezone ?? 'UTC',
        },
      });
      return toEntity(user);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException(
          'El alias, el correo o el celular ya están en uso',
        );
      }
      throw error;
    }
  }

  async update(
    id: string,
    data: Partial<
      Pick<
        UserEntity,
        | 'firstName'
        | 'lastName'
        | 'alias'
        | 'phone'
        | 'timezone'
        | 'locale'
        | 'avatarUrl'
        | 'passwordHash'
      >
    >,
  ): Promise<UserEntity> {
    try {
      const user = await this.prisma.user.update({ where: { id }, data });
      return toEntity(user);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictException(
          'El alias, el correo o el celular ya están en uso',
        );
      }
      throw error;
    }
  }

  async updatePasswordHash(
    id: string,
    passwordHash: string,
  ): Promise<UserEntity> {
    const user = await this.prisma.user.update({
      where: { id },
      data: { passwordHash },
    });
    return toEntity(user);
  }
}
