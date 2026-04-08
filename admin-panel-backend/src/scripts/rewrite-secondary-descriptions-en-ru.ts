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
  onlyMissingRu: boolean;
};

type RewritePayload = {
  description: string;
  descriptionRu: string;
};

type CheckpointState = {
  processed: number;
  updated: number;
  skipped: number;
  failed: number;
  lastProcessedId?: string;
};

type SecondaryRow = {
  id: string;
  name: string;
  description: string | null;
  descriptionRu: string | null;
  buildingName: string | null;
  communityName: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  areaValue: string | null;
  areaName: string | null;
  cityName: string | null;
  updatedAt: string | null;
};

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const STORAGE_DIR = path.resolve(process.cwd(), 'tmp', 'secondary-description-rewrite-en-ru');
const CHECKPOINT_FILE = path.join(STORAGE_DIR, 'checkpoint.json');
const BACKUP_FILE = path.join(STORAGE_DIR, 'backup-before-overwrite.jsonl');
const RESULT_FILE = path.join(STORAGE_DIR, 'results.jsonl');

const EN_CTA = 'Contact our team to arrange a viewing and get full guidance on this property.';
const RU_CTA = 'Свяжитесь с нашей командой, чтобы организовать просмотр и получить полную консультацию по этому объекту.';

const FORBIDDEN_PATTERNS: RegExp[] = [
  /(?:https?:\/\/|www\.)\S+/gi,
  /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,
  /(?:\+?\d[\d\s().-]{6,}\d)/g,
  /\b(?:whats?app|telegram|wechat)\b/gi,
  /\b(?:ORN|BRN|RERA|DED)\s*[:#-]?\s*[A-Z0-9-]+\b/gi,
  /\b(?:real\s*estate\s*agency|broker(?:age)?|property\s*finder|realtor)\b/gi,
];

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
    minChars: Math.max(250, getNum('--min-chars=', 500)),
    maxChars: Math.max(600, getNum('--max-chars=', 1800)),
    resume: !argv.includes('--no-resume'),
    onlyMissingRu: argv.includes('--only-missing-ru'),
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

function parseSimpleArray(val: any): string[] {
  if (!val) return [];
  if (Array.isArray(val)) {
    return val.filter((item) => typeof item === 'string' && item.length > 0 && item !== '[]');
  }
  if (typeof val === 'string') {
    let cleaned = val.trim();
    if (cleaned === '[]' || cleaned === '') return [];
    if (cleaned.startsWith('{') && cleaned.endsWith('}')) {
      cleaned = cleaned.slice(1, -1);
    }
    return cleaned.split(',').map((s) => s.trim().replace(/^"|"$/g, '')).filter((s) => s.length > 0 && s !== '[]');
  }
  return [];
}

function sanitizeSourceDescription(value: string): string {
  let out = value || '';

  out = out
    .replace(/<a\s+[^>]*>(.*?)<\/a>/gi, '$1')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  for (const pattern of FORBIDDEN_PATTERNS) {
    out = out.replace(pattern, ' ');
  }

  out = out
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.!?;:])/g, '$1')
    .trim();

  return out;
}

function normalizeTokens(input: string): Set<string> {
  const tokens = stripHtml(input)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2);
  return new Set(tokens);
}

