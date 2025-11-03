import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Course } from './Course';

export enum ContentType {
  TEXT = 'text',
  IMAGE = 'image',
  VIDEO = 'video',
}

@Entity('course_contents')
export class CourseContent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  courseId!: string;
  @ManyToOne(() => Course, course => course.contents, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'courseId' })
  course!: Course;

  @Column({ type: 'enum', enum: ContentType })
  type!: ContentType;

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

