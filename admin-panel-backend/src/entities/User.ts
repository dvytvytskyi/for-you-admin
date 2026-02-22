import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToOne, JoinColumn } from 'typeorm';
import { AmoCrmUser } from './AmoCrmUser';

export enum UserRole {
  CLIENT = 'CLIENT',
  BROKER = 'BROKER',
  INVESTOR = 'INVESTOR',
  ADMIN = 'ADMIN',
}

export enum UserStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  BLOCKED = 'BLOCKED',
  REJECTED = 'REJECTED',
  DELETED = 'DELETED',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  email!: string;

  @Column({ unique: true })
  phone!: string;

  @Column({ name: 'password_hash' })
  passwordHash!: string;

  @Column({ name: 'first_name' })
  firstName!: string;

  @Column({ name: 'last_name' })
  lastName!: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.CLIENT,
  })
  role!: UserRole;

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.ACTIVE,
  })
  status!: UserStatus;

  @Column({ type: 'varchar', name: 'license_number', nullable: true })
  licenseNumber?: string | null;

  @Column({ type: 'varchar', name: 'google_id', nullable: true })
  googleId?: string | null;

  @Column({ type: 'varchar', name: 'apple_id', nullable: true })
  appleId?: string | null;

  @Column({ type: 'varchar', nullable: true })
  avatar?: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @Column({ type: 'varchar', name: 'amo_crm_user_id', nullable: true })
  amoCrmUserId?: string | null;

  @OneToOne(() => AmoCrmUser, (amoUser) => amoUser.user)
  @JoinColumn({ name: 'amo_crm_user_id' })
  amoCrmUser?: AmoCrmUser;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

