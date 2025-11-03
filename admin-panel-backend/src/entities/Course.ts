import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { CourseContent } from './CourseContent';
import { CourseLink } from './CourseLink';

@Entity('courses')
export class Course {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  title!: string;

  @Column('text')
  description!: string;

  @Column('int', { default: 0 })
  order!: number;

  @OneToMany(() => CourseContent, content => content.course, { cascade: true })
  contents!: CourseContent[];

  @OneToMany(() => CourseLink, link => link.course, { cascade: true })
  links!: CourseLink[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

