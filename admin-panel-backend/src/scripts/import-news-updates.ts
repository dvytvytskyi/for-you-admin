import 'reflect-metadata';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { AppDataSource } from '../config/database';

dotenv.config();

type NewsContentInput = {
  order: number;
  type?: 'text' | 'image' | 'video';
  title?: string;
  titleRu?: string;
  description?: string;
  descriptionRu?: string;
};

type NewsUpdateInput = {
  slug: string;
  title?: string;
  titleRu?: string;
  description?: string;
  descriptionRu?: string;
  seoTitle?: string;
  seoDescription?: string;
  contents?: NewsContentInput[];
};

type Options = {
  filePath: string;
  dryRun: boolean;
};

function parseArgs(argv: string[]): Options {
  const fileArg = argv.find((arg) => arg.startsWith('--file='));
  return {
    filePath: fileArg ? fileArg.slice('--file='.length) : path.resolve(process.cwd(), '..', 'news_up.json'),
    dryRun: argv.includes('--dry-run')
  };
}

function parseInput(raw: string): NewsUpdateInput[] {
  const trimmed = raw.trim();

  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    if (parsed && typeof parsed === 'object') {
      return [parsed as NewsUpdateInput];
    }
  } catch {
    // fallback below
  }

  const wrapped = `[${trimmed.replace(/,\s*$/, '')}]`;
  const parsedFallback = JSON.parse(wrapped);
  if (!Array.isArray(parsedFallback)) {
    throw new Error('news_up.json must be a JSON array or a comma-separated list of JSON objects');
  }
  return parsedFallback as NewsUpdateInput[];
}

function cleanText(value?: string): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.replace(/\r\n/g, '\n').trim();
  return normalized.length > 0 ? normalized : null;
}

function stripAnchors(value: string | null): string | null {
  if (!value) return null;
  return value.replace(/<a\s+[^>]*>(.*?)<\/a>/gi, '$1').trim();
}

async function run(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const absolutePath = path.isAbsolute(options.filePath)
    ? options.filePath
    : path.resolve(process.cwd(), options.filePath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Input file not found: ${absolutePath}`);
  }

  const updates = parseInput(fs.readFileSync(absolutePath, 'utf8'));

  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }

  let found = 0;
  let missing = 0;
  let updatedNews = 0;
  let updatedContentRows = 0;
  let insertedContentRows = 0;

  for (const item of updates) {
    const slug = (item.slug || '').trim();
    if (!slug) {
      console.warn('SKIP item without slug');
      continue;
    }

    const newsRows = await AppDataSource.query(
      'SELECT id, slug FROM news WHERE slug = $1 LIMIT 1',
      [slug]
    );

    if (newsRows.length === 0) {
      missing += 1;
      console.warn(`MISSING slug=${slug}`);
      continue;
    }

    found += 1;
    const newsId = newsRows[0].id as string;

    const title = stripAnchors(cleanText(item.title));
    const titleRu = stripAnchors(cleanText(item.titleRu));
    const description = stripAnchors(cleanText(item.description));
    const descriptionRu = stripAnchors(cleanText(item.descriptionRu));
    const seoTitle = stripAnchors(cleanText(item.seoTitle));
    const seoDescription = stripAnchors(cleanText(item.seoDescription));

    if (options.dryRun) {
      console.log(`DRY-RUN NEWS slug=${slug}`);
    } else {
      await AppDataSource.query(
        `
          UPDATE news
          SET
            title = COALESCE($1, title),
            "titleRu" = COALESCE($2, "titleRu"),
            description = COALESCE($3, description),
            "descriptionRu" = COALESCE($4, "descriptionRu"),
            "seoTitle" = COALESCE($5, "seoTitle"),
            "seoDescription" = COALESCE($6, "seoDescription"),
            "updatedAt" = NOW()
          WHERE id = $7
        `,
        [title, titleRu, description, descriptionRu, seoTitle, seoDescription, newsId]
      );
      updatedNews += 1;
      console.log(`UPDATED NEWS slug=${slug}`);
    }

    const contents = Array.isArray(item.contents) ? item.contents : [];
    for (const block of contents) {
      const order = Number(block.order);
      if (!Number.isFinite(order)) continue;

      const type = (block.type || 'text').toLowerCase();
      if (type !== 'text') {
        continue;
      }

      const blockTitle = stripAnchors(cleanText(block.title));
      const blockTitleRu = stripAnchors(cleanText(block.titleRu));
      const blockDescription = stripAnchors(cleanText(block.description));
      const blockDescriptionRu = stripAnchors(cleanText(block.descriptionRu));

      const existing = await AppDataSource.query(
        `
          SELECT id
          FROM news_contents
          WHERE "newsId" = $1 AND "order" = $2
          ORDER BY "createdAt" ASC
          LIMIT 1
        `,
        [newsId, order]
      );

      if (options.dryRun) {
        if (existing.length > 0) {
          console.log(`  DRY-RUN CONTENT update slug=${slug} order=${order}`);
        } else {
          console.log(`  DRY-RUN CONTENT insert slug=${slug} order=${order}`);
        }
        continue;
      }

      if (existing.length > 0) {
        await AppDataSource.query(
          `
            UPDATE news_contents
            SET
              type = 'text',
              title = COALESCE($1, title),
              "titleRu" = COALESCE($2, "titleRu"),
              description = COALESCE($3, description),
              "descriptionRu" = COALESCE($4, "descriptionRu")
            WHERE id = $5
          `,
          [blockTitle, blockTitleRu, blockDescription, blockDescriptionRu, existing[0].id]
        );
        updatedContentRows += 1;
      } else {
        await AppDataSource.query(
          `
            INSERT INTO news_contents (
              id,
              "newsId",
              type,
              title,
              "titleRu",
              description,
              "descriptionRu",
              "imageUrl",
              "videoUrl",
              "order"
            ) VALUES (
              gen_random_uuid(),
              $1,
              'text',
              COALESCE($2, ''),
              $3,
              $4,
              $5,
              NULL,
              NULL,
              $6
            )
          `,
          [newsId, blockTitle, blockTitleRu, blockDescription, blockDescriptionRu, order]
        );
        insertedContentRows += 1;
      }
    }
  }

  console.log('================================================');
  console.log(`File: ${absolutePath}`);
  console.log(`Items in file: ${updates.length}`);
  console.log(`Matched by slug: ${found}`);
  console.log(`Missing slugs: ${missing}`);
  console.log(`News rows updated: ${options.dryRun ? 0 : updatedNews}`);
  console.log(`News content rows updated: ${options.dryRun ? 0 : updatedContentRows}`);
  console.log(`News content rows inserted: ${options.dryRun ? 0 : insertedContentRows}`);
  console.log(`Mode: ${options.dryRun ? 'DRY-RUN' : 'LIVE'}`);
  console.log('================================================');

  await AppDataSource.destroy();
}

run().catch(async (error: any) => {
  console.error('Import failed:', error.message);
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
  }
  process.exit(1);
});
