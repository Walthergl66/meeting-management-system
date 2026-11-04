export interface UserEntity {
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
}

export type UserRecord = Omit<UserEntity, 'name'>;
