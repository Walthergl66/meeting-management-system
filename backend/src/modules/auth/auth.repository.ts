import type { UserRecord } from '../users/users.types';

export interface RefreshTokenRecord {
  id: string;
  token: string;
  tokenFamily: string;
  userId: string;
  revokedAt: Date | null;
  expiresAt: Date;
  user: UserRecord;
}

export interface RefreshTokenSessionRecord {
  tokenFamily: string;
  userId: string;
}

export interface PasswordResetRecord {
  id: string;
  userId: string;
  usedAt: Date | null;
  expiresAt: Date;
}

export interface RefreshTokenToCreate {
  token: string;
  tokenFamily: string;
  userId: string;
  expiresAt: Date;
}

export interface AuthRepository {
  findRefreshToken(tokenHash: string): Promise<RefreshTokenRecord | null>;
  findRefreshTokenSession(
    tokenHash: string,
  ): Promise<RefreshTokenSessionRecord | null>;
  revokeRefreshToken(id: string, at: Date): Promise<void>;
  revokeRefreshTokenFamily(tokenFamily: string, at: Date): Promise<void>;
  revokeAllRefreshTokens(userId: string, at: Date): Promise<void>;
  createRefreshToken(data: RefreshTokenToCreate): Promise<void>;
  replacePasswordResetToken(
    userId: string,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<void>;
  findPasswordResetToken(
    tokenHash: string,
  ): Promise<PasswordResetRecord | null>;
  consumePasswordResetToken(id: string, at: Date): Promise<number>;
}
