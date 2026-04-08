import 'reflect-metadata';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { AppDataSource } from '../config/database';

dotenv.config();

type AreaContentEntry = {
  slug?: string;
  nameEn?: string;
  content?: {
    generalInformation?: {
      en?: string;
      ru?: string;
    };
    quickAccessDescription?: {
      en?: string;
      ru?: string;
    };
  };
};

type Options = {
  filePath: string;
  dryRun: boolean;
};

const MIN_CHARS = 1100;
const MAX_CHARS = 1800;

function parseArgs(argv: string[]): Options {
  const fileArg = argv.find((arg) => arg.startsWith('--file='));
  return {
    filePath: fileArg ? fileArg.slice('--file='.length) : path.resolve(process.cwd(), '..', 'areas.json'),
    dryRun: argv.includes('--dry-run')
  };
}

function textLength(value: string | undefined): number {
  return (value || '').trim().length;
}

function validateLength(field: string, value: string | undefined): string | null {
  const len = textLength(value);
  if (len < MIN_CHARS || len > MAX_CHARS) {
    return `${field} length ${len} is out of range ${MIN_CHARS}-${MAX_CHARS}`;
  }
  return null;
}

function parseAreasJson(raw: string): AreaContentEntry[] {
  const trimmed = raw.trim();

  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // fallback below
  }

  const withoutTrailingComma = trimmed.replace(/,\s*$/, '');
  const wrapped = `[${withoutTrailingComma}]`;
  const parsedFallback = JSON.parse(wrapped);

  if (!Array.isArray(parsedFallback)) {
    throw new Error('areas.json must be an array or a comma-separated list of JSON objects');
  }

  return parsedFallback;
}

async function ensureColumns(): Promise<void> {
  await AppDataSource.query(`
    ALTER TABLE areas
      ADD COLUMN IF NOT EXISTS content_general_information_en TEXT,
      ADD COLUMN IF NOT EXISTS content_general_information_ru TEXT,
      ADD COLUMN IF NOT EXISTS content_quick_access_description_en TEXT,
      ADD COLUMN IF NOT EXISTS content_quick_access_description_ru TEXT;
  `);
}

async function run(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const absoluteFile = path.isAbsolute(options.filePath)
    ? options.filePath
    : path.resolve(process.cwd(), options.filePath);

  if (!fs.existsSync(absoluteFile)) {
    throw new Error(`File not found: ${absoluteFile}`);
  }

  const raw = fs.readFileSync(absoluteFile, 'utf8');
  const entries = parseAreasJson(raw);

  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }

  await ensureColumns();

  let valid = 0;
  let updated = 0;
  let missing = 0;
  let invalid = 0;

  for (const entry of entries) {
    const ge = entry.content?.generalInformation?.en;
    const gr = entry.content?.generalInformation?.ru;
    const qe = entry.content?.quickAccessDescription?.en;
    const qr = entry.content?.quickAccessDescription?.ru;

    const errors = [
      validateLength('content.generalInformation.en', ge),
      validateLength('content.generalInformation.ru', gr),
      validateLength('content.quickAccessDescription.en', qe),
      validateLength('content.quickAccessDescription.ru', qr)
    ].filter(Boolean) as string[];

    const key = entry.slug || entry.nameEn || 'unknown';

    if (errors.length > 0) {
      invalid += 1;
      console.warn(`INVALID ${key}: ${errors.join('; ')}`);
      continue;
    }

    valid += 1;

    let result: any[] = [];

    if (options.dryRun) {
      result = await AppDataSource.query(
        `
          SELECT id, slug, "nameEn"
          FROM areas
          WHERE
            ($1::text IS NOT NULL AND slug = $1)
            OR
            ($1::text IS NULL AND $2::text IS NOT NULL AND "nameEn" = $2)
          LIMIT 1
        `,
        [entry.slug || null, entry.nameEn || null]
      );
    } else {
      result = await AppDataSource.query(
        `
          UPDATE areas
          SET
            content_general_information_en = $1,
            content_general_information_ru = $2,
            content_quick_access_description_en = $3,
            content_quick_access_description_ru = $4
          WHERE
            ($5::text IS NOT NULL AND slug = $5)
            OR
            ($5::text IS NULL AND $6::text IS NOT NULL AND "nameEn" = $6)
          RETURNING id, slug, "nameEn"
        `,
        [
          (ge || '').trim(),
          (gr || '').trim(),
          (qe || '').trim(),
          (qr || '').trim(),
          entry.slug || null,
          entry.nameEn || null
        ]
      );
    }

    if (result.length === 0) {
      missing += 1;
      console.warn(`MISSING ${key}: no area found by slug/nameEn`);
      continue;
    }

    if (options.dryRun) {
      console.log(`VALID ${result[0].nameEn} (${result[0].slug || 'no-slug'})`);
    } else {
      updated += result.length;
      console.log(`UPDATED ${result[0].nameEn} (${result[0].slug || 'no-slug'})`);
    }
  }

  console.log('================================================');
  console.log(`File: ${absoluteFile}`);
  console.log(`Total entries: ${entries.length}`);
  console.log(`Valid entries: ${valid}`);
  console.log(`Invalid entries: ${invalid}`);
  console.log(`Missing in DB: ${missing}`);
  console.log(`Updated rows: ${options.dryRun ? 0 : updated}`);
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
