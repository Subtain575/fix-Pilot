import { User } from '../../users/auth/entity/users.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
} from 'typeorm';
import { ViolationType } from '../Enum/violation-type-enum';
import { ViolationSeverity } from '../Enum/violation-severity-enum';
import { ViolationStatus } from '../Enum/violation-status-enum';

@Entity('violations')
export class messageSafety {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('text')
  content: string;

  @Column({
    type: 'enum',
    enum: ViolationType,
  })
  type: ViolationType;

  @Column({
    type: 'enum',
    enum: ViolationSeverity,
    default: ViolationSeverity.LOW,
  })
  severity: ViolationSeverity;

  @Column({
    type: 'enum',
    enum: ViolationStatus,
    default: ViolationStatus.PENDING,
  })
  status: ViolationStatus;

  @Column({ nullable: true })
  adminAction?: string;

  @Column({ nullable: true })
  notes?: string;

  @CreateDateColumn()
  detectedAt: Date;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'userId' })
  user: User;
}
