import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('amo_crm_leads')
export class AmoCrmLead {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'amo_lead_id', unique: true })
  amoLeadId!: number; // ID з AMO CRM

  @Column()
  name!: string;

  @Column('decimal', { precision: 15, scale: 2, nullable: true })
  price?: number | null;

  @Column({ name: 'status_id', type: 'int', nullable: true })
  statusId?: number;

  @Column({ name: 'pipeline_id', type: 'int', nullable: true })
  pipelineId?: number;

  @Column({ name: 'responsible_user_id', type: 'int', nullable: true })
  responsibleUserId?: number;

  @Column({ name: 'created_at_amo', type: 'bigint', nullable: true })
  createdAtAmo?: number; // Timestamp з AMO CRM

  @Column({ name: 'updated_at_amo', type: 'bigint', nullable: true })
  updatedAtAmo?: number; // Timestamp з AMO CRM

  @Column({ type: 'jsonb', nullable: true })
  customFields?: any; // Custom fields values

  @Column({ type: 'jsonb', nullable: true })
  embedded?: any; // Contacts, companies тощо

  @Column({ type: 'jsonb', nullable: true })
  rawData?: any; // Повні дані з AMO CRM для резервного копіювання

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

