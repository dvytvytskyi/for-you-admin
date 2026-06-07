import express from 'express';
import { AppDataSource } from '../config/database';
import { News } from '../entities/News';

const router = express.Router();

const SITE_BASE_URL = process.env.SITE_BASE_URL || 'https://foryou-realestate.com';

// Static high-priority pages
const STATIC_PAGES = [
  { loc: '/',                   priority: '1.0', changefreq: 'daily'   },
  { loc: '/properties',         priority: '0.9', changefreq: 'daily'   },
  { loc: '/off-plan',           priority: '0.9', changefreq: 'daily'   },
  { loc: '/news',               priority: '0.8', changefreq: 'daily'   },
  { loc: '/about',              priority: '0.6', changefreq: 'monthly' },
  { loc: '/contact',            priority: '0.6', changefreq: 'monthly' },
];

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

router.get('/sitemap.xml', async (req, res) => {
  try {
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600'); // cache 1h

    const newsRepo = AppDataSource.getRepository(News);
    const publishedNews = await newsRepo.find({
      where: { isPublished: true },
      order: { publishedAt: 'DESC' },
      select: ['slug', 'publishedAt', 'updatedAt'],
    });

    const now = new Date().toISOString();

    const staticEntries = STATIC_PAGES.map(
      (p) => `
  <url>
    <loc>${escapeXml(SITE_BASE_URL + p.loc)}</loc>
    <lastmod>${now.slice(0, 10)}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`
    ).join('');

    const newsEntries = publishedNews.map((n) => {
      const lastmod = (n.publishedAt || n.updatedAt || new Date()).toISOString().slice(0, 10);
      return `
  <url>
    <loc>${escapeXml(`${SITE_BASE_URL}/news/${n.slug}`)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`;
    }).join('');

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticEntries}
${newsEntries}
</urlset>`;

    res.send(xml);
  } catch (err: any) {
    console.error('[Sitemap] Error generating sitemap:', err?.message || err);
    res.status(500).send('<?xml version="1.0"?><error>Sitemap generation failed</error>');
  }
});

export default router;
