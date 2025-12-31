import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { User } from '../../users/auth/entity/users.entity';
import { GigAvailability } from './gig-availability.entity';
import { Category } from '../../categories/entities/category.entity';

import type { Booking } from '../../bookings/entities/booking.entity';

export enum GigStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DELETED = 'deleted',
}

@Entity('gigs')
export class Gig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'seller_id' })
  sellerId: string;

  @Column()
  title: string;

  @Column({ name: 'category_id', nullable: true })
  categoryId: string;

  @Column('text', { array: true, default: [] })
  photos: string[];

  @Column('text')
  shortDescription: string;

  @Column('decimal', { precision: 10, scale: 2 })
  priceFrom: number;

  @Column()
  serviceArea: string;

  @Column('decimal', { precision: 10, scale: 8, nullable: true })
  latitude: number;

  @Column('decimal', { precision: 11, scale: 8, nullable: true })
  longitude: number;

  @Column({
    type: 'enum',
    enum: GigStatus,
    default: GigStatus.ACTIVE,
  })
  status: GigStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => User, (user) => user.gigs, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'seller_id' })
  seller: User;

  @OneToMany(() => GigAvailability, (availability) => availability.gig, {
    cascade: true,
  })
  availabilities: GigAvailability[];

  @ManyToOne(() => Category, (category) => category.gigs, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'category_id' })
  category: Category;

  @OneToMany('Booking', 'gig')
  bookings: Booking[];
}
