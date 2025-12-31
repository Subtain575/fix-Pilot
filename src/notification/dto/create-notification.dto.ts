import { User } from '../../users/auth/entity/users.entity';

export class CreateNotificationDto {
  sender?: User;
  receiver: User;
  title: string;
  message: string;
  link?: string;
}
