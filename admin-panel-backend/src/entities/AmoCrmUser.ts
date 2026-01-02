import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToOne } from 'typeorm';
import { User } from './User';

@Entity('amo_crm_users')
export class AmoCrmUser {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'amo_user_id', unique: true })
  amoUserId!: number; // ID з AMO CRM

  @Column()
  name!: string;

  @Column({ nullable: true })
  email?: string;

  @Column({ nullable: true })
  phone?: string;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @Column({ name: 'is_free', default: false })
  isFree!: boolean;

  @Column({ name: 'is_admin', default: false })
  isAdmin!: boolean;

  @Column({ name: 'rights', type: 'jsonb', nullable: true })
  rights?: any; // Права користувача

  @Column({ name: 'account_id', type: 'int' })
  accountId!: number;

  @Column({ type: 'jsonb', nullable: true })
  rawData?: any; // Повні дані з AMO CRM

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @OneToOne(() => User, (user) => user.amoCrmUser)
  user?: User;
}

