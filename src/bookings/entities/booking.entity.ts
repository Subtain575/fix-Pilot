import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

import type { Gig } from '../../gigs/entities/gig.entity';
import type { User } from '../../users/auth/entity/users.entity';
import type { BookingImage } from './booking-image.entity';
import { OneToMany } from 'typeorm';

export enum BookingStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  REJECT = 'REJECT',
  COMPLETED = 'COMPLETED',
}

export enum UrgencyLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

@Entity('bookings')
export class Booking {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  gigId: string;

  @Column({ nullable: true })
  userId: string;

  @Column({ type: 'date', nullable: true })
  bookingDate: Date;

  @Column({ nullable: false })
  startTime: string;

  @Column({ nullable: true })
  endTime: string;

  @Column({ nullable: true })
  serviceAddress: string;

  @Column({ nullable: true })
  city: string;

  @Column({ nullable: true })
  country: string;

  @Column({ nullable: true })
  addressName: string;

  @Column({ nullable: true })
  postalCode: string;

  @Column({ nullable: true })
  fullName: string;

  @Column({ nullable: true })
  phoneNumber: string;

  @Column({ nullable: true })
  emailAddress: string;

  @Column('text', { nullable: true })
  describeProblem: string;

  @Column({
    type: 'enum',
    enum: UrgencyLevel,
    default: UrgencyLevel.MEDIUM,
  })
  urgencyLevel: UrgencyLevel;

  @Column('simple-array', { nullable: true })
  uploadPhotos: string[];

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  estimatedBudget: number;

  @Column('decimal', { precision: 10, scale: 8, nullable: true })
  latitude?: number;

  @Column('decimal', { precision: 11, scale: 8, nullable: true })
  longitude?: number;

  @Column('decimal', { precision: 10, scale: 8, nullable: true })
  arrivalLatitude?: number;

  @Column('decimal', { precision: 11, scale: 8, nullable: true })
  arrivalLongitude?: number;

  @Column({ type: 'boolean', default: false })
  arrival15Notified: boolean;

  @Column({ type: 'boolean', default: false })
  arrival30Notified: boolean;

  @Column({ type: 'boolean', default: false })
  arrival1Notified: boolean;

  @Column({ type: 'boolean', default: false })
  arrival2Notified: boolean;

  @Column({ type: 'boolean', nullable: true })
  completeJob?: boolean;

  @Column({ type: 'boolean', nullable: true })
  paymentChecked?: boolean;

  @Column({ type: 'varchar', length: 10, nullable: true })
  otpCode?: string;

  @Column({ type: 'integer', nullable: true })
  arrivalRating?: number;

  @Column('text', { nullable: true })
  workerNotes?: string;

  @Column({
    type: 'enum',
    enum: BookingStatus,
    default: BookingStatus.PENDING,
  })
  status: BookingStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne('Gig', 'bookings', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'gigId' })
  gig: Gig;

  @ManyToOne('User', 'bookings', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @OneToMany('BookingImage', 'booking')
  images?: BookingImage[];
}
