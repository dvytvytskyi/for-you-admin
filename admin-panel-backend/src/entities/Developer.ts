import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('developers')
export class Developer {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  name!: string;

  @Column({ nullable: true })
  logo!: string;

  @Column('text', { nullable: true })
  description!: string;

  @CreateDateColumn()
  createdAt!: Date;
}

