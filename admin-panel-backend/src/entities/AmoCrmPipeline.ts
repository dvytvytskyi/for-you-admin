import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { AmoCrmStage } from './AmoCrmStage';

@Entity('amo_crm_pipelines')
export class AmoCrmPipeline {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'amo_pipeline_id', unique: true })
  amoPipelineId!: number; // ID з AMO CRM

  @Column()
  name!: string;

  @Column({ type: 'int' })
  sort!: number;

  @Column({ name: 'is_main', default: false })
  isMain!: boolean;

  @Column({ name: 'is_unsorted_on', default: false })
  isUnsortedOn!: boolean;

  @Column({ name: 'is_archive', default: false })
  isArchive!: boolean;

  @Column({ name: 'account_id', type: 'int' })
  accountId!: number;

  @Column({ type: 'jsonb', nullable: true })
  rawData?: any; // Повні дані з AMO CRM

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @OneToMany(() => AmoCrmStage, stage => stage.pipeline)
  stages!: AmoCrmStage[];
}

