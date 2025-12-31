import { User } from 'src/users/auth/entity/users.entity';

export class CreateAuditLogDto {
  admin: User;
  actionTo: User;
  title: string;
  description: string;
}
