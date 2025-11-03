import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Property } from './Property';

export enum UnitType {
  APARTMENT = 'apartment',
  VILLA = 'villa',
  PENTHOUSE = 'penthouse',
  TOWNHOUSE = 'townhouse',
  OFFICE = 'office',
}

@Entity('property_units')
export class PropertyUnit {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  propertyId!: string;
  @ManyToOne(() => Property, property => property.units, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'propertyId' })
  property!: Property;

  @Column()
  unitId!: string;

  @Column({ type: 'enum', enum: UnitType })
  type!: UnitType;

  @Column({ nullable: true })
  planImage!: string;

  @Column('decimal', { precision: 10, scale: 2 })
  totalSize!: number;

  @Column('decimal', { precision: 10, scale: 2, nullable: true })
  balconySize!: number;

  @Column('decimal', { precision: 15, scale: 2 })
  price!: number;
}

