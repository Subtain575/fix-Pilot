import { User } from 'src/users/auth/entity/users.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.notificationReceiver)
  @JoinColumn()
  receiver: User;

  @ManyToOne(() => User, (user) => user.notificationSender)
  @JoinColumn()
  sender: User;

  @Column()
  title: string;

  @Column()
  message: string;

  @Column({ nullable: true })
  link?: string;

  @Column({ default: false })
  isRead: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
