import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/auth/entity/users.entity';
import { Gig } from '../../gigs/entities/gig.entity';
import { Message } from './message.entity';

@Entity('conversations')
export class Conversation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  sellerId: string;

  @Column()
  buyerId: string;

  @Column({ nullable: true })
  gigId: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'sellerId' })
  seller: User;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'buyerId' })
  buyer: User;

  @ManyToOne(() => Gig, { nullable: true })
  @JoinColumn({ name: 'gigId' })
  gig: Gig;

  @OneToMany(() => Message, (message) => message.conversation)
  messages: Message[];
}
