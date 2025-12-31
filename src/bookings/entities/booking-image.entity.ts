import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import type { Booking } from './booking.entity';

export enum BookingImageType {
  PICKUP = 1,
  DELIVERY = 0,
}

@Entity('booking_images')
export class BookingImage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: false })
  bookingId: string;

  @Column({ type: 'text' })
  imageUrl: string;

  @Column({ type: 'int', nullable: true, default: 1 })
  type: BookingImageType;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne('Booking', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'bookingId' })
  booking: Booking;
}
