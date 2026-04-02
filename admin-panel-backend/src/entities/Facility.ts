import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToMany } from 'typeorm';
import { Property } from './Property';

@Entity('facilities')
export class Facility {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  nameEn!: string;

  @Column()
  nameRu!: string;

  @Column()
  nameAr!: string;

  @Column()
  iconName!: string;

  @ManyToMany(() => Property, property => property.facilities)
  projects!: Property[];

  @CreateDateColumn()
  createdAt!: Date;
}
