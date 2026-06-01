import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToMany, JoinTable, OneToMany } from 'typeorm';
import { Area } from './Area';
import { DeveloperCommunity } from './DeveloperCommunity';

@Entity('developers')
export class Developer {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  name!: string;

  @Column({ nullable: true })
  nameRu?: string;

  @Column({ nullable: true })
  nameAr?: string;

  @Column({ unique: true, nullable: true })
  slug?: string;

  @Column({ nullable: true })
  logo!: string;

  @Column({ nullable: true })
  previewImage?: string;

  @Column('text', { nullable: true })
  description!: string;

  @Column('text', { nullable: true })
  descriptionRu?: string;

  @Column('text', { nullable: true })
  avgPricesDescription?: string;

  @Column('jsonb', { nullable: true })
  avgPrices?: { text: string; price: string }[];

  @ManyToMany(() => Area)
  @JoinTable({
    name: 'developer_areas',
    joinColumn: { name: 'developerId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'areaId', referencedColumnName: 'id' }
  })
  areas!: Area[];

  @OneToMany(() => DeveloperCommunity, community => community.developer, { cascade: true })
  communities!: DeveloperCommunity[];

  @Column('text', { array: true, nullable: true })
  images?: string[]; // Масив URL фото

  @Column('jsonb', { nullable: true })
  pros?: string[];

  @Column('jsonb', { nullable: true })
  prosRu?: string[];

  @Column('jsonb', { nullable: true })
  cons?: string[];

  @Column('jsonb', { nullable: true })
  consRu?: string[];

  @Column('jsonb', { nullable: true })
  faqItems?: { question: string; answer: string; questionRu?: string; answerRu?: string }[];

  @Column('jsonb', { nullable: true })
  paymentPlans?: { name: string; during: number; after: number; note?: string }[];

  @Column('jsonb', { nullable: true })
  handoverPipeline?: { year: number; quarter: string; projectName: string; slug?: string }[];

  @Column('text', { array: true, nullable: true })
  relatedDeveloperIds?: string[];

  @Column({ nullable: true })
  seoTitle?: string;

  @Column('text', { nullable: true })
  seoDescription?: string;

  @Column({ default: true })
  isPublished!: boolean;

  // Developer page content fields (added in migration 026)
  @Column('text', { nullable: true })
  heroSummary?: string;

  @Column('jsonb', { nullable: true })
  whyInvest?: string[];

  @Column('jsonb', { nullable: true })
  whyInvestRu?: string[];

  @Column('text', { nullable: true })
  avgPricesDescriptionRu?: string;

  @Column('jsonb', { nullable: true })
  topProjects?: { name: string; slug: string }[];

  @Column('text', { nullable: true })
  canonicalPath?: string;

  @Column({ nullable: true, default: 'index' })
  indexingPolicy?: string;

  @CreateDateColumn()
  createdAt!: Date;

  @Column({ type: 'timestamp', nullable: true })
  updatedAt?: Date;
}

