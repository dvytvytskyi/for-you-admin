import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, ManyToMany, JoinTable, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Country } from './Country';
import { City } from './City';
import { Area } from './Area';
import { Developer } from './Developer';
import { Facility } from './Facility';
import { PropertyUnit } from './PropertyUnit';
import { Favorite } from './Favorite';
import { PropertyFinderProject } from './PropertyFinderProject';

export enum PropertyType {
  OFF_PLAN = 'off-plan',
  SECONDARY = 'secondary',
  NEW_LAUNCHES = 'new-launches',
  EXCLUSIVE_FOR_YOU = 'exclusive-for-you'
}

@Entity('properties')
export class Property {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    type: 'enum',
    enum: PropertyType,
    default: PropertyType.OFF_PLAN
  })
  propertyType!: PropertyType;

  @Column()
  name!: string;

  @Column('text', { nullable: true })
  description!: string;

  @Column('text', { name: 'descriptionRu', nullable: true })
  descriptionRu!: string;

  @Column('uuid')
  countryId!: string;

  @ManyToOne(() => Country)
  @JoinColumn({ name: 'countryId' })
  country!: Country;

  @Column('uuid')
  cityId!: string;

  @ManyToOne(() => City)
  @JoinColumn({ name: 'cityId' })
  city!: City;

  @Column('uuid')
  areaId!: string;

  @ManyToOne(() => Area)
  @JoinColumn({ name: 'areaId' })
  area!: Area;

  @Column('uuid')
  developerId!: string;

  @ManyToOne(() => Developer)
  @JoinColumn({ name: 'developerId' })
  developer!: Developer;

  @Column('decimal', { precision: 10, scale: 7, nullable: true })
  latitude!: number;

  @Column('decimal', { precision: 10, scale: 7, nullable: true })
  longitude!: number;

  @Column('text', { array: true, default: '{}' })
  photos!: string[];

  @Column('boolean', { name: 'isactive', default: true })
  isActive!: boolean;

  @Column('decimal', { name: 'priceFrom', precision: 15, scale: 2, nullable: true })
  priceFrom!: number;

  @Column('text', { name: 'pricecurrency', default: 'AED' })
  priceCurrency!: string;

  @Column('integer', { name: 'bedroomsFrom', nullable: true })
  bedroomsFrom!: number;

  @Column('integer', { name: 'bedroomsTo', nullable: true })
  bedroomsTo!: number;

  @Column('decimal', { name: 'sizeFrom', precision: 12, scale: 2, nullable: true })
  sizeFrom!: number;

  @Column('decimal', { name: 'sizeTo', precision: 12, scale: 2, nullable: true })
  sizeTo!: number;

  @Column('text', { nullable: true })
  status!: string;

  @Column('text', { name: 'saleStatus', nullable: true })
  saleStatus!: string;

  @Column('text', { nullable: true })
  readiness!: string;

  @Column('text', { name: 'serviceCharge', nullable: true })
  serviceCharge!: string;

  @Column('text', { name: 'completionDatetime', nullable: true })
  completionDatetime!: string;

  @Column('text', { name: 'layoutsPdf', nullable: true })
  layoutsPdf!: string;

  @Column('text', { name: 'brochureUrl', nullable: true })
  brochureUrl!: string;

  @Column('text', { name: 'depositDescription', nullable: true })
  depositDescription!: string;

  @Column('text', { name: 'videoUrl', nullable: true })
  videoUrl!: string;

  @Column('jsonb', { name: 'mapPoints', nullable: true })
  mapPoints!: any;

  @Column('jsonb', { name: 'paymentPlansJson', nullable: true })
  paymentPlansJson!: any;

  @Column('jsonb', { name: 'masterPlan', nullable: true })
  masterPlan!: any;

  @Column('jsonb', { nullable: true })
  lobby!: any;

  @Column('jsonb', { nullable: true })
  interior!: any;

  @Column('jsonb', { nullable: true })
  architecture!: any;

  @Column('text', { nullable: true })
  slug!: string;

  @Column('boolean', { name: 'isForYouChoice', default: false })
  isForYouChoice!: boolean;

  @Column('text', { name: 'plannedcompletionat', nullable: true })
  plannedCompletionAt!: string;

  @Column('text', { name: 'paymentPlan', nullable: true })
  paymentPlan!: string;

  @Column('decimal', { precision: 15, scale: 2, nullable: true })
  price!: number;

  @Column('integer', { nullable: true })
  bedrooms!: number;

  @Column('integer', { nullable: true })
  bathrooms!: number;

  @Column('integer', { name: 'bathroomsFrom', nullable: true })
  bathroomsFrom!: number;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  size!: number;

  @ManyToMany(() => Facility, facility => facility.projects, { cascade: true })
  @JoinTable()
  facilities!: Facility[];

  // Scraper/Additional fields
  @Column('text', { name: 'externalid', nullable: true })
  externalId?: string;

  @Column('text', { name: 'propertyurl', nullable: true })
  propertyUrl?: string;

  @OneToMany(() => PropertyUnit, unit => unit.property)
  units!: PropertyUnit[];

  @OneToMany(() => Favorite, favorite => favorite.property)
  favorites!: Favorite[];

  @Column('uuid', { name: 'parent_project_id', nullable: true })
  parentProjectId?: string;

  @ManyToOne(() => PropertyFinderProject)
  @JoinColumn({ name: 'parent_project_id' })
  parentProject?: PropertyFinderProject;

  @Column('jsonb', { nullable: true })
  views?: any;

  @Column('text', { name: 'seoTitle', nullable: true })
  seoTitle?: string;

  @Column('text', { name: 'seoDescription', nullable: true })
  seoDescription?: string;

  @CreateDateColumn({ name: 'createdAt' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updatedAt' })
  updatedAt!: Date;
}
