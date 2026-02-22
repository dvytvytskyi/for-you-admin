import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './User';

@Entity('user_blocks')
export class UserBlock {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ name: 'user_id' })
    userId!: string;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'user_id' })
    user!: User;

    @Column({ name: 'blocked_user_id' })
    blockedUserId!: string;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'blocked_user_id' })
    blockedUser!: User;

    @CreateDateColumn({ name: 'created_at' })
    createdAt!: Date;
}
