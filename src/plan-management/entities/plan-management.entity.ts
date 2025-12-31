import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class PlanManagement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  planType: string;

  @Column('float')
  price: number;

  @Column()
  country: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
