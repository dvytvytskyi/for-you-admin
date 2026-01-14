import express from 'express';
import axios from 'axios';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const router = express.Router();

const CACHE_DIR = path.join(process.cwd(), '.cache', 'images');

// Ensure cache directory exists
if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
}

router.get('/', async (req, res) => {
    try {
        const { url, width, height, quality } = req.query;

        // Validation
        if (!url || typeof url !== 'string') {
            return res.status(400).send('Missing "url" parameter');
        }

        // Security: Whitelist domains to prevent open proxy abuse
        const allowedDomains = [
            'nbg1.your-objectstorage.com',
            'drive.google.com',
            'googleusercontent.com',
            'files.alnair.ae',
            'reelly.io'
        ];

        try {
            const parsedUrl = new URL(url);
            if (!allowedDomains.some(d => parsedUrl.hostname.includes(d))) {
                // If strictly blocking, uncomment below. For now, warn.
                // return res.status(403).send('Domain not allowed');
            }
        } catch (e) {
            return res.status(400).send('Invalid URL');
        }

        const w = width ? parseInt(width as string) : undefined;
        const h = height ? parseInt(height as string) : undefined;
        const q = quality ? parseInt(quality as string) : 80;

        // Generate Cache Key
        const hash = crypto.createHash('md5')
            .update(`${url}-${w}-${h}-${q}`)
            .digest('hex');
        const cacheFile = path.join(CACHE_DIR, `${hash}.jpg`); // Assume Output JPG for now

        // 1. Check Cache
        if (fs.existsSync(cacheFile)) {
            // Check if file is valid/not empty
            const stats = fs.statSync(cacheFile);
            if (stats.size > 0) {
                // Serve from Cache
                res.setHeader('Content-Type', 'image/jpeg');
                res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
                res.setHeader('X-Cache', 'HIT');
                fs.createReadStream(cacheFile).pipe(res);
                return;
            }
        }

        // 2. Process Image
        try {
            const response = await axios({
                url,
                responseType: 'arraybuffer',
                timeout: 15000
            });

            let transform = sharp(response.data);

            if (w || h) {
                transform = transform.resize(w, h, {
                    fit: 'inside', // maintain aspect ratio, fit within box
                    withoutEnlargement: true
                });
            }

            // Convert to JPEG with quality
            transform = transform.jpeg({ quality: q, mozjpeg: true });

            const buffer = await transform.toBuffer();

            // 3. Save to Cache
            fs.writeFileSync(cacheFile, buffer);

            // 4. Serve
            res.setHeader('Content-Type', 'image/jpeg');
            // Crucial: Cache-Control for Browser
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
            res.setHeader('X-Cache', 'MISS');

            res.send(buffer);

        } catch (imgError: any) {
            console.error('Image processing error:', imgError.message, url);
            res.status(502).send('Failed to process image');
        }

    } catch (error) {
        console.error('Smart CDN Error:', error);
        res.status(500).send('Internal Server Error');
    }
});

export default router;
