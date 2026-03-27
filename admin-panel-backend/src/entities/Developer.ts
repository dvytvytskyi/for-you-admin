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

  @CreateDateColumn()
  createdAt!: Date;
}

