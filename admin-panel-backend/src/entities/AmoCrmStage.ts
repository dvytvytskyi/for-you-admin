import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { AmoCrmPipeline } from './AmoCrmPipeline';

export enum LeadStatus {
  NEW = 'NEW',
  IN_PROGRESS = 'IN_PROGRESS',
  QUALIFIED = 'QUALIFIED',
  CLOSED_WON = 'CLOSED_WON',
  CLOSED_LOST = 'CLOSED_LOST',
}

@Entity('amo_crm_stages')
@Index(['amoPipelineId', 'sort'])
@Index(['mappedStatus'])
export class AmoCrmStage {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'amo_stage_id', unique: true })
  amoStageId!: number; // ID з AMO CRM

  @Column({ name: 'pipeline_id' })
  pipelineId!: string; // UUID з amo_crm_pipelines

  @Column({ name: 'amo_pipeline_id', type: 'int' })
  amoPipelineId!: number; // ID pipeline з AMO CRM

  @Column()
  name!: string;

  @Column({ type: 'int' })
  sort!: number;

  @Column({ name: 'is_editable', default: true })
  isEditable!: boolean;

  @Column({ nullable: true })
  color?: string;

  @Column({ name: 'status_type', type: 'int', nullable: true })
  statusType?: number; // 0 - звичайна, 1 - неразобранное, 142 - успішно, 143 - нереалізовано

  @Column({
    type: 'enum',
    enum: LeadStatus,
    nullable: true,
    name: 'mapped_status',
  })
  mappedStatus?: LeadStatus; // Мапінг на наші статуси

  @Column({ name: 'account_id', type: 'int' })
  accountId!: number;

  @Column({ type: 'jsonb', nullable: true })
  rawData?: any; // Повні дані з AMO CRM

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @ManyToOne(() => AmoCrmPipeline, pipeline => pipeline.stages)
  @JoinColumn({ name: 'pipeline_id' })
  pipeline!: AmoCrmPipeline;
}

// Індекси для швидкого пошуку
@Index(['amoPipelineId', 'sort'])
@Index(['mappedStatus'])

