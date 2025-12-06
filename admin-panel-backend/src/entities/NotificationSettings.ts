import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './User';

@Entity('notification_settings')
export class NotificationSettings {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', unique: true })
  userId!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'push_enabled', default: true })
  pushEnabled!: boolean;

  @Column({ name: 'email_enabled', default: true })
  emailEnabled!: boolean;

  @Column({ name: 'lead_created', default: true })
  leadCreated!: boolean;

  @Column({ name: 'lead_assigned', default: true })
  leadAssigned!: boolean;

  @Column({ name: 'lead_status_changed', default: true })
  leadStatusChanged!: boolean;

  @Column({ name: 'new_property', default: true })
  newProperty!: boolean;

  @Column({ name: 'price_changed', default: true })
  priceChanged!: boolean;

  @Column({ name: 'new_exclusive_property', default: true })
  newExclusiveProperty!: boolean;

  @Column({ name: 'system', default: true })
  system!: boolean;

  @Column({ name: 'marketing', default: true })
  marketing!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

