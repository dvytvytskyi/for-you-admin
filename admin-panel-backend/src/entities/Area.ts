import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, ManyToMany } from 'typeorm';
import { City } from './City';
import { Developer } from './Developer';

@Entity('areas')
export class Area {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  cityId!: string;

  @ManyToOne(() => City, city => city.areas)
  @JoinColumn({ name: 'cityId' })
  city!: City;

  @ManyToMany(() => Developer, developer => developer.areas)
  developers!: Developer[];

  @Column()
  nameEn!: string;

  @Column()
  nameRu!: string;

  @Column()
  nameAr!: string;

  @Column('jsonb', { nullable: true })
  description?: {
    title?: string;
    description?: string;
  };

  @Column('jsonb', { nullable: true })
  descriptionRu?: {
    title?: string;
    description?: string;
  };

  @Column('jsonb', { nullable: true })
  infrastructure?: {
    title?: string;
    description?: string;
  };

  @Column('text', { array: true, nullable: true })
  images?: string[]; // Масив URL фото (до 8 штук, 3x4 або 4x3)

  @Column({ name: 'isactive', default: true })
  isActive!: boolean;

  @Column({ name: 'mainimage', nullable: true })
  mainImage?: string;

  @Column({ nullable: true, unique: true })
  slug?: string;

  @Column({ name: 'isfeatured', default: false })
  isFeatured!: boolean;

  @Column({ default: 0 })
  priority!: number;
}
