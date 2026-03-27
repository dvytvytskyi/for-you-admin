import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('property_finder_projects')
export class PropertyFinderProject {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  pfId!: string;

  @Column({ type: 'varchar', length: 20, default: 'sale' })
  offeringType!: string;

  @Column({ type: 'jsonb', nullable: true })
  title!: any;

  @Column({ type: 'jsonb', nullable: true })
  developer!: any;

  @Column({ type: 'jsonb', nullable: true })
  location!: any;

  @Column({ nullable: true })
  dldId!: string;

  @Column({ nullable: true })
  startingPrice!: string;

  @Column({ nullable: true })
  coverImage!: string;

  @Column({ type: 'jsonb', nullable: true })
  fullData!: any;

  @Column({ type: 'jsonb', nullable: true, default: '[]' })
  units!: any[];

  @Column({ type: 'timestamp', nullable: true })
  lastSyncAt!: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
