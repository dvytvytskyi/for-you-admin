import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('user_sessions')
export class UserSession {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ unique: true })
    referenceId!: string;

    @Column({ nullable: true })
    utmSource?: string;

    @Column({ nullable: true })
    utmMedium?: string;

    @Column({ nullable: true })
    utmCampaign?: string;

    @Column({ nullable: true })
    referrer?: string;

    @Column({ nullable: true })
    locale?: string;

    @Column({ nullable: true })
    userAgent?: string;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
}
