/**
 * cms-publish.ts — Build-time CMS sync: Markdown → Firestore + snapshot.json
 *
 * Usage:
 *   pnpm cms:publish
 *
 * What it does:
 *   1. Reads all *.es.md files from apps/pwa/cms/sample-content/
 *   2. Parses YAML frontmatter (using a minimal parser to avoid gray-matter dep at root)
 *   3. Merges matching *.en.md body
 *   4. Writes each article to Firestore /content/{id} (uses firebase-admin via env creds)
 *   5. Exports apps/pwa/src/cms/snapshot.json for vite build static pre-render
 *
 * Auth: set GOOGLE_APPLICATION_CREDENTIALS env var or run after `firebase login --ci`.
 *
 * Idempotency: re-running updates the Firestore doc in-place; publishedAt is only set
 * on first write; subsequent runs update updatedAt only.
 *
 * Threats:
 *   T-02-06-02: DOMPurify is not needed here because we store raw Markdown;
 *               sanitization happens at render time in ContentArticle.vue.
 *   T-02-06-06: git history of apps/pwa/cms/ provides editorial audit trail.
 */

import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from 'node:fs';
import { join, basename, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// ── File paths ─────────────────────────────────────────────────────────────────
const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..');
const CMS_DIR = join(REPO_ROOT, 'apps', 'pwa', 'cms', 'sample-content');
const SNAPSHOT_DIR = join(REPO_ROOT, 'apps', 'pwa', 'src', 'cms');
const SNAPSHOT_PATH = join(SNAPSHOT_DIR, 'snapshot.json');

// ── Minimal YAML frontmatter parser ───────────────────────────────────────────
// Avoids adding gray-matter as a runtime dependency in the monorepo root.
// Only handles simple key: value, nested (2-space indented), and YAML lists.

interface Frontmatter {
  id: string;
  title?: { es: string; en: string };
  slug?: { es: string; en: string };
  pillar?: string;
  contentType?: string;
  gameClusters?: string[];
  estReadMinutes?: number;
  authorName?: string;
  status?: string;
  coverImage?: string;
  embeddedMedia?: { provider: string; videoId: string };
  assessment?: {
    requiresConsent: string;
    schema: unknown;
  };
  [key: string]: unknown;
}

function parseFrontmatter(content: string): { data: Frontmatter; body: string } {
  const FM_REGEX = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;
  const match = FM_REGEX.exec(content);
  if (!match) {
    return { data: { id: '' }, body: content };
  }
  const yamlText = match[1]!;
  const body = match[2]?.trim() ?? '';

  // Parse YAML using Node's built-in (available in Node 22 via --experimental-vm-modules
  // or via dynamic import). For robustness we use a simple line-by-line parser.
  const data = parseSimpleYaml(yamlText) as Frontmatter;
  return { data, body };
}

// Simple YAML parser that handles the frontmatter shapes used in this project.
// Supports: scalar values, nested objects (2-space indent), lists (- item).
function parseSimpleYaml(yaml: string): Record<string, unknown> {
  const lines = yaml.split('\n');
  const root: Record<string, unknown> = {};
  const stack: Array<{ obj: Record<string, unknown>; indent: number }> = [
    { obj: root, indent: -2 },
  ];
  let currentList: string[] | null = null;
  let currentListKey: string | null = null;
  let currentListParent: Record<string, unknown> | null = null;

  for (const line of lines) {
    if (line.trim() === '' || line.trim().startsWith('#')) continue;

    const indent = line.search(/\S/);
    const trimmed = line.trim();

    // List item
    if (trimmed.startsWith('- ')) {
      const value = trimmed.slice(2).trim();
      if (currentList !== null) {
        currentList.push(unquote(value));
      }
      continue;
    }

    // Flush previous list
    if (currentList !== null && currentListKey && currentListParent) {
      currentListParent[currentListKey] = currentList;
      currentList = null;
      currentListKey = null;
      currentListParent = null;
    }

    // Key: value or key: (nested)
    const colonIdx = trimmed.indexOf(':');
    if (colonIdx === -1) continue;

    const key = trimmed.slice(0, colonIdx).trim();
    const rawValue = trimmed.slice(colonIdx + 1).trim();

    // Pop stack until we find the right parent indent
    while (stack.length > 1 && stack[stack.length - 1]!.indent >= indent) {
      stack.pop();
    }
    const parent = stack[stack.length - 1]!.obj;

    if (rawValue === '') {
      // Nested object or list follows
      const nested: Record<string, unknown> = {};
      parent[key] = nested;
      stack.push({ obj: nested, indent });
      // Could be a list next — we'll detect on next iteration
      currentList = [];
      currentListKey = key;
      currentListParent = parent;
    } else {
      // Scalar value
      currentList = null;
      parent[key] = coerce(unquote(rawValue));
    }
  }

  // Flush any remaining list
  if (currentList !== null && currentList.length > 0 && currentListKey && currentListParent) {
    currentListParent[currentListKey] = currentList;
  }

  return root;
}

function unquote(s: string): string {
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1);
  }
  return s;
}