function jaccardSimilarity(a: string, b: string): number {
  const aSet = normalizeTokens(a);
  const bSet = normalizeTokens(b);

  if (aSet.size === 0 || bSet.size === 0) return 0;

  let intersection = 0;
  for (const token of aSet) {
    if (bSet.has(token)) intersection++;
  }

  const union = aSet.size + bSet.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function hasForbiddenContent(value: string): boolean {
  return FORBIDDEN_PATTERNS.some((pattern) => pattern.test(value));
}

function ensureTrailingCta(content: string, cta: string): string {
  const trimmed = content.trim();
  if (trimmed.includes(cta)) return trimmed;

  // If it ends with a paragraph, append CTA as a separate paragraph.
  if (/\<\/p\>\s*$/i.test(trimmed)) {
    return `${trimmed}\n<p>${cta}</p>`;
  }

  return `${trimmed}\n\n<p>${cta}</p>`;
}

function buildPrompt(property: SecondaryRow, sanitizedSource: string, minChars: number, maxChars: number, feedback?: string): string {
  const correctionBlock = feedback
    ? [
        '',
        'Correction for previous failed attempt:',
        `- Failure reason: ${feedback}`,
        '- Rewrite from scratch and fully fix the issue.'
      ].join('\n')
    : '';

  return [
    'You are a senior UAE real-estate copywriter and bilingual editor.',
    'Task: Rewrite ONE secondary-market property description for our agency in EN, then produce RU translated from your rewritten EN.',
    '',
    'Hard rules:',
    '- Return strict JSON only: {"description":"...","descriptionRu":"..."}.',
    '- Preserve all core property facts and meaning from source; do not invent facts.',
    '- Remove all third-party contacts/agency traces: phones, emails, URLs, WhatsApp/Telegram, broker names, ORN/BRN/RERA/DED, competitor agencies.',
    '- Do NOT output placeholders like [REDACTED].',
    `- EN plain-text length target: ${minChars}-${maxChars} chars.`,
    '- RU must be natural professional Russian translated from your rewritten EN.',
    '- Keep the tone professional and concise for Dubai secondary listings.',
    '- Do not add markdown fences.',
    '',
    'Append these exact CTA lines at the END:',
    `- EN CTA: ${EN_CTA}`,
    `- RU CTA: ${RU_CTA}`,
    '',
    'Property context:',
    `- ID: ${property.id}`,
    `- Name: ${property.name || 'n/a'}`,
    `- Community: ${property.communityName || 'n/a'}`,
    `- Building: ${property.buildingName || 'n/a'}`,
    `- Area: ${property.areaName || 'n/a'}`,
    `- City: ${property.cityName || 'n/a'}`,
    `- Bedrooms/Bathrooms: ${property.bedrooms || 'n/a'} / ${property.bathrooms || 'n/a'}`,
    `- Area value: ${property.areaValue || 'n/a'}`,
    '',
    'Sanitized source description:',
    sanitizedSource || 'No source text available.',
    correctionBlock,
    '',
    'Return JSON only.'
  ].join('\n');
}

async function fetchSecondaryRows(offset: number, limit?: number, onlyMissingRu?: boolean): Promise<SecondaryRow[]> {
  const missingRuFilter = onlyMissingRu
    ? `AND (p."descriptionRu" IS NULL OR NULLIF(TRIM(p."descriptionRu"), '') IS NULL)`
    : '';

  const sqlBase = `
    SELECT
      p.id,
      p.name,
      p.description,
      p."descriptionRu",
      p."buildingname" AS "buildingName",
      p."communityname" AS "communityName",
      p.bedrooms,
      p.bathrooms,
      p.size::text AS "areaValue",
      a."nameEn" AS "areaName",
      c."nameEn" AS "cityName",
      p."updatedAt"::text AS "updatedAt"
    FROM properties p
    LEFT JOIN areas a ON a.id = p."areaId"
    LEFT JOIN cities c ON c.id = p."cityId"
    WHERE p."propertyType" = 'secondary'
      AND p."isactive" = true
      AND p.description IS NOT NULL
      AND LENGTH(TRIM(p.description)) > 80
      ${missingRuFilter}
    ORDER BY p."createdAt" ASC
  `;

  if (typeof limit === 'number') {
    return AppDataSource.query(`${sqlBase} OFFSET $1 LIMIT $2`, [offset, limit]) as Promise<SecondaryRow[]>;
  }

  return AppDataSource.query(`${sqlBase} OFFSET $1`, [offset]) as Promise<SecondaryRow[]>;
}

async function updateDescriptionsById(id: string, description: string, descriptionRu: string): Promise<void> {
  await AppDataSource.query(
    `
      UPDATE properties
      SET description = $1,
          "descriptionRu" = $2,
          "updatedAt" = NOW()
      WHERE id = $3
        AND "propertyType" = 'secondary'
    `,
    [description, descriptionRu, id]
  );
}

function parseRewritePayload(raw: string): RewritePayload | null {
  const trimmed = raw.trim();

  try {
    const data = JSON.parse(trimmed);
    if (data && typeof data.description === 'string' && typeof data.descriptionRu === 'string') {
      return {
        description: data.description.trim(),
        descriptionRu: data.descriptionRu.trim()
      };
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
    if (data && typeof data.description === 'string' && typeof data.descriptionRu === 'string') {
      return {
        description: data.description.trim(),
        descriptionRu: data.descriptionRu.trim()
      };
    }
  } catch {
    return null;
  }

  return null;
}

function validateOutput(
  payload: RewritePayload,
  sanitizedSource: string,
  minChars: number,
  maxChars: number
): { ok: boolean; reason?: string; enChars: number; ruChars: number; similarity: number } {
  const en = payload.description;
  const ru = payload.descriptionRu;
  const enText = stripHtml(en);
  const ruText = stripHtml(ru);

  const enChars = enText.length;
  const ruChars = ruText.length;

  if (enChars < minChars || enChars > maxChars) {
    return { ok: false, reason: `en-char-count-out-of-range(${enChars})`, enChars, ruChars, similarity: 0 };
  }

  if (ruChars < Math.max(220, Math.floor(minChars * 0.55))) {
    return { ok: false, reason: `ru-too-short(${ruChars})`, enChars, ruChars, similarity: 0 };
  }

  if (!/[А-Яа-яЁёІіЇїЄє]/.test(ruText)) {
    return { ok: false, reason: 'ru-no-cyrillic', enChars, ruChars, similarity: 0 };
  }

  if (hasForbiddenContent(enText) || hasForbiddenContent(ruText)) {
    return { ok: false, reason: 'forbidden-content-detected', enChars, ruChars, similarity: 0 };
  }

  const similarity = jaccardSimilarity(sanitizedSource, en);
  if (similarity < 0.05) {
    return { ok: false, reason: `en-too-far-from-source(${similarity.toFixed(3)})`, enChars, ruChars, similarity };
  }

  return { ok: true, enChars, ruChars, similarity };
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

async function callGroqWithRetry(apiKey: string, prompt: string, model: string, maxRetries: number): Promise<string> {
  let attempt = 0;

  while (attempt < maxRetries) {
    attempt += 1;

    try {
      const response = await axios.post(
        GROQ_URL,
        {
          model,
          temperature: 0.45,
          max_tokens: 1700,
          response_format: { type: 'json_object' },
          messages: [{ role: 'user', content: prompt }]
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
        const backoffMs = Number.isFinite(retryAfterSec) && retryAfterSec > 0
          ? retryAfterSec * 1000
          : Math.min(30000, 1200 * 2 ** attempt);

        console.warn(`Rate/service limit detected (status ${status}), retrying in ${backoffMs}ms (attempt ${attempt}/${maxRetries})...`);
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
    throw new Error('GROQ_API_KEY is not set. Add it to environment before running script.');
  }

  ensureStorage();

  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }

  const rows = await fetchSecondaryRows(options.offset, options.limit, options.onlyMissingRu);
  const checkpoint = options.resume ? loadCheckpoint() : { processed: 0, updated: 0, skipped: 0, failed: 0 };

  let startIndex = 0;
  if (options.resume && checkpoint.lastProcessedId) {
    const idx = rows.findIndex((p) => p.id === checkpoint.lastProcessedId);
    if (idx >= 0) startIndex = idx + 1;
  }

  console.log('================================================');
  console.log('SECONDARY EN->RU DESCRIPTION REWRITE');
  console.log(`Mode: ${options.live ? 'LIVE (write to DB)' : 'DRY-RUN (no DB writes)'}`);
  console.log(`Model: ${options.model}`);
  console.log(`EN chars (plain text): ${options.minChars}-${options.maxChars}`);
  console.log(`Records in current run window: ${rows.length}`);
  console.log(`Start index in window: ${startIndex}`);
  console.log(`Only missing RU: ${options.onlyMissingRu}`);
  console.log('================================================');

  const state: CheckpointState = {
    processed: checkpoint.processed,
    updated: checkpoint.updated,
    skipped: checkpoint.skipped,
    failed: checkpoint.failed,
    lastProcessedId: checkpoint.lastProcessedId
  };

  for (let index = startIndex; index < rows.length; index += 1) {
    const property = rows[index];
    const originalEn = property.description || '';
    const originalRu = property.descriptionRu || '';

    const sanitizedSource = sanitizeSourceDescription(originalEn);

    if (!sanitizedSource || sanitizedSource.length < 50) {
      state.processed += 1;
      state.skipped += 1;
      state.lastProcessedId = property.id;

      appendJsonLine(RESULT_FILE, {
        status: 'skipped',
        id: property.id,
        name: property.name,
        reason: 'source-too-short-after-sanitization',
        processedAt: new Date().toISOString()
      });

      saveCheckpoint(state);
      console.warn(`[${index + 1}/${rows.length}] SKIPPED ${property.name} (${property.id}) -> source too short after sanitization`);
      await sleep(options.delayMs);
      continue;
    }

    let accepted: RewritePayload | null = null;
    let validationReason = 'unknown';
    let enChars = 0;
    let ruChars = 0;
    let similarity = 0;

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        const prompt = buildPrompt(property, sanitizedSource, options.minChars, options.maxChars, validationReason !== 'unknown' ? validationReason : undefined);
        const raw = await callGroqWithRetry(groqApiKey, prompt, options.model, options.maxRetries);
        const parsed = parseRewritePayload(raw);

        if (!parsed) {
          validationReason = 'invalid-json-response';
          continue;
        }

        parsed.description = ensureTrailingCta(parsed.description, EN_CTA);
        parsed.descriptionRu = ensureTrailingCta(parsed.descriptionRu, RU_CTA);

        const validation = validateOutput(parsed, sanitizedSource, options.minChars, options.maxChars);
        enChars = validation.enChars;
        ruChars = validation.ruChars;
        similarity = validation.similarity;

        if (!validation.ok) {
          validationReason = validation.reason || 'validation-failed';
          continue;
        }

        accepted = parsed;
        break;
      } catch (error: any) {
        validationReason = `request-failed:${error.message}`;
      }
    }

    state.processed += 1;
    state.lastProcessedId = property.id;

    if (!accepted) {
      state.failed += 1;
      appendJsonLine(RESULT_FILE, {
        status: 'failed',
        id: property.id,
        name: property.name,
        reason: validationReason,
        processedAt: new Date().toISOString()
      });
      saveCheckpoint(state);
      console.warn(`[${index + 1}/${rows.length}] FAILED ${property.name} (${property.id}) -> ${validationReason}`);
      await sleep(options.delayMs);
      continue;
    }

    if (options.live) {
      appendJsonLine(BACKUP_FILE, {
        id: property.id,
        name: property.name,
        description: originalEn,
        descriptionRu: originalRu,
        updatedAt: property.updatedAt,
        backupAt: new Date().toISOString()
      });

      await updateDescriptionsById(property.id, accepted.description, accepted.descriptionRu);
      state.updated += 1;
    } else {
      state.skipped += 1;
    }

    appendJsonLine(RESULT_FILE, {
      status: options.live ? 'updated' : 'dry-run-generated',
      id: property.id,
      name: property.name,
      enChars,
      ruChars,
      similarity,
      enSample: escapeHtml(stripHtml(accepted.description).slice(0, 220)),
      ruSample: escapeHtml(stripHtml(accepted.descriptionRu).slice(0, 220)),
      processedAt: new Date().toISOString()
    });

    saveCheckpoint(state);

    console.log(
      `[${index + 1}/${rows.length}] ${options.live ? 'UPDATED' : 'DRY-RUN'} ${property.name} | en=${enChars} | ru=${ruChars} | sim=${similarity.toFixed(3)}`
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

run().catch(async (error: any) => {
  console.error('Script failed:', error.message);
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
  }
  process.exit(1);
});
