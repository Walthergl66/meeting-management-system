import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  AuthRepository,
  PasswordResetRecord,
  RefreshTokenRecord,
  RefreshTokenSessionRecord,
  RefreshTokenToCreate,
} from '../auth.repository';

@Injectable()
export class PrismaAuthRepository implements AuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  findRefreshToken(tokenHash: string): Promise<RefreshTokenRecord | null> {
    return this.prisma.refreshToken.findUnique({
      where: { token: tokenHash },
      include: { user: true },
    });
  }

  findRefreshTokenSession(
    tokenHash: string,
  ): Promise<RefreshTokenSessionRecord | null> {
    return this.prisma.refreshToken.findUnique({
      where: { token: tokenHash },
      select: { tokenFamily: true, userId: true },
    });
  }

  async revokeRefreshToken(id: string, at: Date): Promise<void> {
    await this.prisma.refreshToken.update({
      where: { id },
      data: { revokedAt: at },
    });
  }

  async revokeRefreshTokenFamily(tokenFamily: string, at: Date): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { tokenFamily, revokedAt: null },
      data: { revokedAt: at },
    });
  }

  async revokeAllRefreshTokens(userId: string, at: Date): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: at },
    });
  }

  async createRefreshToken(data: RefreshTokenToCreate): Promise<void> {
    await this.prisma.refreshToken.create({ data });
  }

  async replacePasswordResetToken(
    userId: string,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<void> {
    await this.prisma.passwordResetToken.deleteMany({ where: { userId } });
    await this.prisma.passwordResetToken.create({
      data: { tokenHash, userId, expiresAt },
    });
  }

  findPasswordResetToken(
    tokenHash: string,
  ): Promise<PasswordResetRecord | null> {
    return this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    });
  }

  async consumePasswordResetToken(id: string, at: Date): Promise<number> {
    const consumed = await this.prisma.passwordResetToken.updateMany({
      where: { id, usedAt: null },
      data: { usedAt: at },
    });
    return consumed.count;
  }
}
