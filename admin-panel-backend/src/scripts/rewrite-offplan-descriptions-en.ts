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
};

type RewritePayload = {
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
const STORAGE_DIR = path.resolve(process.cwd(), 'tmp', 'offplan-description-rewrite-en');
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
    resume: !argv.includes('--no-resume')
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

function keywordListForPrompt(property: OffPlanRow): string {
  const areaName = property.areaName || '';
  const cityName = property.cityName || '';
  const developerName = property.developerName || '';
  const communityName = property.communityName || '';
  const buildingName = property.buildingName || '';

  const rawKeywords = [
    property.name,
    buildingName,
    communityName,
    areaName,
    cityName,
    developerName,
    'Dubai off-plan property',
    'investment property in Dubai',
    'payment plan',
    'handover timeline'
  ];

  const unique = Array.from(new Set(rawKeywords.map((k) => k.trim()).filter(Boolean)));
  return unique.slice(0, 12).join(', ');
}

function buildPrompt(
  property: OffPlanRow,
  minChars: number,
  maxChars: number,
  feedback?: { reason: string; charCount?: number }
): string {
  const plainSource = stripHtml(property.description || '');
  const sourceShort = plainSource.slice(0, 1400);

  const areaName = property.areaName || 'Dubai';
  const cityName = property.cityName || 'Dubai';
  const developerName = property.developerName || 'Developer';
  const completion = property.plannedCompletionAt || property.completionDatetime || property.readiness || 'on request';
  const paymentPlan = property.paymentPlan || 'flexible payment plan';
  const priceFrom = property.priceFrom ? String(property.priceFrom) : 'on request';
  const preferredMin = Math.max(minChars, 1280);
  const preferredMax = Math.min(maxChars, 1420);

  const correctionBlock = feedback
    ? [
        '',
        'Correction from previous failed attempt:',
        `- Previous validation failure: ${feedback.reason}`,
        ...(typeof feedback.charCount === 'number'
          ? [`- Previous plain-text length: ${feedback.charCount} characters.`]
          : []),
        '- Rewrite from scratch and correct the problem completely.',
        `- Keep the new plain-text length between ${preferredMin} and ${preferredMax} characters so it safely passes the strict ${minChars}-${maxChars} rule.`
      ].join('\n')
    : '';

  return [
    'You are a senior SEO copywriter for premium UAE real estate.',
    'Task: rewrite ONE English description for an OFF-PLAN project.',
    '',
    'Hard constraints:',
    '- Return valid JSON object only: {"description":"..."}.',
    '- The description must be HTML in one field and must include:',
    '  1) <h2>Project general facts</h2>',
    '  2) <h2>Location description and benefits</h2>',
    '- Optionally include these sections only if relevant: ',
    '  <h2>Kitchen and appliances</h2>, <h2>Furnishing</h2>.',
    `- Text length (without HTML tags) must be between ${minChars} and ${maxChars} characters. Preferred target band: ${preferredMin}-${preferredMax}.`,
    '- Keep it factual and consistent with source context. No invented numbers, no fake guarantees.',
    '- Keep style premium, concrete, and natural. Avoid clichés.',
    '- Integrate SEO keywords naturally, no stuffing.',
    '- Write substantial section bodies. Thin outputs will be rejected.',
    '- Each required section should contribute meaningful detail about lifestyle, design, amenities, connectivity, buyer appeal, or investment relevance.',
    '- Do not mention that this text is optimized for SEO.',
    '',
    'Project context:',
    `- Project name: ${property.name}`,
    `- Developer: ${developerName}`,
    `- Area: ${areaName}`,
    `- City: ${cityName}`,
    `- Community/building: ${property.communityName || 'n/a'} / ${property.buildingName || 'n/a'}`,
    `- Price from: ${priceFrom}`,
    `- Payment plan: ${paymentPlan}`,
    `- Completion/readiness: ${completion}`,
    `- Suggested keywords: ${keywordListForPrompt(property)}`,
    '',
    'Current source description excerpt:',
    sourceShort || 'No source description available.',
    correctionBlock,
    '',
    'Output only JSON. Do not add markdown fences.'
  ].join('\n');
}

async function fetchOffPlanRows(offset: number, limit?: number): Promise<OffPlanRow[]> {
  const sqlBase = `
    SELECT
      p.id,
      p.name,
      p.description,
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
    ORDER BY p."createdAt" ASC
  `;

  if (typeof limit === 'number') {
    return AppDataSource.query(`${sqlBase} OFFSET $1 LIMIT $2`, [offset, limit]) as Promise<OffPlanRow[]>;
  }

  return AppDataSource.query(`${sqlBase} OFFSET $1`, [offset]) as Promise<OffPlanRow[]>;
}

async function updateDescriptionById(id: string, description: string): Promise<void> {
  await AppDataSource.query(
    `
      UPDATE properties
      SET description = $1,
          "updatedAt" = NOW()
      WHERE id = $2
        AND "propertyType" = 'off-plan'
    `,
    [description, id]
  );
}

function parseRewritePayload(raw: string): RewritePayload | null {
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

function hasRequiredSections(html: string): boolean {
  const norm = html.toLowerCase();
  return norm.includes('<h2>project general facts</h2>') && norm.includes('<h2>location description and benefits</h2>');
}

function validateDescription(html: string, original: string, minChars: number, maxChars: number): { ok: boolean; reason?: string; charCount: number; similarity: number } {
  if (!hasRequiredSections(html)) {
    return { ok: false, reason: 'missing-required-sections', charCount: 0, similarity: 0 };
  }

  const textOnly = stripHtml(html);
  const charCount = textOnly.length;

  if (charCount < minChars || charCount > maxChars) {
    return { ok: false, reason: `char-count-out-of-range(${charCount})`, charCount, similarity: 0 };
  }

  const similarity = jaccardSimilarity(original, html);
  if (similarity >= 0.92) {
    return { ok: false, reason: `too-similar(${similarity.toFixed(3)})`, charCount, similarity };
  }

  return { ok: true, charCount, similarity };
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
          max_tokens: 1200,
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

  const sliced = await fetchOffPlanRows(options.offset, options.limit);
  const checkpoint = options.resume ? loadCheckpoint() : { processed: 0, updated: 0, skipped: 0, failed: 0 };

  let startIndex = 0;
  if (options.resume && checkpoint.lastProcessedId) {
    const idx = sliced.findIndex((p) => p.id === checkpoint.lastProcessedId);
    if (idx >= 0) startIndex = idx + 1;
  }

  console.log('================================================');
  console.log('OFF-PLAN EN DESCRIPTION REWRITE');
  console.log(`Mode: ${options.live ? 'LIVE (write to DB)' : 'DRY-RUN (no DB writes)'}`);
  console.log(`Model: ${options.model}`);
  console.log(`Target chars (plain text): ${options.minChars}-${options.maxChars}`);
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

    const originalDescription = property.description || '';
    let acceptedHtml: string | null = null;
    let validationReason = 'unknown';
    let charCount = 0;
    let similarity = 0;
    let lastFeedback: { reason: string; charCount?: number } | undefined;

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        const prompt = buildPrompt(property, options.minChars, options.maxChars, lastFeedback);
        const raw = await callGroqWithRetry(groqApiKey, prompt, options.model, options.maxRetries);
        const parsed = parseRewritePayload(raw);

        if (!parsed) {
          validationReason = 'invalid-json-response';
          lastFeedback = { reason: validationReason };
          continue;
        }

        const validation = validateDescription(parsed.description, originalDescription, options.minChars, options.maxChars);
        charCount = validation.charCount;
        similarity = validation.similarity;

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
      console.warn(`[${index + 1}/${sliced.length}] FAILED ${property.name} (${property.id}) -> ${validationReason}`);
      await sleep(options.delayMs);
      continue;
    }

    if (options.live) {
      appendJsonLine(BACKUP_FILE, {
        id: property.id,
        name: property.name,
        description: originalDescription,
        updatedAt: property.updatedAt,
        backupAt: new Date().toISOString()
      });

      await updateDescriptionById(property.id, acceptedHtml);
      state.updated += 1;
    } else {
      state.skipped += 1;
    }

    appendJsonLine(RESULT_FILE, {
      status: options.live ? 'updated' : 'dry-run-generated',
      id: property.id,
      name: property.name,
      charCount,
      similarity,
      sample: escapeHtml(stripHtml(acceptedHtml).slice(0, 220)),
      processedAt: new Date().toISOString()
    });

    saveCheckpoint(state);

    console.log(
      `[${index + 1}/${sliced.length}] ${options.live ? 'UPDATED' : 'DRY-RUN'} ${property.name} | chars=${charCount} | similarity=${similarity.toFixed(3)}`
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
