import 'reflect-metadata';
import * as fs from 'fs';
import * as path from 'path';
import axios, { AxiosError } from 'axios';
import * as dotenv from 'dotenv';
import { AppDataSource } from '../config/database';

dotenv.config();

type ScriptOptions = {
  live: boolean;
  limit?: number;
  offset: number;
  delayMs: number;
  batchSize: number;
  maxRetries: number;
  model: string;
  minChars: number;
  maxChars: number;
  resume: boolean;
  onlyMissing: boolean;
};

type TranslatePayload = {
  description: string;
};

type CheckpointState = {
  processed: number;
  updated: number;
  skipped: number;
  failed: number;
  lastProcessedId?: string;
};

type OffPlanRow = {
  id: string;
  name: string;
  description: string | null;
  descriptionRu: string | null;
  buildingName: string | null;
  communityName: string | null;
  paymentPlan: string | null;
  completionDatetime: string | null;
  plannedCompletionAt: string | null;
  readiness: string | null;
  priceFrom: string | null;
  areaName: string | null;
  cityName: string | null;
  developerName: string | null;
  updatedAt: string | null;
};

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const STORAGE_DIR = path.resolve(process.cwd(), 'tmp', 'offplan-description-translate-ru');
const CHECKPOINT_FILE = path.join(STORAGE_DIR, 'checkpoint.json');
const BACKUP_FILE = path.join(STORAGE_DIR, 'backup-before-overwrite.jsonl');
const RESULT_FILE = path.join(STORAGE_DIR, 'results.jsonl');

function parseArgs(argv: string[]): ScriptOptions {
  const getNum = (prefix: string, fallback: number): number => {
    const raw = argv.find((item) => item.startsWith(prefix));
    if (!raw) return fallback;
    const parsed = Number(raw.slice(prefix.length));
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
  };

  const getOptionalNum = (prefix: string): number | undefined => {
    const raw = argv.find((item) => item.startsWith(prefix));
    if (!raw) return undefined;
    const parsed = Number(raw.slice(prefix.length));
    return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
  };

  const getString = (prefix: string, fallback: string): string => {
    const raw = argv.find((item) => item.startsWith(prefix));
    return raw ? raw.slice(prefix.length).trim() || fallback : fallback;
  };

  return {
    live: argv.includes('--live'),
    limit: getOptionalNum('--limit='),
    offset: getNum('--offset=', 0),
    delayMs: getNum('--delay-ms=', 6500),
    batchSize: Math.max(1, getNum('--batch-size=', 25)),
    maxRetries: Math.max(1, getNum('--max-retries=', 6)),
    model: getString('--model=', 'llama-3.3-70b-versatile'),
    minChars: Math.max(400, getNum('--min-chars=', 1200)),
    maxChars: Math.max(800, getNum('--max-chars=', 1500)),
    resume: !argv.includes('--no-resume'),
    onlyMissing: !argv.includes('--all'),
  };
}

