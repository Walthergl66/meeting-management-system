import { Injectable } from '@nestjs/common';
import {
  CreateUserRecord,
  UpdateUserRecord,
  UserUniqueConstraintError,
  UsersRepository,
} from '../users.repository';
import { PrismaService } from '../../../prisma/prisma.service';
import { UserRecord } from '../users.types';

const isUniqueViolation = (error: unknown): boolean =>
  (error as { code?: string }).code === 'P2002';

@Injectable()
export class PrismaUsersRepository implements UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string): Promise<UserRecord | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findById(id: string): Promise<UserRecord | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  create(data: CreateUserRecord): Promise<UserRecord> {
    return this.handleUniqueViolation(() =>
      this.prisma.user.create({
        data: { ...data, timezone: data.timezone ?? 'UTC' },
      }),
    );
  }

  update(id: string, data: UpdateUserRecord): Promise<UserRecord> {
    return this.handleUniqueViolation(() =>
      this.prisma.user.update({ where: { id }, data }),
    );
  }

  async recordLogin(id: string, at: Date): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: { lastLoginAt: at },
    });
  }

  private async handleUniqueViolation<T>(
    operation: () => Promise<T>,
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new UserUniqueConstraintError();
      }
      throw error;
    }
  }
}
