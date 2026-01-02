import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from './User';
import { Property } from './Property';

export enum OperationalStatus {
    UNDER_CONSTRUCTION = 'Under construction',
    WAITING_FOR_RENT_OUT = 'Waiting for rent out',
    RENTING_OUT = 'Renting out',
    PENDING_TO_BE_SOLD = 'Pending to be sold',
    EMPTY = 'Empty',
}

@Entity('portfolio_items')
export class PortfolioItem {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column('uuid')
    userId!: string;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'userId' })
    user!: User;

    @Column('uuid')
    propertyId!: string;

    @ManyToOne(() => Property)
    @JoinColumn({ name: 'propertyId' })
    property!: Property;

    // Unit details
    @Column({ nullable: true })
    unitId?: string;

    @Column({ nullable: true })
    unitName?: string;

    @Column({ nullable: true })
    unitType?: string;

    @Column('decimal', { precision: 15, scale: 2, default: 0 })
    purchasePrice!: number;

    @Column({ nullable: true })
    size?: string;

    @Column('text', { nullable: true })
    amenities?: string;

    @Column('text', { array: true, nullable: true })
    photos?: string[];

    @Column('text', { array: true, nullable: true, default: [] })
    floorPlans?: string[];

    // Operational status
    @Column({
        type: 'enum',
        enum: OperationalStatus,
        default: OperationalStatus.UNDER_CONSTRUCTION,
    })
    operationalStatus!: OperationalStatus;

    // Financials
    @Column('decimal', { precision: 15, scale: 2, default: 0 })
    annualCashFlow!: number; // Expected/actual income per year

    @Column('decimal', { precision: 15, scale: 2, default: 0 })
    estimatedSellingValue!: number;

    // Sales planning
    @Column({ nullable: true })
    purchaseDate?: string; // Format: "MM/YYYY"

    @Column({ nullable: true })
    plannedSaleDate?: string; // Format: "MM/YYYY"

    @Column({ nullable: true })
    advisorWhatsapp?: string;

    @Column('jsonb', { nullable: true, default: [] })
    documents?: { name: string; description: string; url: string }[];

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;

    // Virtual fields (can be calculated in repository or frontend)
    get roi(): number {
        if (this.purchasePrice === 0) return 0;
        return (this.annualCashFlow / this.purchasePrice) * 100;
    }

    get appreciation(): number {
        if (this.purchasePrice === 0) return 0;
        return ((this.estimatedSellingValue - this.purchasePrice) / this.purchasePrice) * 100;
    }
}
