import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { Country } from './Country';
import { Area } from './Area';

@Entity('cities')
export class City {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  countryId!: string;

  @ManyToOne(() => Country, country => country.cities)
  @JoinColumn({ name: 'countryId' })
  country!: Country;

  @Column()
  nameEn!: string;

  @Column()
  nameRu!: string;

  @Column()
  nameAr!: string;

  @OneToMany(() => Area, area => area.city)
  areas!: Area[];
}