function ensureStorage(): void {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildTranslationPrompt(
  property: OffPlanRow,
  minChars: number,
  maxChars: number,
  feedback?: { reason: string; charCount?: number }
): string {
  const plainSource = stripHtml(property.description || '');
  const sourceShort = plainSource.slice(0, 1400);

  const areaName = property.areaName || 'Дубай';
  const cityName = property.cityName || 'Дубай';
  const developerName = property.developerName || 'застройщик';
  const preferredMin = Math.max(minChars, 1280);
  const preferredMax = Math.min(maxChars, 1420);

  const correctionBlock = feedback
    ? [
        '',
        'Исправление по предыдущей неудачной попытке:',
        `- Причина отказа: ${feedback.reason}`,
        ...(typeof feedback.charCount === 'number'
          ? [`- Длина предыдущего текста (без тегов): ${feedback.charCount} символов.`]
          : []),
        '- Перепиши заново с учётом замечания.',
        `- Длина чистого текста (без HTML-тегов) должна быть от ${preferredMin} до ${preferredMax} символов — строгое требование.`
      ].join('\n')
    : '';

  return [
    'Ты — профессиональный переводчик и копирайтер элитной недвижимости ОАЭ.',
    'Задача: сделай КОНТЕКСТНЫЙ перевод описания объекта с английского на русский.',
    '',
    'Чёткие правила:',
    '- Верни ТОЛЬКО JSON-объект: {"description":"..."}.',
    '- Описание должно быть HTML и обязательно содержать:',
    '  1) <h2>Общие факты о проекте</h2>',
    '  2) <h2>Описание локации и преимущества</h2>',
    '- Включай эти секции только если они есть в источнике:',
    '  <h2>Кухня и техника</h2>, <h2>Меблировка</h2>.',
    `- Длина текста (без HTML-тегов) — строго от ${minChars} до ${maxChars} символов. Целевой диапазон: ${preferredMin}-${preferredMax}.`,
    '- КОНТЕКСТНЫЙ перевод: текст должен звучать как профессиональный русский оригинал, а не как машинный перевод.',
    '- Сохраняй фактическую точность: не придумывай цифры, не искажай факты источника.',
    '- Стиль: премиальный, живой, конкретный. Никаких общих фраз и штампов.',
    '- Используй литературный русский: варьируй конструкции, соблюдай падежное управление, используй правильные предлоги.',
    '- Не используй "данный проект", "данный комплекс" — применяй конкретное название или живые обороты.',
    '- Сохраняй HTML-структуру: теги <h2>, <p>, <ul>, <li> и т.д.',
    '- Используй кирилличные кавычки «…» там, где нужны кавычки.',
    '- Технические названия — Dubai Marina, Business Bay и т.д. — оставляй на английском.',
    '',
    'Контекст об объекте:',
    `- Название: ${property.name}`,
    `- Застройщик: ${developerName}`,
    `- Район: ${areaName}`,
    `- Город: ${cityName}`,
    `- Комьюнити/здание: ${property.communityName || 'н/д'} / ${property.buildingName || 'н/д'}`,
    '',
    'Источник на английском (для перевода):',
    sourceShort || 'Нет исходного описания.',
    correctionBlock,
    '',
    'Верни только JSON. Без markdown-блоков.'
  ].join('\n');
}

async function fetchOffPlanRows(offset: number, limit?: number, onlyMissing?: boolean): Promise<OffPlanRow[]> {
  const missingFilter =
    onlyMissing ? `AND (p."descriptionRu" IS NULL OR p."descriptionRu" = '')` : '';

  const sqlBase = `
    SELECT
      p.id,
      p.name,
      p.description,
      p."descriptionRu",
      p."buildingname" AS "buildingName",
      p."communityname" AS "communityName",
      p."paymentPlan" AS "paymentPlan",
      p."completionDatetime" AS "completionDatetime",
      p."plannedcompletionat" AS "plannedCompletionAt",
      p.readiness,
      p."priceFrom"::text AS "priceFrom",
      a."nameEn" AS "areaName",
      c."nameEn" AS "cityName",
      d.name AS "developerName",
      p."updatedAt"::text AS "updatedAt"
    FROM properties p
    LEFT JOIN areas a ON a.id = p."areaId"
    LEFT JOIN cities c ON c.id = p."cityId"
    LEFT JOIN developers d ON d.id = p."developerId"
    WHERE p."propertyType" = 'off-plan'
      AND p.description IS NOT NULL
      AND LENGTH(p.description) > 100
      ${missingFilter}
    ORDER BY p."createdAt" ASC
  `;

  if (typeof limit === 'number') {
    return AppDataSource.query(`${sqlBase} OFFSET $1 LIMIT $2`, [offset, limit]) as Promise<OffPlanRow[]>;
  }

  return AppDataSource.query(`${sqlBase} OFFSET $1`, [offset]) as Promise<OffPlanRow[]>;
}

async function ensureDescriptionRuColumn(): Promise<void> {
  await AppDataSource.query(`
    ALTER TABLE properties ADD COLUMN IF NOT EXISTS "descriptionRu" text;
  `);
}

async function updateDescriptionRuById(id: string, descriptionRu: string): Promise<void> {
  await AppDataSource.query(
    `
      UPDATE properties
      SET "descriptionRu" = $1,
          "updatedAt" = NOW()
      WHERE id = $2
        AND "propertyType" = 'off-plan'
    `,
    [descriptionRu, id]
  );
}

function parseTranslatePayload(raw: string): TranslatePayload | null {
  const trimmed = raw.trim();

  try {
    const data = JSON.parse(trimmed);
    if (data && typeof data.description === 'string') {
      return { description: data.description.trim() };
    }
  } catch {
    // fallback below
  }

  const fallback = trimmed
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();

  try {
    const data = JSON.parse(fallback);
    if (data && typeof data.description === 'string') {
      return { description: data.description.trim() };
    }
  } catch {
    return null;
  }

  return null;
}

function hasRequiredRussianSections(html: string): boolean {
  const norm = html.toLowerCase();
  return (
    norm.includes('<h2>общие факты о проекте</h2>') &&
    norm.includes('<h2>описание локации и преимущества</h2>')
  );
}

function validateTranslation(
  html: string,
  minChars: number,
  maxChars: number
): { ok: boolean; reason?: string; charCount: number } {
  if (!hasRequiredRussianSections(html)) {
    return { ok: false, reason: 'missing-required-ru-sections', charCount: 0 };
  }

  const textOnly = stripHtml(html);
  const charCount = textOnly.length;

  if (charCount < minChars || charCount > maxChars) {
    return { ok: false, reason: `char-count-out-of-range(${charCount})`, charCount };
  }

  return { ok: true, charCount };
}

function appendJsonLine(filePath: string, payload: unknown): void {
  fs.appendFileSync(filePath, `${JSON.stringify(payload)}\n`, 'utf8');
}

function loadCheckpoint(): CheckpointState {
  if (!fs.existsSync(CHECKPOINT_FILE)) {
    return { processed: 0, updated: 0, skipped: 0, failed: 0 };
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(CHECKPOINT_FILE, 'utf8')) as CheckpointState;
    return {
      processed: parsed.processed || 0,
      updated: parsed.updated || 0,
      skipped: parsed.skipped || 0,
      failed: parsed.failed || 0,
      lastProcessedId: parsed.lastProcessedId
    };
  } catch {
    return { processed: 0, updated: 0, skipped: 0, failed: 0 };
  }
}

