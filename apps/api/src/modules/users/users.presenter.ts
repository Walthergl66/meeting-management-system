import { UserProfileDto } from '../../modules/auth/dto';

type UserLike = {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  timezone: string;
  locale: string;
  createdAt: Date;
};

export function toUserProfile(user: UserLike): UserProfileDto {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    timezone: user.timezone,
    locale: user.locale,
    createdAt: user.createdAt,
  };
}
