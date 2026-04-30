import { DataSource } from 'typeorm';
import { Property } from '../entities/Property';
import { entities } from '../entities';
import { PdfService } from '../services/pdf.service';
import fs from 'fs';
import path from 'path';

async function generateTestPdf() {
    const ds = new DataSource({
        type: 'postgres',
        host: '127.0.0.1',
        port: 5432,
        username: 'postgres',
        password: process.env.DB_PASS ?? '',
        database: 'admin_panel_propart',
        entities: entities,
        synchronize: false,
        logging: false,
    });

    try {
        await ds.initialize();
        console.log('✅ Connected to database');

        const propertyRepo = ds.getRepository(Property);
        // Fetch a property that definitely has images and details
        const property = await propertyRepo.findOne({
            where: { propertyType: 'off-plan' as any }, // Cast to any to avoid strict enum issues in script
            relations: ['country', 'city', 'area', 'developer', 'facilities', 'units'],
            order: { createdAt: 'DESC' }
        });

        if (!property) {
            console.error('❌ No off-plan property found to test with.');
            return;
        }

        console.log(`Using property: ${property.name} (${property.id})`);

        // Prepare data (mimic the route logic)
        let areaName = property.area?.nameEn || '';
        if (property.area && property.propertyType === 'off-plan' && property.city) {
            areaName = `${property.area.nameEn}, ${property.city.nameEn}`;
        }
        if (property.photos && property.photos.length > 0) {
            while (property.photos.length < 25) {
                property.photos = [...property.photos, ...property.photos].slice(0, 25);
            }
        }

        const presentationData = {
            ...property,
            area: areaName,
            city: property.city?.nameEn || '',
            developer: property.developer?.name || '',
            type: property.propertyType,
            // Fix paymentPlan / completion logic
            completion: property.propertyType === 'secondary' ? 'Ready' : (property.paymentPlan ? property.paymentPlan : 'Off-Plan'),
            price: property.price ? `$${Number(property.price).toLocaleString()}` : null,
            priceFrom: property.priceFrom ? `$${Number(property.priceFrom).toLocaleString()}` : null,
            size: property.size ? Number(property.size).toLocaleString() : null,
            sizeFrom: property.sizeFrom ? Number(property.sizeFrom).toLocaleString() : null,
            sizeTo: property.sizeTo ? Number(property.sizeTo).toLocaleString() : null,
            facilities: property.facilities || []
        };

        console.log('Generating PDF...');
        const agent = {
            name: 'Sarah Miller',
            phone: '+971 50 999 8877',
            email: 'sarah@foryou.ae',
            photo: 'https://ui-avatars.com/api/?name=Sarah+Miller&background=D4AF37&color=fff&size=200'
        };

        const pdfService = new PdfService();
        console.log('Generating PDF with Agent info...');
        const pdfBuffer = await pdfService.generatePropertyPresentation(presentationData, agent);

        const outputPath = path.join(process.cwd(), 'test-presentation.pdf');
        fs.writeFileSync(outputPath, pdfBuffer);

        console.log(`✅ PDF saved to: ${outputPath}`);
        console.log('You can now open this file to verify the design.');

        await ds.destroy();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

generateTestPdf();
