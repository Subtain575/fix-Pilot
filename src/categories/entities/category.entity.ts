import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Gig } from '../../gigs/entities/gig.entity';

@Entity('categories')
export class Category {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, nullable: false })
  name: string;

  @Column({ nullable: true })
  parentCategoryName: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'text', nullable: true })
  helpTextForBuyers: string;

  @Column({ nullable: true })
  icon: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  minimumPrice: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  maximumPrice: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  suggestedBasePrice: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  platformCommissionRate: number;

  @Column({ type: 'int', nullable: true })
  defaultServiceRadius: number;

  @Column({ type: 'boolean', default: false })
  isLicense: boolean;

  @Column({ type: 'boolean', default: false })
  isInsurance: boolean;

  @Column({ type: 'int', nullable: true })
  minExperience: number;

  @Column({ type: 'simple-array', nullable: true })
  commonAddOns: string[];

  @OneToMany(() => Gig, (gig) => gig.category)
  gigs: Gig[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
