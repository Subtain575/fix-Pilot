import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { UserRole } from '../enums/enum';
import { Gig } from '../../../gigs/entities/gig.entity';
import { IsOptional } from 'class-validator';
import { UserStatus } from '../enums/status-enum';
import { Booking } from '../../../bookings/entities/booking.entity';
import { SellerFile } from './seller-file.entity';
import { Seller } from 'src/seller/entities/seller.entity';
import { Notification } from 'src/notification/entities/notification.entity';
import { messageSafety } from 'src/message-safety/entities/message-safety.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column({ unique: true, nullable: true })
  phone: string;

  @Column({ select: true })
  password: string;

  @Column({ nullable: true, default: 'sim' })
  verificationType: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.BUYER,
  })
  role: UserRole;

  @Column({ default: 0 })
  isActive: boolean;

  @Column({ nullable: true })
  profileImage: string;

  @Column({ type: 'int', nullable: true })
  otp: number | null;

  @IsOptional()
  @Column({ nullable: true })
  city: string;

  @IsOptional()
  @Column({ nullable: true })
  country: string;

  @IsOptional()
  @Column({ nullable: true })
  postalCode: string;

  @IsOptional()
  @Column({ nullable: true })
  state: string;

  @IsOptional()
  @Column({ nullable: true })
  address: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.INACTIVE,
  })
  status: UserStatus;

  @Column({ type: 'text', nullable: true })
  refreshToken?: string | null;

  @OneToMany(() => Gig, (gig) => gig.seller)
  gigs: Gig[];

  @OneToMany('Booking', 'user')
  bookings: Booking[];

  @OneToMany(() => SellerFile, (sellerFile) => sellerFile.user)
  sellerFiles: SellerFile[];

  @OneToOne(() => Seller, (seller) => seller.user, { cascade: true })
  seller: Seller;

  @OneToOne(() => Notification, (notification) => notification.receiver, {
    cascade: true,
  })
  notificationReceiver: Notification;

  @OneToOne(() => Notification, (notification) => notification.sender, {
    cascade: true,
  })
  notificationSender: Notification;

  @OneToMany(() => messageSafety, (message) => message.user)
  messages: messageSafety[];
}
