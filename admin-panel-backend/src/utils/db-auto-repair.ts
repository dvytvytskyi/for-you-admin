import { AppDataSource } from '../config/database';

/**
 * Auto-repair utility — runs on every server startup.
 * Ensures all required columns exist in the DB and populates
 * missing data (slugs, mainImage, etc.).
 * Uses ADD COLUMN IF NOT EXISTS so it is idempotent and safe.
 */
export async function autoRepairDatabase(): Promise<void> {
  console.log('[Auto-Repair] 🛠️  Starting database self-healing check...');

  const queryRunner = AppDataSource.createQueryRunner();

  try {
    await queryRunner.connect();

    // ─── 1. Areas table ──────────────────────────────────────────
    console.log('[Auto-Repair] Checking "areas" table...');
    await queryRunner.query(`
      ALTER TABLE areas ADD COLUMN IF NOT EXISTS isactive     BOOLEAN          NOT NULL DEFAULT true;
      ALTER TABLE areas ADD COLUMN IF NOT EXISTS mainimage    CHARACTER VARYING;
      ALTER TABLE areas ADD COLUMN IF NOT EXISTS slug        CHARACTER VARYING;
      ALTER TABLE areas ADD COLUMN IF NOT EXISTS isfeatured   BOOLEAN          NOT NULL DEFAULT false;
      ALTER TABLE areas ADD COLUMN IF NOT EXISTS priority     INTEGER          NOT NULL DEFAULT 0;
    `);

    // Unique constraint on slug (ignore if already exists)
    try {
      await queryRunner.query(`ALTER TABLE areas ADD CONSTRAINT areas_slug_unique UNIQUE (slug);`);
    } catch (_) { /* constraint already exists — ok */ }

    // ─── 2. Properties table ──────────────────────────────────────
    console.log('[Auto-Repair] Checking "properties" table...');
    await queryRunner.query(`
      ALTER TABLE properties ADD COLUMN IF NOT EXISTS slug                CHARACTER VARYING;
      ALTER TABLE properties ADD COLUMN IF NOT EXISTS projectedroi        CHARACTER VARYING;
      ALTER TABLE properties ADD COLUMN IF NOT EXISTS isinvestorfeatured  BOOLEAN NOT NULL DEFAULT false;
      ALTER TABLE properties ADD COLUMN IF NOT EXISTS plannedcompletionat DATE;
      ALTER TABLE properties ADD COLUMN IF NOT EXISTS commission          CHARACTER VARYING;
    `);

    try {
      await queryRunner.query(`ALTER TABLE properties ADD CONSTRAINT properties_slug_unique UNIQUE (slug);`);
    } catch (_) { /* ok */ }

    // ─── 3. Vacancies table ───────────────────────────────────────
    console.log('[Auto-Repair] Checking "vacancies" table...');
    try {
      await queryRunner.query(`
        ALTER TABLE vacancies ADD COLUMN IF NOT EXISTS position_en          CHARACTER VARYING;
        ALTER TABLE vacancies ADD COLUMN IF NOT EXISTS position_ru          CHARACTER VARYING;
        ALTER TABLE vacancies ADD COLUMN IF NOT EXISTS "shortDescription_en" TEXT;
        ALTER TABLE vacancies ADD COLUMN IF NOT EXISTS "shortDescription_ru" TEXT;
        ALTER TABLE vacancies ADD COLUMN IF NOT EXISTS tasks_en             TEXT;
        ALTER TABLE vacancies ADD COLUMN IF NOT EXISTS tasks_ru             TEXT;
        ALTER TABLE vacancies ADD COLUMN IF NOT EXISTS requirements_en      TEXT;
        ALTER TABLE vacancies ADD COLUMN IF NOT EXISTS requirements_ru      TEXT;
        ALTER TABLE vacancies ADD COLUMN IF NOT EXISTS offers_en            TEXT;
        ALTER TABLE vacancies ADD COLUMN IF NOT EXISTS offers_ru            TEXT;
      `);
    } catch (_) { /* table may not exist yet */ }

    // ─── 4. Generate missing area slugs ──────────────────────────
    console.log('[Auto-Repair] Generating missing area slugs...');
    await queryRunner.query(`
      UPDATE areas
      SET slug = LOWER(
          REGEXP_REPLACE(
              REGEXP_REPLACE(TRIM("nameEn"), '[^a-zA-Z0-9 ]', '', 'g'),
              ' +', '-', 'g'
          )
      )
      WHERE slug IS NULL OR slug = '';
    `);

    // ─── 5. Fill missing mainImage for areas ─────────────────────
    console.log('[Auto-Repair] Filling missing area main images...');
    await queryRunner.query(`
      UPDATE areas a
      SET mainimage = (
          SELECT SPLIT_PART(p.photos, ',', 1)
          FROM properties p
          WHERE p."areaId" = a.id
            AND p.photos IS NOT NULL
            AND p.photos != ''
          LIMIT 1
      )
      WHERE mainimage IS NULL OR mainimage = '';
    `);

    // ─── 6. Mark top-20 areas as featured ────────────────────────
    console.log('[Auto-Repair] Marking featured areas...');
    await queryRunner.query(`
      UPDATE areas
      SET isfeatured = true,
          priority   = sub.rnk
      FROM (
          SELECT "areaId",
                 (21 - ROW_NUMBER() OVER (ORDER BY COUNT(*) DESC))::int AS rnk
          FROM properties
          GROUP BY "areaId"
          LIMIT 20
      ) sub
      WHERE areas.id = sub."areaId";
    `);

    // ─── 7. Generate missing property slugs ──────────────────────
    console.log('[Auto-Repair] Generating missing property slugs...');
    await queryRunner.query(`
      UPDATE properties
      SET slug = 'new-' ||
                 LOWER(REGEXP_REPLACE(REGEXP_REPLACE(TRIM(name), '[^a-zA-Z0-9 ]', '', 'g'), ' +', '-', 'g')) ||
                 '-' || SUBSTR(id::text, 1, 4)
      WHERE "propertyType" = 'off-plan'
        AND (slug IS NULL OR slug = '');

      UPDATE properties
      SET slug = 'used-' ||
                 LOWER(REGEXP_REPLACE(REGEXP_REPLACE(TRIM(name), '[^a-zA-Z0-9 ]', '', 'g'), ' +', '-', 'g')) ||
                 '-' || SUBSTR(id::text, 1, 4)
      WHERE "propertyType" = 'secondary'
        AND (slug IS NULL OR slug = '');
    `);

    console.log('[Auto-Repair] ✅ Database schema and seed data verified/repaired successfully.');
  } catch (error) {
    console.error('[Auto-Repair] ❌ Repair encountered an error:', error);
    // Do NOT throw — server should still start
  } finally {
    await queryRunner.release();
  }
}
