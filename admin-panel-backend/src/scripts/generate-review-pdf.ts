import { AppDataSource } from '../config/database';
import { PortfolioItem } from '../entities/PortfolioItem';
import { User } from '../entities/User';
import { PdfService } from '../services/pdf.service';
import * as fs from 'fs';
import * as path from 'path';
import { entities } from '../entities/index';

async function generateTestPdf() {
    try {
        let item: any;

        // 1. Try DB Connection (optional for design review)
        try {
            if (!AppDataSource.isInitialized) {
                await AppDataSource.initialize();
            }
            console.log('Database connected');

            const user = await AppDataSource.getRepository(User).findOne({
                where: { email: 'short@gmail.com' }
            });

            if (user) {
                item = await AppDataSource.getRepository(PortfolioItem).findOne({
                    where: { userId: user.id },
                    relations: ['property', 'property.city', 'property.area']
                });
            } else {
                console.warn('User short@gmail.com not found in DB.');
            }
        } catch (dbError) {
            console.warn('⚠️ Could not connect to database (Docker/Local). Using mock data for design review.');
            // console.error(dbError); // Suppress full stack trace for cleaner output
        }

        // 2. Fallback to Mock Data if needed
        if (!item) {
            console.log('ℹ️ Using fallback data (John Doe / Iconic Tower)...');
            item = {
                id: '4124213-uuid-mock',
                unitName: '4124213',
                unitType: 'Townhouse',
                purchasePrice: 432134,
                estimatedSellingValue: 645348,
                annualCashFlow: 90212,
                size: 320,
                operationalStatus: 'RENTING OUT',
                advisorWhatsapp: '+971509998877',
                purchaseDate: '2024-01-15',
                plannedSaleDate: '12/2028',
                documents: [
                    { name: 'Trade License Renewal', description: 'PRO PART' }
                ],
                // Placeholder images that work (Unsplash)
                photos: ['https://images.unsplash.com/photo-1600596542815-2495db98dada?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'],
                property: {
                    name: 'Iconic Tower',
                    description: 'Luxury living in the heart of the city.',
                    city: { nameEn: 'Dubai' },
                    area: { nameEn: 'Downtown Dubai' },
                    photos: [
                        'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
                        'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
                    ]
                }
            };
        }

        console.log('Using portfolio item:', item.unitName || item.id);
        console.log('Generating PDF...');

        const purchasePrice = Number(item.purchasePrice) || 0;
        const currentValuation = Number(item.estimatedSellingValue) || 0;
        const annualCashFlow = Number(item.annualCashFlow) || 0;

        const appreciation = purchasePrice > 0
            ? parseFloat(((currentValuation - purchasePrice) / purchasePrice * 100).toFixed(2))
            : 0;

        const roi = purchasePrice > 0
            ? parseFloat((annualCashFlow / purchasePrice * 100).toFixed(2))
            : 0;

        const enrichedItem = {
            ...item,
            appreciation,
            roi
        };

        const pdfService = new PdfService();
        const pdfBuffer = await pdfService.generatePortfolioAnalytics(enrichedItem);

        const outputPath = path.join(process.cwd(), 'portfolio_design_review.pdf');
        fs.writeFileSync(outputPath, pdfBuffer);

        console.log(`✅ PDF generated successfully: ${outputPath}`);
        console.log('You can now open this file to review the design.');
        process.exit(0);

    } catch (error) {
        console.error('Portfolio PDF Generation Error:', error);
        process.exit(1);
    }
}

generateTestPdf();
