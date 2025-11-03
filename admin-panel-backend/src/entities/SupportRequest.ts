import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { SupportResponse } from './SupportResponse';

export enum SupportStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in-progress',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
}

@Entity('support_requests')
export class SupportRequest {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  userId!: string;

  @Column()
  subject!: string;

  @Column('text')
  message!: string;

  @Column({ type: 'enum', enum: SupportStatus, default: SupportStatus.PENDING })
  status!: SupportStatus;

  @Column({ default: 'normal' })
  priority!: string;

  @OneToMany(() => SupportResponse, response => response.request, { cascade: true })
  responses!: SupportResponse[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

