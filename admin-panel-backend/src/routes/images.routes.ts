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

function sanitizeCandidateUrl(input: string): string {
    let value = (input || '').trim();

    // Remove common import artifacts from broken JSON values.
    value = value
        .replace(/\\"\}\s*$/, '')
        .replace(/"\}\s*$/, '')
        .replace(/\\+\s*$/, '')
        .trim();

    // Unwrap nested /api/images?url=... values if they appear.
    for (let i = 0; i < 3; i++) {
        const nestedMatch = value.match(/\/api\/images\?url=([^&\s]+)/i);
        if (!nestedMatch) break;
        try {
            value = decodeURIComponent(nestedMatch[1]);
        } catch {
            value = nestedMatch[1];
        }
    }

    // Decode percent-encoding if URL arrived already encoded.
    for (let i = 0; i < 3; i++) {
        if (!/^https?%3A/i.test(value)) break;
        try {
            value = decodeURIComponent(value);
        } catch {
            break;
        }
    }

    return value;
}

function escapeXml(value: string) {
        return value.replace(/[&<>"']/g, (char) => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&apos;'
        }[char] || char));
}

function wrapTitle(title: string) {
        const words = title.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
        const lines: string[] = [];
        let current = '';

        for (const word of words) {
                const next = current ? `${current} ${word}` : word;
                if (next.length > 24 && current) {
                        lines.push(current);
                        current = word;
                } else {
                        current = next;
                }

                if (lines.length === 3) break;
        }

        if (lines.length < 3 && current) {
                lines.push(current);
        }

        return lines.slice(0, 3);
}

function buildPlaceholderBuffer(title?: string) {
        const lines = wrapTitle(title || 'FOR YOU Real Estate');
        const tspanMarkup = lines
                .map((line, index) => `<tspan x="88" dy="${index === 0 ? 0 : 54}">${escapeXml(line)}</tspan>`)
                .join('');

        const svg = `
            <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
                <defs>
                    <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
                        <stop offset="0%" stop-color="#0f172a" />
                        <stop offset="55%" stop-color="#0b4a6f" />
                        <stop offset="100%" stop-color="#0f766e" />
                    </linearGradient>
                    <linearGradient id="accent" x1="0" x2="1" y1="0" y2="0">
                        <stop offset="0%" stop-color="#f59e0b" />
                        <stop offset="100%" stop-color="#f97316" />
                    </linearGradient>
                </defs>
                <rect width="1200" height="630" fill="url(#bg)" />
                <circle cx="1025" cy="120" r="220" fill="#ffffff" opacity="0.08" />
                <circle cx="140" cy="560" r="180" fill="#ffffff" opacity="0.06" />
                <rect x="76" y="78" width="220" height="10" rx="5" fill="url(#accent)" />
                <text x="86" y="180" fill="#f8fafc" font-family="Arial, Helvetica, sans-serif" font-size="46" font-weight="700">FOR YOU Real Estate</text>
                <text x="88" y="290" fill="#e2e8f0" font-family="Arial, Helvetica, sans-serif" font-size="62" font-weight="800">${tspanMarkup}</text>
                <text x="88" y="540" fill="#cbd5e1" font-family="Arial, Helvetica, sans-serif" font-size="28">Dubai market insights and updates</text>
            </svg>
        `;

        return sharp(Buffer.from(svg)).jpeg({ quality: 88 }).toBuffer();
}

router.get('/', async (req, res) => {
    try {
        const { url, width, height, quality } = req.query;

        // Validation
        if (!url || typeof url !== 'string') {
            return res.status(400).send('Missing "url" parameter');
        }

        const normalizedSourceUrl = sanitizeCandidateUrl(url);
        if (!normalizedSourceUrl) {
            return res.status(400).send('Invalid URL');
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
            const parsedUrl = new URL(normalizedSourceUrl);
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
            .update(`${normalizedSourceUrl}-${w}-${h}-${q}`)
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
                url: normalizedSourceUrl,
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
            console.error('Image processing error:', imgError.message, normalizedSourceUrl);
            try {
                const placeholderBuffer = await buildPlaceholderBuffer(typeof req.query.title === 'string' ? req.query.title : undefined);
                fs.writeFileSync(cacheFile, placeholderBuffer);
                res.setHeader('Content-Type', 'image/jpeg');
                res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
                res.setHeader('X-Cache', 'MISS');
                res.send(placeholderBuffer);
            } catch (placeholderError: any) {
                console.error('Placeholder image error:', placeholderError.message);
                res.status(502).send('Failed to process image');
            }
        }

    } catch (error) {
        console.error('Smart CDN Error:', error);
        res.status(500).send('Internal Server Error');
    }
});

export default router;
