import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('addresses')
export class Address {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'service_address' })
  serviceAddress: string;

  @Column({ name: 'address_name' })
  addressName: string;

  @Column('decimal', { precision: 10, scale: 8, nullable: true })
  lat: number;

  @Column('decimal', { precision: 11, scale: 8, nullable: true })
  long: number;

  @Column({ name: 'postal_code', nullable: true })
  postalCode: string;

  @Column({ nullable: true })
  city: string;

  @Column({ nullable: true })
  country: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
