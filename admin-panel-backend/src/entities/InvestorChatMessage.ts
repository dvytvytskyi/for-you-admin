import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './User';
import { Property } from './Property';

export enum MessageType {
    TEXT = 'TEXT',
    IMAGE = 'IMAGE',
    FILE = 'FILE',
    PROJECT = 'PROJECT',
}

@Entity('investor_chat_messages')
export class InvestorChatMessage {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({
        type: 'enum',
        enum: MessageType,
        default: MessageType.TEXT,
    })
    type!: MessageType;

    @Column({ type: 'text', nullable: true })
    content?: string;

    @Column({ name: 'file_url', nullable: true })
    fileUrl?: string;

    @Column({ name: 'file_name', nullable: true })
    fileName?: string;

    @Column({ name: 'sender_id' })
    senderId!: string;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'sender_id' })
    sender!: User;

    @Column({ name: 'property_id', nullable: true })
    propertyId?: string;

    @ManyToOne(() => Property)
    @JoinColumn({ name: 'property_id' })
    property?: Property;

    @CreateDateColumn({ name: 'created_at' })
    createdAt!: Date;
}
