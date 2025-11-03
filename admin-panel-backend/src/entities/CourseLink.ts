import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Course } from './Course';

@Entity('course_links')
export class CourseLink {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  courseId!: string;
  @ManyToOne(() => Course, course => course.links, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'courseId' })
  course!: Course;

  @Column()
  title!: string;

  @Column()
  url!: string;

  @Column('int')
  order!: number;
}

