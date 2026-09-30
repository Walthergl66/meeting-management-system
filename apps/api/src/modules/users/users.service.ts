import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export type UserEntity = {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  timezone: string;
  locale: string;
  passwordHash: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string): Promise<UserEntity | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findById(id: string): Promise<UserEntity | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findActiveById(id: string): Promise<UserEntity> {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('La cuenta está desactivada');
    }

    return user;
  }

  async create(data: {
    email: string;
    name: string;
    passwordHash: string;
    timezone?: string;
  }): Promise<UserEntity> {
    return this.prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        passwordHash: data.passwordHash,
        timezone: data.timezone ?? 'UTC',
      },
    });
  }

  async update(
    id: string,
    data: Partial<
      Pick<
        UserEntity,
        'name' | 'timezone' | 'locale' | 'avatarUrl' | 'passwordHash'
      >
    >,
  ): Promise<UserEntity> {
    return this.prisma.user.update({ where: { id }, data });
  }

  async updatePasswordHash(
    id: string,
    passwordHash: string,
  ): Promise<UserEntity> {
    return this.prisma.user.update({ where: { id }, data: { passwordHash } });
  }
}
