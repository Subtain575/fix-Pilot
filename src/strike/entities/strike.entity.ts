import { Seller } from 'src/seller/entities/seller.entity';

import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { StrikeType } from '../Enum/strike-type.enum';

@Entity('strikes')
export class Strike {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Seller, (seller) => seller.strikes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'seller_id' })
  seller: Seller;

  @Column()
  type: StrikeType;

  @Column({ type: 'int', default: 0 })
  points: number;

  @Column({ type: 'text', nullable: true })
  reason: string;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'date', nullable: true })
  expiresAt: Date;
}
