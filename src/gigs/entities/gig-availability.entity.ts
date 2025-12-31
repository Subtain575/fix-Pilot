import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Gig } from './gig.entity';

export enum DayOfWeek {
  SUNDAY = 'sunday',
  MONDAY = 'monday',
  TUESDAY = 'tuesday',
  WEDNESDAY = 'wednesday',
  THURSDAY = 'thursday',
  FRIDAY = 'friday',
  SATURDAY = 'saturday',
}

@Entity('gig_availability')
export class GigAvailability {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: DayOfWeek })
  day: DayOfWeek;

  @Column({ type: 'boolean', default: false })
  isAvailable: boolean;

  @Column({ type: 'time', nullable: true })
  startTime: string | null;

  @Column({ type: 'time', nullable: true })
  endTime: string | null;

  @Column({ name: 'gig_id' })
  gigId: string;

  @ManyToOne(() => Gig, (gig) => gig.availabilities, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'gig_id' })
  gig: Gig;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
