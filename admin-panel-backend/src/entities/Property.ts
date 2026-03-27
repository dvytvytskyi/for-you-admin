import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, ManyToMany, JoinTable, OneToMany, CreateDateColumn, UpdateDateColumn, JoinColumn } from 'typeorm';
import { Country } from './Country';
import { City } from './City';
import { Area } from './Area';
import { Developer } from './Developer';
import { Facility } from './Facility';
import { PropertyUnit } from './PropertyUnit';

export enum PropertyType {
  NEW_LAUNCHES = 'new-launches',
  OFF_PLAN = 'off-plan',
  SECONDARY = 'secondary',
  RENT = 'rent',
  EXCLUSIVE_FOR_YOU = 'exclusive-for-you',
  COMMERCIAL = 'commercial',
}

@Entity('properties')
export class Property {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'enum', enum: PropertyType })
  propertyType!: PropertyType;

  @Column({ unique: true, nullable: true })
  slug?: string;

  @Column('text', { nullable: true })
  name!: string;

  @Column('simple-array', { nullable: true })
  photos?: string[];

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

  @Column('decimal', { precision: 10, scale: 8 })
  latitude!: number;

  @Column('decimal', { precision: 11, scale: 8 })
  longitude!: number;

  @Column('text')
  description!: string;

  @Column('text', { nullable: true })
  descriptionRu?: string;

  @Column('uuid', { nullable: true })
  developerId!: string;
  @ManyToOne(() => Developer)
  @JoinColumn({ name: 'developerId' })
  developer!: Developer;

  // Off-Plan fields
  @Column('decimal', { name: 'priceFrom', precision: 15, scale: 2, nullable: true })
  priceFrom!: number;

  @Column('int', { name: 'bedroomsFrom', nullable: true })
  bedroomsFrom!: number;

  @Column('int', { name: 'bedroomsTo', nullable: true })
  bedroomsTo!: number;

  @Column('int', { name: 'bathroomsFrom', nullable: true })
  bathroomsFrom!: number;

  @Column('int', { name: 'bathroomsTo', nullable: true })
  bathroomsTo!: number;

  @Column('decimal', { name: 'sizeFrom', precision: 10, scale: 2, nullable: true })
  sizeFrom!: number;

  @Column('decimal', { name: 'sizeTo', precision: 10, scale: 2, nullable: true })
  sizeTo!: number;

  @Column('text', { nullable: true })
  paymentPlan!: string;

  @Column({ name: 'isForYouChoice', type: 'boolean', default: false })
  isForYouChoice!: boolean;

  @Column('text', { name: 'projectedroi', nullable: true })
  projectedRoi?: string;

  @Column({ name: 'isinvestorfeatured', type: 'boolean', default: false })
  isInvestorFeatured!: boolean;

  @Column('text', { nullable: true })
  commission?: string;

  @Column('text', { name: 'plannedcompletionat', nullable: true })
  plannedCompletionAt?: string;

  @Column({ name: 'isactive', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ name: 'parent_project_id', type: 'uuid', nullable: true })
  parentProjectId?: string | null;

  @ManyToOne(() => Property)
  @JoinColumn({ name: 'parent_project_id' })
  parentProject?: Property | null;

  @Column({ name: 'priority', type: 'integer', default: 0 })
  priority!: number;

  @Column({ name: 'nameEn', nullable: true })
  nameEn?: string;

  @Column({ name: 'nameRu', nullable: true })
  nameRu?: string;

  @Column({ name: 'nameAr', nullable: true })
  nameAr?: string;

  @OneToMany(() => PropertyUnit, unit => unit.property, { cascade: true })
  units!: PropertyUnit[];

  // Secondary fields
  @Column('decimal', { precision: 15, scale: 2, nullable: true })
  price!: number;

  @Column('int', { nullable: true })
  bedrooms!: number;

  @Column('int', { nullable: true })
  bathrooms!: number;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  size!: number;

  @ManyToMany(() => Facility)
  @JoinTable()
  facilities!: Facility[];

  // Scraper/Additional fields
  @Column('text', { name: 'externalid', nullable: true })
  externalId?: string;

  @Column({ name: 'propertyurl', type: 'text', nullable: true })
  propertyUrl?: string;

  @Column('text', { name: 'buildingname', nullable: true })
  buildingName?: string;

  @Column('text', { name: 'communityname', nullable: true })
  communityName?: string;

  @Column({ name: 'verified', type: 'boolean', default: false })
  verified!: boolean;

  @Column('text', { name: 'reference', nullable: true })
  reference?: string;

  @Column('text', { name: 'rera', nullable: true })
  rera?: string;

  @Column({ name: 'furnishing', nullable: true })
  furnishing?: string;

  @Column('text', { name: 'agentname', nullable: true })
  agentName?: string;

  @Column({ name: 'agentphone', nullable: true })
  agentPhone?: string;

  @Column({ name: 'agentwhatsapp', nullable: true })
  agentWhatsapp?: string;

  @Column({ name: 'agentemail', nullable: true })
  agentEmail?: string;

  @Column({ name: 'agentphoto', nullable: true })
  agentPhoto?: string;

  @Column('text', { name: 'brokername', nullable: true })
  brokerName?: string;

  @Column({ name: 'brokerlogo', nullable: true })
  brokerLogo?: string;

  @Column('text', { name: 'displayaddress', nullable: true })
  displayAddress?: string;

  @Column({ name: 'addedon', nullable: true })
  addedOn?: string;

  @Column({ name: 'agentinfo', type: 'jsonb', nullable: true })
  agentInfo?: any;

  @Column({ name: 'brokerinfo', type: 'jsonb', nullable: true })
  brokerInfo?: any;

  @Column({ name: 'priceduration', nullable: true })
  priceDuration?: string;

  @Column({ name: 'propertysubtype', nullable: true })
  propertySubType?: string;

  @Column({ name: 'pricecurrency', nullable: true })
  priceCurrency?: string;

  @Column({ name: 'type', nullable: true })
  type?: string;

  @Column({ name: 'sizemin', nullable: true })
  sizeMin?: string;

  @Column({ name: 'views', type: 'jsonb', nullable: true })
  views?: string[];

  @Column('decimal', { name: 'minPrice', precision: 15, scale: 2, nullable: true })
  minPrice?: number;

  @Column('decimal', { name: 'maxPrice', precision: 15, scale: 2, nullable: true })
  maxPrice?: number;

  @Column('decimal', { name: 'minPriceAed', precision: 15, scale: 2, nullable: true })
  minPriceAed?: number;

  @Column('decimal', { name: 'maxPriceAed', precision: 15, scale: 2, nullable: true })
  maxPriceAed?: number;

  // REELLY SPECIFIC FIELDS
  @Column({ name: 'status', type: 'text', nullable: true })
  status?: string;

  @Column({ name: 'saleStatus', type: 'text', nullable: true })
  saleStatus?: string;

  @Column({ name: 'readiness', type: 'text', nullable: true })
  readiness?: string;

  @Column({ name: 'serviceCharge', type: 'text', nullable: true })
  serviceCharge?: string;

  @Column({ name: 'completionDatetime', type: 'text', nullable: true })
  completionDatetime?: string;

  @Column({ name: 'layoutsPdf', type: 'text', nullable: true })
  layoutsPdf?: string;

  @Column({ name: 'brochureUrl', type: 'text', nullable: true })
  brochureUrl?: string;

  @Column({ name: 'depositDescription', type: 'text', nullable: true })
  depositDescription?: string;

  @Column({ name: 'videoUrl', type: 'text', nullable: true })
  videoUrl?: string;

  @Column({ name: 'mapPoints', type: 'jsonb', nullable: true })
  mapPoints?: any;

  @Column({ name: 'paymentPlansJson', type: 'jsonb', nullable: true })
  paymentPlansJson?: any;

  @Column({ name: 'masterPlan', type: 'jsonb', nullable: true })
  masterPlan?: any;

  @Column({ name: 'lobby', type: 'jsonb', nullable: true })
  lobby?: any;    

  @Column({ name: 'interior', type: 'jsonb', nullable: true })
  interior?: any;

  @Column({ name: 'architecture', type: 'jsonb', nullable: true })
  architecture?: any;

  @Column({ name: 'unitTypesJson', type: 'jsonb', nullable: true })
  unitTypesJson?: any;

  @CreateDateColumn()
  createdAt!: Date;

  @Column({ name: 'seoTitle', type: 'text', nullable: true })
  seoTitle?: string;

  @Column({ name: 'seoDescription', type: 'text', nullable: true })
  seoDescription?: string;

  @UpdateDateColumn()
  updatedAt!: Date;
}

