import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('api_keys')
export class ApiKey {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  apiKey!: string;

  @Column()
  apiSecret!: string;

  @Column({ nullable: true })
  name?: string;

  @Column({ default: true })
  isActive!: boolean;

  @Column({ nullable: true, type: 'timestamp' })
  lastUsedAt?: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

