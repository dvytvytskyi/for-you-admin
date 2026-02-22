import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { VacancyRequest } from './VacancyRequest';

export enum VacancyStatus {
    PUBLISHED = 'published',
    PENDING = 'pending',
    WITHDRAWN = 'withdrawn',
}

@Entity('vacancies')
export class Vacancy {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ nullable: true })
    position_en!: string;

    @Column({ nullable: true })
    position_ru!: string;

    @Column('text', { nullable: true })
    shortDescription_en!: string;

    @Column('text', { nullable: true })
    shortDescription_ru!: string;

    @Column('text', { nullable: true })
    tasks_en!: string;

    @Column('text', { nullable: true })
    tasks_ru!: string;

    @Column('text', { nullable: true })
    requirements_en!: string;

    @Column('text', { nullable: true })
    requirements_ru!: string;

    @Column('text', { nullable: true })
    results_en!: string;

    @Column('text', { nullable: true })
    results_ru!: string;

    @Column('text', { nullable: true })
    offers_en!: string;

    @Column('text', { nullable: true })
    offers_ru!: string;

    // Keep original fields for compatibility (mapped in API)
    @Column({ nullable: true })
    position!: string;

    @Column('text', { nullable: true })
    shortDescription!: string;

    @Column('text', { nullable: true })
    tasks!: string;

    @Column('text', { nullable: true })
    requirements!: string;

    @Column('text', { nullable: true })
    results!: string;

    @Column('text', { nullable: true })
    offers!: string;

    @Column({
        type: 'enum',
        enum: VacancyStatus,
        default: VacancyStatus.PENDING,
    })
    status!: VacancyStatus;

    @Column({ default: 0 })
    viewsCount!: number;

    @Column({ default: 0 })
    applicationsCount!: number;

    @OneToMany(() => VacancyRequest, request => request.vacancy)
    requests!: VacancyRequest[];

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
}
