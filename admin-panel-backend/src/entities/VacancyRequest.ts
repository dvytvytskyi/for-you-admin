import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Vacancy } from './Vacancy';

@Entity('vacancy_requests')
export class VacancyRequest {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column('uuid')
    vacancyId!: string;

    @ManyToOne(() => Vacancy, vacancy => vacancy.requests)
    @JoinColumn({ name: 'vacancyId' })
    vacancy!: Vacancy;

    @Column()
    name!: string;

    @Column()
    email!: string;

    @Column({ nullable: true })
    phone!: string;

    @Column({ nullable: true })
    cvUrl!: string;

    @Column('text', { nullable: true })
    message!: string;

    @CreateDateColumn()
    createdAt!: Date;
}
