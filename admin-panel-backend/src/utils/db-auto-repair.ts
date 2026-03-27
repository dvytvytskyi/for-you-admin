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
      ALTER TABLE properties ADD COLUMN IF NOT EXISTS isactive            BOOLEAN NOT NULL DEFAULT true;
      ALTER TABLE properties ADD COLUMN IF NOT EXISTS priority            INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE properties ADD COLUMN IF NOT EXISTS "nameEn"            CHARACTER VARYING;
      ALTER TABLE properties ADD COLUMN IF NOT EXISTS "nameRu"            CHARACTER VARYING;
      ALTER TABLE properties ADD COLUMN IF NOT EXISTS "nameAr"            CHARACTER VARYING;
    `);

    // Initialize nameEn with name if nameEn is null
    await queryRunner.query(`
      UPDATE properties SET "nameEn" = name WHERE "nameEn" IS NULL;
      UPDATE properties SET "nameRu" = name WHERE "nameRu" IS NULL;
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
    try {
      await queryRunner.query(`
        UPDATE areas
        SET slug = LOWER(
            REGEXP_REPLACE(
                REGEXP_REPLACE(TRIM("nameEn"), '[^a-zA-Z0-9 ]', '', 'g'),
                ' +', '-', 'g'
            )
        ) || '-' || SUBSTR(id::text, 1, 4)
        WHERE slug IS NULL OR slug = '';
      `);
    } catch (e) {
      console.warn('[Auto-Repair] Warning updating area slugs:', e);
    }

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

    // ─── 7. Generate missing property slugs ──────────────────────
    console.log('[Auto-Repair] Generating missing property slugs...');
    try {
      await queryRunner.query(`
        UPDATE properties
        SET slug = 'new-' ||
                   LOWER(REGEXP_REPLACE(REGEXP_REPLACE(TRIM(COALESCE(name, 'property')), '[^a-zA-Z0-9 ]', '', 'g'), ' +', '-', 'g')) ||
                   '-' || SUBSTR(id::text, 1, 8)
        WHERE "propertyType" = 'off-plan'
          AND (slug IS NULL OR slug = '');

        UPDATE properties
        SET slug = 'used-' ||
                   LOWER(REGEXP_REPLACE(REGEXP_REPLACE(TRIM(COALESCE(name, 'property')), '[^a-zA-Z0-9 ]', '', 'g'), ' +', '-', 'g')) ||
                   '-' || SUBSTR(id::text, 1, 8)
        WHERE "propertyType" = 'secondary'
          AND (slug IS NULL OR slug = '');
      `);
    } catch (e) {
      console.warn('[Auto-Repair] Warning updating property slugs:', e);
    }

    // ─── 8. User Activity tables ──────────────────────────────────────────
    console.log('[Auto-Repair] Checking "user_sessions" and "user_activities" tables...');

    // Create user_sessions table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        id uuid NOT NULL DEFAULT uuid_generate_v4(),
        "referenceId" character varying NOT NULL,
        "utmSource" character varying,
        "utmMedium" character varying,
        "utmCampaign" character varying,
        referrer character varying,
        locale character varying,
        "userAgent" character varying,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user_sessions" PRIMARY KEY (id),
        CONSTRAINT "UQ_user_sessions_referenceId" UNIQUE ("referenceId")
      );
    `);

    // Create user_activities table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS user_activities (
        id uuid NOT NULL DEFAULT uuid_generate_v4(),
        "sessionId" uuid NOT NULL,
        "referenceId" character varying NOT NULL,
        action character varying NOT NULL,
        "propertyId" character varying,
        url character varying,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_user_activities" PRIMARY KEY (id)
      );
    `);

    // Add FK to user_activities (ignore if exists)
    try {
      await queryRunner.query(`
        ALTER TABLE user_activities 
        ADD CONSTRAINT "FK_user_activities_sessionId" 
        FOREIGN KEY ("sessionId") REFERENCES user_sessions(id) 
        ON DELETE NO ACTION ON UPDATE NO ACTION;
      `);
    } catch (_) { }

    // Add referenceId to investments
    console.log('[Auto-Repair] Checking "investments" table for referenceId...');
    try {
      await queryRunner.query(`
        ALTER TABLE investments ADD COLUMN IF NOT EXISTS "referenceId" CHARACTER VARYING;
      `);
    } catch (_) { }

    console.log('[Auto-Repair] ✅ Database schema and seed data verified/repaired successfully.');
  } catch (error) {
    console.error('[Auto-Repair] ❌ Repair encountered an error:', error);
    // Do NOT throw — server should still start
  } finally {
    await queryRunner.release();
  }
}
