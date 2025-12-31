import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Conversation } from './conversation.entity';
import { User } from '../../users/auth/entity/users.entity';

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  roomId: string;

  @Column()
  senderId: string;

  @Column('text', { nullable: true })
  message: string | null;

  @Column({ type: 'varchar', nullable: true })
  fileUrl: string | null;

  @Column({ type: 'varchar', nullable: true })
  fileType: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => Conversation, (conversation) => conversation.messages, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'roomId' })
  conversation: Conversation;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'senderId' })
  sender: User;
}
