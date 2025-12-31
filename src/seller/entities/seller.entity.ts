import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { SellerVerificationStatus } from '../Enum/seller-verification-enum';
import { User } from 'src/users/auth/entity/users.entity';
import { Strike } from 'src/strike/entities/strike.entity';

@Entity('sellers')
export class Seller {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: SellerVerificationStatus,
    default: SellerVerificationStatus.PENDING,
  })
  verificationSeller: SellerVerificationStatus;

  @Column({ nullable: true })
  reason: string;

  @Column({ nullable: true })
  adminNote: string;

  @Column({ nullable: true })
  coachingNote: string;

  @Column({ type: 'integer', default: 0 })
  level: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Strike, (strike) => strike.seller)
  strikes: Strike[];

  @OneToOne(() => User, (user) => user.seller)
  @JoinColumn()
  user: User;
}
