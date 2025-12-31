import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import type { Gig } from '../../gigs/entities/gig.entity';
import type { User } from '../../users/auth/entity/users.entity';

@Entity('reviews')
@Index(['gigId', 'buyerId'], { unique: true })
export class Review {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'gig_id' })
  gigId: string;

  @Column({ name: 'buyer_id' })
  buyerId: string;

  @Column('decimal', { precision: 2, scale: 1 })
  rating: number;

  @Column('text', { nullable: true })
  reviews: string;

  @Column('text', { nullable: true })
  image: string;

  @Column('text', { nullable: true })
  video: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne('Gig', 'reviews', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'gig_id' })
  gig: Gig;

  @ManyToOne('User', 'reviews', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'buyer_id' })
  buyer: User;
}