function coerce(s: string): unknown {
  if (s === 'true') return true;
  if (s === 'false') return false;
  if (s === 'null' || s === '~') return null;
  const num = Number(s);
  if (!isNaN(num) && s !== '') return num;
  return s;
}

// ── Article type (subset of ContentArticle for snapshot) ──────────────────────
interface ArticleSnapshot {
  id: string;
  title: { es: string; en: string };
  slug: { es: string; en: string };
  body: { es: string; en: string };
  pillar: string;
  contentType: string;
  gameClusters: string[];
  estReadMinutes: number;
  authorName: string;
  status: string;
  coverImage: string;
  embeddedMedia?: { provider: string; videoId: string };
  assessment?: unknown;
  publishedAt: string;  // ISO string in snapshot (Timestamp in Firestore)
  updatedAt: string;
}

// ── Main ───────────────────────────────────────────────────────────────────────
async function main(): Promise<void> {
  console.log('[cms-publish] Starting CMS sync...');

  // Find all .es.md files
  const files = readdirSync(CMS_DIR).filter((f) => f.endsWith('.es.md'));
  console.log(`[cms-publish] Found ${files.length} article(s)`);

  const articles: ArticleSnapshot[] = [];

  for (const file of files) {
    const esPath = join(CMS_DIR, file);
    const enFile = file.replace('.es.md', '.en.md');
    const enPath = join(CMS_DIR, enFile);

    const esContent = readFileSync(esPath, 'utf-8');
    const { data: fm, body: esBody } = parseFrontmatter(esContent);

    let enBody = '';
    if (existsSync(enPath)) {
      const enContent = readFileSync(enPath, 'utf-8');
      const { body } = parseFrontmatter(enContent);
      enBody = body;
    } else {
      console.warn(`[cms-publish] No EN file found for ${file} — using ES body as fallback`);
      enBody = esBody;
    }

    if (!fm.id) {
      console.warn(`[cms-publish] Skipping ${file} — missing 'id' in frontmatter`);
      continue;
    }

    const now = new Date().toISOString();

    const article: ArticleSnapshot = {
      id: fm.id,
      title: (fm.title as { es: string; en: string }) ?? { es: fm.id, en: fm.id },
      slug: (fm.slug as { es: string; en: string }) ?? { es: fm.id, en: fm.id },
      body: { es: esBody, en: enBody },
      pillar: (fm.pillar as string) ?? 'general',
      contentType: (fm.contentType as string) ?? 'article',
      gameClusters: (fm.gameClusters as string[]) ?? ['general'],
      estReadMinutes: (fm.estReadMinutes as number) ?? 5,
      authorName: (fm.authorName as string) ?? 'GameChangers Team',
      status: (fm.status as string) ?? 'published',
      coverImage: (fm.coverImage as string) ?? '',
      publishedAt: now,
      updatedAt: now,
    };

    if (fm.embeddedMedia) {
      article.embeddedMedia = fm.embeddedMedia as { provider: string; videoId: string };
    }

    if (fm.assessment) {
      article.assessment = fm.assessment;
    }

    articles.push(article);
    console.log(`[cms-publish] Processed: ${fm.id} (${article.contentType}, ${article.pillar})`);
  }

  // ── Write to Firestore (if firebase-admin credentials available) ──────────────
  let firestoreWritten = 0;
  try {
    // Dynamic import so the script still works for snapshot-only export (no credentials needed)
    const { initializeApp, getApps } = await import('firebase-admin/app');
    const { getFirestore, FieldValue } = await import('firebase-admin/firestore');

    if (getApps().length === 0) {
      initializeApp();
    }

    const db = getFirestore();

    for (const article of articles) {
      const ref = db.collection('content').doc(article.id);
      const existing = await ref.get();

      const writeData: Record<string, unknown> = {
        ...article,
        // Store publishedAt as server timestamp on first write only
        publishedAt: existing.exists
          ? (existing.data()?.['publishedAt'] ?? FieldValue.serverTimestamp())
          : FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };

      await ref.set(writeData, { merge: true });
      firestoreWritten++;
      console.log(`[cms-publish] Firestore written: /content/${article.id}`);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const isCredentialError =
      msg.includes('Could not load the default credentials') ||
      msg.includes('ENOENT') ||
      msg.includes('Unable to detect a Project Id') ||
      msg.includes('GOOGLE_APPLICATION_CREDENTIALS') ||
      msg.includes('Application Default Credentials');
    if (isCredentialError) {
      console.warn('[cms-publish] No Firebase credentials — skipping Firestore write (snapshot-only mode)');
    } else {
      throw err;
    }
  }

  // ── Export snapshot.json for vite build static pre-render ─────────────────────
  if (!existsSync(SNAPSHOT_DIR)) {
    mkdirSync(SNAPSHOT_DIR, { recursive: true });
  }

  writeFileSync(SNAPSHOT_PATH, JSON.stringify(articles, null, 2), 'utf-8');
  console.log(`[cms-publish] Snapshot exported: ${SNAPSHOT_PATH}`);
  console.log(`[cms-publish] Done. ${articles.length} article(s) processed, ${firestoreWritten} written to Firestore.`);
}

main().catch((err) => {
  console.error('[cms-publish] Fatal error:', err);
  process.exit(1);
});
