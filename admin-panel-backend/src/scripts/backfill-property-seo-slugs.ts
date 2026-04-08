import 'reflect-metadata';
import * as dotenv from 'dotenv';
import { AppDataSource } from '../config/database';

dotenv.config();

type Options = {
  live: boolean;
  limit?: number;
  offset: number;
};

type PropertyRow = {
  id: string;
  name: string | null;
  slug: string | null;
  propertyType: string | null;
  bedrooms: number | null;
  bedroomsFrom: number | null;
  bedroomsTo: number | null;
  buildingName: string | null;
  communityName: string | null;
  areaName: string | null;
};

function parseArgs(argv: string[]): Options {
  const limitArg = argv.find((arg) => arg.startsWith('--limit='));
  const offsetArg = argv.find((arg) => arg.startsWith('--offset='));

  const limit = limitArg ? Number(limitArg.slice('--limit='.length)) : undefined;
  const offset = offsetArg ? Number(offsetArg.slice('--offset='.length)) : 0;

  return {
    live: argv.includes('--live'),
    limit: Number.isFinite(limit) && (limit as number) > 0 ? (limit as number) : undefined,
    offset: Number.isFinite(offset) && offset >= 0 ? offset : 0
  };
}

function slugifySafe(value: string | null | undefined): string {
  if (!value) return '';
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function inferPropertyKind(name: string, propertyType: string): string {
  const n = name.toLowerCase();
  if (n.includes('villa')) return 'villa';
  if (n.includes('townhouse')) return 'townhouse';
  if (n.includes('penthouse')) return 'penthouse';
  if (n.includes('studio')) return 'studio';
  if (n.includes('office')) return 'office';
  if (n.includes('plot') || n.includes('land')) return 'plot';
  if (n.includes('duplex')) return 'duplex';
  if (n.includes('apartment') || n.includes('residence') || n.includes('flat')) return 'apartment';

  if (propertyType === 'secondary') return 'property';
  return 'apartment';
}

function bedroomPart(row: PropertyRow, kind: string): string {
  const from = row.bedroomsFrom;
  const to = row.bedroomsTo;
  const exact = row.bedrooms;

  const primary = typeof from === 'number' ? from : exact;

  if (kind === 'studio' || primary === 0) {
    return 'studio';
  }

  if (typeof from === 'number' && typeof to === 'number' && from > 0 && to > 0) {
    if (from === to) return `${from}-bedroom`;
    return `${from}-${to}-bedroom`;
  }

  if (typeof primary === 'number' && primary > 0) {
    return `${primary}-bedroom`;
  }

  return '';
}

function dedupeParts(parts: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();

  for (const part of parts) {
    if (!part) continue;
    if (seen.has(part)) continue;
    seen.add(part);
    out.push(part);
  }

  return out;
}

function buildSeoSlug(row: PropertyRow): string {
  const idSuffix = row.id.slice(0, 8).toLowerCase();
  const name = row.name || '';
  const type = (row.propertyType || '').toLowerCase();

  const kind = inferPropertyKind(name, type);
  const bed = bedroomPart(row, kind);
  const area = slugifySafe(row.areaName || 'dubai');
  const project = slugifySafe(row.buildingName || row.communityName || row.name || 'property');

  const baseParts = dedupeParts([bed, kind, area, project]);
  let base = baseParts.join('-');

  if (!base) {
    base = 'property';
  }

  const maxBaseLen = 255 - 1 - idSuffix.length;
  if (base.length > maxBaseLen) {
    base = base.slice(0, maxBaseLen).replace(/-+$/g, '');
  }

  return `${base}-${idSuffix}`;
}

async function fetchRows(offset: number, limit?: number): Promise<PropertyRow[]> {
  const baseSql = `
    SELECT
      p.id,
      p.name,
      p.slug,
      p."propertyType" AS "propertyType",
      p.bedrooms,
      p."bedroomsFrom" AS "bedroomsFrom",
      p."bedroomsTo" AS "bedroomsTo",
      p."buildingname" AS "buildingName",
      p."communityname" AS "communityName",
      a."nameEn" AS "areaName"
    FROM properties p
    LEFT JOIN areas a ON a.id = p."areaId"
    ORDER BY p."createdAt" ASC
  `;

  if (typeof limit === 'number') {
    return AppDataSource.query(`${baseSql} OFFSET $1 LIMIT $2`, [offset, limit]) as Promise<PropertyRow[]>;
  }

  return AppDataSource.query(`${baseSql} OFFSET $1`, [offset]) as Promise<PropertyRow[]>;
}

async function updateSlug(id: string, slug: string): Promise<void> {
  await AppDataSource.query(
    `
      UPDATE properties
      SET slug = $1,
          "updatedAt" = NOW()
      WHERE id = $2
    `,
    [slug, id]
  );
}

async function run(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));

  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }

  const rows = await fetchRows(options.offset, options.limit);

  console.log('================================================');
  console.log('PROPERTY SEO SLUG BACKFILL');
  console.log(`Mode: ${options.live ? 'LIVE' : 'DRY-RUN'}`);
  console.log(`Rows in window: ${rows.length}`);
  console.log('================================================');

  let changed = 0;

  for (const row of rows) {
    const nextSlug = buildSeoSlug(row);
    const currentSlug = (row.slug || '').trim();

    if (currentSlug === nextSlug) {
      continue;
    }

    changed += 1;

    if (options.live) {
      await updateSlug(row.id, nextSlug);
      console.log(`UPDATED ${row.id} -> ${nextSlug}`);
    } else {
      console.log(`DRY-RUN ${row.id} | old=${currentSlug || 'null'} | new=${nextSlug}`);
    }
  }

  console.log('================================================');
  console.log(`Changed: ${changed}`);
  console.log(`Unchanged: ${rows.length - changed}`);
  console.log(`Mode: ${options.live ? 'LIVE' : 'DRY-RUN'}`);
  console.log('================================================');

  await AppDataSource.destroy();
}

run().catch(async (error: any) => {
  console.error('Slug backfill failed:', error.message);
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
  }
  process.exit(1);
});
