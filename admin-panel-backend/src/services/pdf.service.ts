import puppeteer from 'puppeteer';
import ejs from 'ejs';
import path from 'path';
import fs from 'fs';

export class PdfService {
    /**
     * Generates a PDF presentation for a property.
     * @param property The property data (normalized object)
     * @returns Buffer containing the PDF data
     */
    async generatePropertyPresentation(property: any, agent?: any): Promise<Buffer> {
        try {
            // 1. Locate and read template
            // In prod: dist/services/../templates/presentation.ejs -> dist/templates/presentation.ejs
            const templatePath = path.join(__dirname, '../templates/presentation.ejs');

            if (!fs.existsSync(templatePath)) {
                throw new Error(`Template not found at ${templatePath}. Make sure to copy templates to dist folder.`);
            }

            const template = fs.readFileSync(templatePath, 'utf-8');

            // 1.5 Generate Mapbox Static URL
            let mapUrl = null;
            if (property.latitude && property.longitude) {
                const mapboxToken = 'pk.eyJ1IjoiYWJpZXNwYW5hIiwiYSI6ImNsb3N4NzllYzAyOWYybWw5ZzNpNXlqaHkifQ.UxlTvUuSq9L5jt0jRtRR-A';
                // const styleId = 'abiespana/cm905i58m006w01r4ala55087'; // Custom style causing issues?
                const styleId = 'mapbox/light-v11'; // Standard light style
                const lon = property.longitude;
                const lat = property.latitude;
                const zoom = 13;
                const width = 1280;
                const height = 720;

                // Construct URL
                // Format: https://api.mapbox.com/styles/v1/{username}/{style_id}/static/{overlay}/{lon},{lat},{zoom},0/{width}x{height}?access_token={token}
                // Overlay: pin-s+D4AF37({lon},{lat}) -> Small pin with brand gold color
                mapUrl = `https://api.mapbox.com/styles/v1/${styleId}/static/pin-s+D4AF37(${lon},${lat})/${lon},${lat},${zoom},0/${width}x${height}@2x?access_token=${mapboxToken}`;
                console.log('Generated Mapbox URL:', mapUrl);
            }

            // 2. Render HTML with EJS
            const html = ejs.render(template, { property, mapUrl, agent });

            // 3. Launch Puppeteer
            // Note: In Docker (Alpine), we use the installed Chromium. Locally, it uses downloaded Chrome.
            const browser = await puppeteer.launch({
                headless: true,
                executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage', // Important for Docker's limited shared memory
                    '--font-render-hinting=none' // Better font rendering consistency
                ]
            });

            try {
                const page = await browser.newPage();

                // Optimize for print
                await page.emulateMediaType('print');

                // Set content and wait for network (images)
                await page.setContent(html, {
                    waitUntil: ['domcontentloaded', 'networkidle0'],
                    timeout: 30000
                });

                // Generate PDF
                const pdf = await page.pdf({
                    format: 'A4',
                    landscape: true,
                    printBackground: true,
                    margin: { top: '0', right: '0', bottom: '0', left: '0' },
                    preferCSSPageSize: true
                });

                return Buffer.from(pdf);

            } finally {
                await browser.close();
            }
        } catch (error) {
            console.error('PDF Generation Error:', error);
            throw error;
        }
    }
}
