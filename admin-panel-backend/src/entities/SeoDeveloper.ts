import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('seo_developers')
export class SeoDeveloper {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column()
    name!: string;

    @Column({ nullable: true })
    logoUrl?: string;

    @Column('text', { array: true, default: '{}' })
    photos!: string[];

    @Column('text', { nullable: true })
    description?: string;

    @Column('jsonb', { nullable: true })
    analyticalInfo?: any;

    @Column({ nullable: true })
    reellyId?: number;

    @Column({ nullable: true })
    developerId?: string;

    @Column({ nullable: true })
    slug?: string;

    @Column({ nullable: true })
    pfId?: number;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
}
