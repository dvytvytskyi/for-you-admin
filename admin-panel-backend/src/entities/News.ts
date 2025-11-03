import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { NewsContent } from './NewsContent';

@Entity('news')
export class News {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  title!: string;

  @Column('text')
  description!: string;

  @Column({ nullable: true })
  imageUrl!: string;

  @Column({ default: false })
  isPublished!: boolean;

  @Column('timestamptz', { nullable: true })
  publishedAt!: Date;

  @OneToMany(() => NewsContent, content => content.news, { cascade: true })
  contents!: NewsContent[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

