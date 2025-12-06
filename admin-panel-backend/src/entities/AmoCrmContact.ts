import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('amo_crm_contacts')
export class AmoCrmContact {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'amo_contact_id', unique: true })
  amoContactId!: number; // ID з AMO CRM

  @Column()
  name!: string;

  @Column({ name: 'first_name', nullable: true })
  firstName?: string;

  @Column({ name: 'last_name', nullable: true })
  lastName?: string;

  @Column({ nullable: true })
  email?: string;

  @Column({ nullable: true })
  phone?: string;

  @Column({ name: 'responsible_user_id', type: 'int', nullable: true })
  responsibleUserId?: number;

  @Column({ name: 'created_at_amo', type: 'bigint', nullable: true })
  createdAtAmo?: number; // Timestamp з AMO CRM

  @Column({ name: 'updated_at_amo', type: 'bigint', nullable: true })
  updatedAtAmo?: number; // Timestamp з AMO CRM

  @Column({ name: 'custom_fields', type: 'jsonb', nullable: true })
  customFields?: any; // Custom fields values

  @Column({ type: 'jsonb', nullable: true })
  embedded?: any; // Companies, leads тощо

  @Column({ name: 'raw_data', type: 'jsonb', nullable: true })
  rawData?: any; // Повні дані з AMO CRM

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

