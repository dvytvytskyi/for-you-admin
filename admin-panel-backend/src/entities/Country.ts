import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { City } from './City';

@Entity('countries')
export class Country {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  nameEn!: string;

  @Column()
  nameRu!: string;

  @Column()
  nameAr!: string;

  @Column({ unique: true })
  code!: string;

  @OneToMany(() => City, city => city.country)
  cities!: City[];
}

