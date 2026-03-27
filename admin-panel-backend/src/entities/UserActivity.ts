import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { UserSession } from './UserSession';

@Entity('user_activities')
export class UserActivity {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column('uuid')
    sessionId!: string;

    @ManyToOne(() => UserSession)
    @JoinColumn({ name: 'sessionId' })
    session!: UserSession;

    @Column()
    referenceId!: string;

    @Column()
    action!: string;

    @Column({ nullable: true })
    propertyId?: string;

    @Column({ nullable: true })
    url?: string;

    @CreateDateColumn()
    createdAt!: Date;
}
