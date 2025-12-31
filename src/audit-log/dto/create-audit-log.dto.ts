import { User } from '../../users/auth/entity/users.entity';

export class CreateAuditLogDto {
  admin: User;
  actionTo: User;
  title: string;
  description: string;
}
