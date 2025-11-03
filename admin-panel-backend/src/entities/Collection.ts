import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, ManyToMany, JoinTable, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from './User';
import { Property } from './Property';

@Entity('collections')
export class Collection {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  userId!: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column()
  name!: string;

  @Column('text', { nullable: true })
  description?: string;

  @ManyToMany(() => Property)
  @JoinTable({
    name: 'collection_properties',
    joinColumn: { name: 'collectionId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'propertyId', referencedColumnName: 'id' },
  })
  properties!: Property[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

