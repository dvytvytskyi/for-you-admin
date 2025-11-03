import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, JoinColumn } from 'typeorm';
import { SupportRequest } from './SupportRequest';

@Entity('support_responses')
export class SupportResponse {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  supportRequestId!: string;
  @ManyToOne(() => SupportRequest, request => request.responses, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'supportRequestId' })
  request!: SupportRequest;

  @Column('uuid', { nullable: true })
  userId!: string;

  @Column('text')
  message!: string;

  @Column({ default: false })
  isFromAdmin!: boolean;

  @CreateDateColumn()
  createdAt!: Date;
}

