import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { News } from './News';

export enum NewsContentType {
  TEXT = 'text',
  IMAGE = 'image',
  VIDEO = 'video',
}

@Entity('news_contents')
export class NewsContent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  newsId!: string;
  @ManyToOne(() => News, news => news.contents, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'newsId' })
  news!: News;

  @Column({ type: 'enum', enum: NewsContentType })
  type!: NewsContentType;

  @Column()
  title!: string;

  @Column('text', { nullable: true })
  description!: string;

  @Column({ nullable: true })
  imageUrl!: string;

  @Column({ nullable: true })
  videoUrl!: string;

  @Column('int')
  order!: number;
}

