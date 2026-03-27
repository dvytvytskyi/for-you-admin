import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Developer } from './Developer';
import { Area } from './Area';

@Entity('developer_communities')
export class DeveloperCommunity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  developerId!: string;

  @ManyToOne(() => Developer, developer => developer.communities, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'developerId' })
  developer!: Developer;

  @Column()
  title!: string;

  @Column({ nullable: true })
  areaId?: string;

  @ManyToOne(() => Area)
  @JoinColumn({ name: 'areaId' })
  area!: Area;

  @Column({ nullable: true })
  mapPoint?: string; // e.g. "lat,lng"

  @Column('jsonb', { nullable: true })
  priceRange?: { from: number; to: number };

  @Column('simple-array', { nullable: true })
  unitAvailabilities?: string[]; // Studio, 1, 2, 3, 4, 5, 6bdr

  @Column('simple-array', { nullable: true })
  propertyTypes?: string[]; // Villa, Apartment, Townhouse

  @Column('simple-array', { nullable: true })
  icp?: string[]; // Investment for resale, for rent out, for living couple, for living with family

  @Column('text', { nullable: true })
  description!: string;

  @Column('jsonb', { nullable: true })
  images?: {
    general?: string[]; // 6 photos
    exterior?: string[]; // 2 photos
    interior?: string[]; // 2 photos
  };
}
