import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, ManyToMany, JoinTable, OneToMany, CreateDateColumn, UpdateDateColumn, JoinColumn } from 'typeorm';
import { Country } from './Country';
import { City } from './City';
import { Area } from './Area';
import { Developer } from './Developer';
import { Facility } from './Facility';
import { PropertyUnit } from './PropertyUnit';

export enum PropertyType {
  OFF_PLAN = 'off-plan',
  SECONDARY = 'secondary',
}

@Entity('properties')
export class Property {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'enum', enum: PropertyType })
  propertyType!: PropertyType;

  @Column()
  name!: string;

  @Column('simple-array')
  photos!: string[];

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

  @Column('uuid', { nullable: true })
  developerId!: string;
  @ManyToOne(() => Developer)
  @JoinColumn({ name: 'developerId' })
  developer!: Developer;

  // Off-Plan fields
  @Column('decimal', { precision: 15, scale: 2, nullable: true })
  priceFrom!: number;

  @Column('int', { nullable: true })
  bedroomsFrom!: number;

  @Column('int', { nullable: true })
  bedroomsTo!: number;

  @Column('int', { nullable: true })
  bathroomsFrom!: number;

  @Column('int', { nullable: true })
  bathroomsTo!: number;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  sizeFrom!: number;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  sizeTo!: number;

  @Column('text', { nullable: true })
  paymentPlan!: string;

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

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

