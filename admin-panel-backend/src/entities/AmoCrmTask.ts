import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum AmoTaskType {
  CALL = 'CALL',
  MEETING = 'MEETING',
  EMAIL = 'EMAIL',
  NOTE = 'NOTE',
  OTHER = 'OTHER',
}

@Entity('amo_crm_tasks')
export class AmoCrmTask {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'amo_task_id', unique: true })
  amoTaskId!: number; // ID з AMO CRM

  @Column({ name: 'entity_id', type: 'int' })
  entityId!: number; // ID lead або contact

  @Column({ name: 'entity_type' })
  entityType!: string; // 'leads' або 'contacts'

  @Column({ name: 'task_type', type: 'int' })
  taskType!: number; // Тип задачі з AMO CRM

  @Column({
    type: 'enum',
    enum: AmoTaskType,
    nullable: true,
    name: 'mapped_type',
  })
  mappedType?: AmoTaskType; // Мапінг на наші типи

  @Column({ name: 'text', type: 'text', nullable: true })
  text?: string; // Текст задачі

  @Column({ name: 'result_text', type: 'text', nullable: true })
  resultText?: string; // Результат виконання (коментар/нотатка)

  @Column({ name: 'responsible_user_id', type: 'int', nullable: true })
  responsibleUserId?: number;

  @Column({ name: 'created_by', type: 'int', nullable: true })
  createdBy?: number;

  @Column({ name: 'complete_till', type: 'bigint', nullable: true })
  completeTill?: number; // Timestamp дедлайну

  @Column({ name: 'is_completed', default: false })
  isCompleted!: boolean;

  @Column({ name: 'created_at_amo', type: 'bigint', nullable: true })
  createdAtAmo?: number; // Timestamp з AMO CRM

  @Column({ name: 'updated_at_amo', type: 'bigint', nullable: true })
  updatedAtAmo?: number; // Timestamp з AMO CRM

  @Column({ name: 'raw_data', type: 'jsonb', nullable: true })
  rawData?: any; // Повні дані з AMO CRM

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

