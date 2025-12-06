import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './User';

export enum DocumentType {
  // Property documents
  BROCHURE = 'BROCHURE',
  FLOOR_PLAN = 'FLOOR_PLAN',
  MASTER_PLAN = 'MASTER_PLAN',
  PROPERTY_CONTRACT = 'PROPERTY_CONTRACT',
  PROPERTY_CERTIFICATE = 'PROPERTY_CERTIFICATE',
  
  // Lead documents
  LEAD_CONTRACT = 'LEAD_CONTRACT',
  CLIENT_ID = 'CLIENT_ID',
  CLIENT_PASSPORT = 'CLIENT_PASSPORT',
  POWER_OF_ATTORNEY = 'POWER_OF_ATTORNEY',
  
  // User documents (Broker)
  BROKER_LICENSE = 'BROKER_LICENSE',
  BROKER_CERTIFICATE = 'BROKER_CERTIFICATE',
  
  // Other
  OTHER = 'OTHER',
}

export enum DocumentCategory {
  PROPERTY = 'PROPERTY',
  LEAD = 'LEAD',
  USER = 'USER',
}

@Entity('documents')
export class Document {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    type: 'enum',
    enum: DocumentType,
  })
  type!: DocumentType;

  @Column({
    type: 'enum',
    enum: DocumentCategory,
    name: 'entity_type',
  })
  entityType!: DocumentCategory;

  @Column({ name: 'entity_id' })
  entityId!: string;

  @Column({ name: 'file_name' })
  fileName!: string;

  @Column({ name: 'original_name' })
  originalName!: string;

  @Column({ name: 'file_url' })
  fileUrl!: string;

  @Column({ name: 's3_key', nullable: true })
  s3Key?: string;

  @Column({ name: 'mime_type' })
  mimeType!: string;

  @Column({ name: 'file_size', type: 'bigint' })
  fileSize!: number; // в байтах

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'is_public', default: false })
  isPublic!: boolean;

  @Column({ name: 'is_verified', default: false })
  isVerified!: boolean;

  @Column({ name: 'uploaded_by' })
  uploadedBy!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'uploaded_by' })
  uploader?: User;

  @Column({ name: 'verified_by', nullable: true })
  verifiedBy?: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'verified_by' })
  verifier?: User;

  @Column({ name: 'verified_at', type: 'timestamp', nullable: true })
  verifiedAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

