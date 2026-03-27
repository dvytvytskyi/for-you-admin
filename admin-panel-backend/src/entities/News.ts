import { Entity, PrimaryGeneratedColumn, Column, OneToMany, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { NewsContent } from './NewsContent';
import { Author } from './Author';

@Entity('news')
export class News {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true, nullable: true })
  slug?: string;

  @Column()
  title!: string;

  @Column('text')
  description!: string;

  @Column({ nullable: true })
  titleRu!: string;

  @Column('text', { nullable: true })
  descriptionRu!: string;

  @Column({ nullable: true })
  imageUrl!: string;

  @Column({ default: false })
  isPublished!: boolean;

  @Column('timestamptz', { nullable: true })
  publishedAt!: Date;

  @Column({ nullable: true })
  authorId?: string;

  @ManyToOne(() => Author, author => author.news, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'authorId' })
  author!: Author;

  @Column({ nullable: true })
  seoTitle?: string;

  @Column('text', { nullable: true })
  seoDescription?: string;

  @OneToMany(() => NewsContent, content => content.news, { cascade: true })
  contents!: NewsContent[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

