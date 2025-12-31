import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Unique,
} from 'typeorm';
import { User } from '../../users/auth/entity/users.entity';
import { Gig } from './gig.entity';

@Entity('gig_favourites')
@Unique(['userId', 'gigId'])
export class GigFavourite {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'gig_id' })
  gigId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Gig, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'gig_id' })
  gig: Gig;
}