function saveCheckpoint(state: CheckpointState): void {
  fs.writeFileSync(CHECKPOINT_FILE, JSON.stringify(state, null, 2), 'utf8');
}

async function callGroqWithRetry(
  apiKey: string,
  prompt: string,
  model: string,
  maxRetries: number
): Promise<string> {
  let attempt = 0;

  while (attempt < maxRetries) {
    attempt += 1;

    try {
      const response = await axios.post(
        GROQ_URL,
        {
          model,
          temperature: 0.55,
          max_tokens: 1400,
          response_format: { type: 'json_object' },
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ]
        },
        {
          timeout: 120000,
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return String(response.data?.choices?.[0]?.message?.content || '').trim();
    } catch (error) {
      const axiosError = error as AxiosError;
      const status = axiosError.response?.status;

      if (status === 429 || status === 503 || status === 502 || status === 504) {
        const retryAfterHeader = axiosError.response?.headers?.['retry-after'];
        const retryAfterSec = retryAfterHeader ? Number(retryAfterHeader) : NaN;
        const backoffMs =
          Number.isFinite(retryAfterSec) && retryAfterSec > 0
            ? retryAfterSec * 1000
            : Math.min(30000, 1200 * 2 ** attempt);

        console.warn(
          `Rate/service limit (status ${status}), retrying in ${backoffMs}ms (attempt ${attempt}/${maxRetries})...`
        );
        await sleep(backoffMs);
        continue;
      }

      throw error;
    }
  }

  throw new Error(`Failed after ${maxRetries} retries`);
}

async function run(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const groqApiKey = process.env.GROQ_API_KEY;

  if (!groqApiKey) {
    throw new Error('GROQ_API_KEY is not set.');
  }

  ensureStorage();

  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }

  await ensureDescriptionRuColumn();

  const sliced = await fetchOffPlanRows(options.offset, options.limit, options.onlyMissing);
  const checkpoint = options.resume ? loadCheckpoint() : { processed: 0, updated: 0, skipped: 0, failed: 0 };

  let startIndex = 0;
  if (options.resume && checkpoint.lastProcessedId) {
    const idx = sliced.findIndex((p) => p.id === checkpoint.lastProcessedId);
    if (idx >= 0) startIndex = idx + 1;
  }

  console.log('================================================');
  console.log('OFF-PLAN DESCRIPTION TRANSLATE -> RU');
  console.log(`Mode: ${options.live ? 'LIVE (write to DB)' : 'DRY-RUN (no DB writes)'}`);
  console.log(`Model: ${options.model}`);
  console.log(`Target chars (plain text): ${options.minChars}-${options.maxChars}`);
  console.log(`Only missing (descriptionRu IS NULL): ${options.onlyMissing}`);
  console.log(`Records in current run window: ${sliced.length}`);
  console.log(`Start index in window: ${startIndex}`);
  console.log('================================================');

  const state: CheckpointState = {
    processed: checkpoint.processed,
    updated: checkpoint.updated,
    skipped: checkpoint.skipped,
    failed: checkpoint.failed,
    lastProcessedId: checkpoint.lastProcessedId
  };

  for (let index = startIndex; index < sliced.length; index += 1) {
    const property = sliced[index];

    const originalDescriptionEn = property.description || '';
    let acceptedHtml: string | null = null;
    let validationReason = 'unknown';
    let charCount = 0;
    let lastFeedback: { reason: string; charCount?: number } | undefined;

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        const prompt = buildTranslationPrompt(property, options.minChars, options.maxChars, lastFeedback);
        const raw = await callGroqWithRetry(groqApiKey, prompt, options.model, options.maxRetries);
        const parsed = parseTranslatePayload(raw);

        if (!parsed) {
          validationReason = 'invalid-json-response';
          lastFeedback = { reason: validationReason };
          continue;
        }

        const validation = validateTranslation(parsed.description, options.minChars, options.maxChars);
        charCount = validation.charCount;

        if (!validation.ok) {
          validationReason = validation.reason || 'validation-failed';
          lastFeedback = { reason: validationReason, charCount };
          continue;
        }

        acceptedHtml = parsed.description;
        break;
      } catch (error: any) {
        validationReason = `request-failed:${error.message}`;
        lastFeedback = { reason: validationReason };
      }
    }

    state.processed += 1;
    state.lastProcessedId = property.id;

    if (!acceptedHtml) {
      state.failed += 1;
      appendJsonLine(RESULT_FILE, {
        status: 'failed',
        id: property.id,
        name: property.name,
        reason: validationReason,
        processedAt: new Date().toISOString()
      });
      saveCheckpoint(state);
      console.warn(
        `[${index + 1}/${sliced.length}] FAILED ${property.name} (${property.id}) -> ${validationReason}`
      );
      await sleep(options.delayMs);
      continue;
    }

    if (options.live) {
      appendJsonLine(BACKUP_FILE, {
        id: property.id,
        name: property.name,
        descriptionRu: property.descriptionRu,
        updatedAt: property.updatedAt,
        backupAt: new Date().toISOString()
      });

      await updateDescriptionRuById(property.id, acceptedHtml);
      state.updated += 1;
    } else {
      state.skipped += 1;
    }

    appendJsonLine(RESULT_FILE, {
      status: options.live ? 'updated' : 'dry-run-generated',
      id: property.id,
      name: property.name,
      charCount,
      sample: stripHtml(acceptedHtml).slice(0, 500),
      processedAt: new Date().toISOString()
    });

    saveCheckpoint(state);

    console.log(
      `[${index + 1}/${sliced.length}] ${options.live ? 'UPDATED' : 'DRY-RUN'} ${property.name} | chars=${charCount}`
    );

    if ((index + 1) % options.batchSize === 0) {
      console.log('Batch checkpoint reached. Extra cooldown 10s.');
      await sleep(10000);
    }

    await sleep(options.delayMs);
  }

  console.log('================================================');
  console.log('DONE');
  console.log(`Processed: ${state.processed}`);
  console.log(`Updated: ${state.updated}`);
  console.log(`Dry-run generated: ${state.skipped}`);
  console.log(`Failed: ${state.failed}`);
  console.log(`Checkpoint: ${CHECKPOINT_FILE}`);
  console.log(`Results: ${RESULT_FILE}`);
  console.log(`Backup: ${BACKUP_FILE}`);
  console.log('================================================');

  await AppDataSource.destroy();
}

run().catch(async (error) => {
  console.error('Script failed:', error.message);
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
  }
  process.exit(1);
});
