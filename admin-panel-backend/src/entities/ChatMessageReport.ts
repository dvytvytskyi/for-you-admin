import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './User';
import { InvestorChatMessage } from './InvestorChatMessage';

@Entity('chat_message_reports')
export class ChatMessageReport {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ name: 'message_id' })
    messageId!: string;

    @ManyToOne(() => InvestorChatMessage)
    @JoinColumn({ name: 'message_id' })
    message!: InvestorChatMessage;

    @Column({ name: 'reporter_id' })
    reporterId!: string;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'reporter_id' })
    reporter!: User;

    @Column({ type: 'text' })
    reason!: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt!: Date;
}
