import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { News } from './News';

@Entity('authors')
export class Author {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  nameEn!: string;

  @Column({ nullable: true })
  nameRu?: string;

  @Column({ nullable: true })
  nameAr?: string;

  @Column({ nullable: true })
  position?: string;

  @Column({ nullable: true })
  photo?: string;

  @Column('text', { nullable: true })
  bio?: string;

  @Column('jsonb', { default: {} })
  socialLinks!: {
    linkedin?: string;
    instagram?: string;
    facebook?: string;
    twitter?: string;
  };

  @OneToMany(() => News, news => news.author)
  news!: News[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
