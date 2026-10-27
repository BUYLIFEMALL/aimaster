import { createHash } from 'node:crypto';
import type { Access } from './work-api';

type JsonObject = Record<string, unknown>;
const object = (value: unknown): value is JsonObject => value !== null && typeof value === 'object' && !Array.isArray(value);
const fields = (value: JsonObject, keys: string[]) => Object.keys(value).every(key => keys.includes(key));
const string = (value: unknown, max: number): value is string => typeof value === 'string' && value.length <= max;
const id = (value: unknown): value is string => typeof value === 'string' && /^[a-z0-9_-]{1,50}$/i.test(value);

// These values are returned as JSON text, never trusted markup or AI instructions.
function plain(value: string) {
  const entities: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
  return value.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (match, entity: string) => {
      if (!entity.startsWith('#')) return entities[entity.toLowerCase()] ?? match;
      const number = entity[1].toLowerCase() === 'x' ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10);
      return number > 0 && number <= 0x10ffff && !(number >= 0xd800 && number <= 0xdfff) ? String.fromCodePoint(number) : '';
    }).replace(/[\u0000-\u001f\u007f\u200b-\u200f\ufeff]/g, ' ').replace(/\s+/g, ' ').trim();
}

export function parsePostUrl(value: unknown) {
  if (!string(value, 2048)) return null;
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.port ||
      !['blog.naver.com', 'm.blog.naver.com'].includes(url.hostname)) return null;
    let owner: string | null, post: string | null;
    if (url.pathname.toLowerCase() === '/postview.naver') {
      if (url.searchParams.getAll('blogId').length !== 1 || url.searchParams.getAll('logNo').length !== 1) return null;
      owner = url.searchParams.get('blogId'); post = url.searchParams.get('logNo');
    } else {
      const match = /^\/([a-z0-9_-]{1,50})\/(\d{1,30})\/?$/i.exec(url.pathname);
      if (!match) return null;
      [, owner, post] = match;
    }
    if (!id(owner) || !post || !/^\d{1,30}$/.test(post)) return null;
    return { blogId: owner.toLowerCase(), postId: post, url: `https://blog.naver.com/${owner.toLowerCase()}/${post}` };
  } catch { return null; }
}

function validDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{8}$/.test(value)) return false;
  const iso = `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
  const stamp = Date.parse(`${iso}T00:00:00Z`);
  return Number.isFinite(stamp) && new Date(stamp).toISOString().slice(0, 10) === iso;
}
class InputError extends Error {}
function invalid(): never { throw new InputError('invalid_material'); }
const unverified = { relationship: 'unknown', accountVerified: false, canAutoEngage: false } as const;

export function previewSearchSummaries(payload: JsonObject) {
  if (!fields(payload, ['profile', 'items', 'limit']) || !object(payload.profile) ||
    !fields(payload.profile, ['own_blog_id', 'keywords', 'excluded_blog_ids'])) invalid();
  const { own_blog_id: ownId, keywords: rawKeywords, excluded_blog_ids: rawExcluded = [] } = payload.profile;
  if (!id(ownId) || !Array.isArray(rawKeywords) || rawKeywords.length < 1 || rawKeywords.length > 20 ||
    rawKeywords.some(x => !string(x, 100)) || !Array.isArray(rawExcluded) || rawExcluded.length > 100 || rawExcluded.some(x => !id(x))) invalid();
  const keywords = [...new Set((rawKeywords as string[]).map(x => plain(x).toLowerCase()).filter(Boolean))];
  if (!keywords.length || !Array.isArray(payload.items) || payload.items.length > 50) invalid();
  const limit = payload.limit ?? 20;
  if (typeof limit !== 'number' || !Number.isInteger(limit) || limit < 1 || limit > 20) invalid();
  const excluded = new Set([ownId.toLowerCase(), ...(rawExcluded as string[]).map(x => x.toLowerCase())]);
  type Candidate = ReturnType<typeof candidate>;
  function candidate(post: NonNullable<ReturnType<typeof parsePostUrl>>, item: JsonObject, matches: string[], index: number) {
    return { ...post, title: plain(item.title as string), summary: plain(item.description as string), postdate: item.postdate as string,
      matchedKeywords: matches, summaryMatchCount: matches.length, inputIndex: index,
      evidenceLevel: 'member-provided-search-summary', ...unverified };
  }
  const selected = new Map<string, Candidate>();
  const rejected: { index: number; reason: string }[] = [];
  payload.items.forEach((item: unknown, index: number) => {
    if (!object(item) || !fields(item, ['title', 'description', 'link', 'postdate', 'bloggername', 'bloggerlink']) ||
      !string(item.title, 500) || !string(item.description, 2000) || !string(item.link, 2048) ||
      ('bloggername' in item && !string(item.bloggername, 500)) || ('bloggerlink' in item && !string(item.bloggerlink, 2048))) invalid();
    const post = parsePostUrl(item.link), searchable = `${plain(item.title)} ${plain(item.description)}`.toLowerCase();
    const matches = keywords.filter(word => searchable.includes(word));
    const reason = !post ? 'unsupported_post_url' : excluded.has(post.blogId) ? 'own_or_excluded_blog' :
      !validDate(item.postdate) ? 'invalid_postdate' : !matches.length ? 'no_summary_keyword_match' : null;
    if (reason || !post) { rejected.push({ index, reason: reason ?? 'unsupported_post_url' }); return; }
    const next = candidate(post, item, matches, index), previous = selected.get(post.blogId);
    if (previous && previous.postdate >= next.postdate) { rejected.push({ index, reason: 'duplicate_blog' }); return; }
    if (previous) rejected.push({ index: previous.inputIndex, reason: 'duplicate_blog' });
    selected.set(post.blogId, next);
  });
  const ranked = [...selected.values()].sort((a, b) => b.summaryMatchCount - a.summaryMatchCount ||
    b.postdate.localeCompare(a.postdate) || a.blogId.localeCompare(b.blogId));
  for (const item of ranked.slice(limit)) rejected.push({ index: item.inputIndex, reason: 'preview_limit' });
  return { candidates: ranked.slice(0, limit).map(({ inputIndex, ...item }) => item), rejected,
    textOnly: true, fullBodyAnalyzed: false, aiScoringPerformed: false, sourceAuthenticityVerified: false };
}

function memberText(payload: JsonObject) {
  if (!fields(payload, ['url', 'title', 'body', 'rights_confirmed']) || payload.rights_confirmed !== true ||
    !string(payload.title, 500) || !string(payload.body, 20000)) invalid();
  const post = parsePostUrl(payload.url), title = plain(payload.title), body = plain(payload.body);
  if (!post || !title || !body) invalid();
  return { ...post, title, body, characterCount: [...body].length,
    contentHash: createHash('sha256').update(JSON.stringify([post.url, title, body])).digest('hex'),
    evidenceLevel: 'member-provided-text', rightsBasis: 'member-attestation', rightsIndependentlyVerified: false,
    sourceAuthenticityVerified: false, fullBodyAnalyzed: false, aiScoringPerformed: false, ...unverified };
}

const response = (body: unknown, status = 200) => Response.json(body, { status, headers: {
  'Cache-Control': 'private, no-store, max-age=0', Vary: 'Cookie, Origin', 'X-Content-Type-Options': 'nosniff',
} });
async function readJson(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) invalid();
  const chunks: Uint8Array[] = []; let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 128 * 1024) { await reader.cancel(); throw new InputError('too_large'); }
    chunks.push(value);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown; } catch { invalid(); }
}

// Stateless preview only: no URL retrieval, provider calls, persistence, or queue operations.
export function createMaterialPreviewHandler(authorize: () => Promise<Access>) {
  return async (request: Request): Promise<Response> => {
    if (request.method !== 'POST') return response({ error: 'POST 요청이 필요합니다.' }, 405);
    const url = new URL(request.url), origin = `${url.protocol}//${request.headers.get('host') ?? url.host}`;
    if (request.headers.get('origin') !== origin || request.headers.get('sec-fetch-site') === 'cross-site') {
      return response({ error: '같은 프로그램 화면에서 요청해 주세요.' }, 403);
    }
    if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') {
      return response({ error: 'JSON 요청이 필요합니다.' }, 415);
    }
    try {
      const access = await authorize();
      if (!access.allowed) return response({ error: access.error }, access.status);
      const input = await readJson(request);
      if (!object(input) || !fields(input, ['operation', 'payload']) || !object(input.payload)) invalid();
      const data = input.operation === 'summary_preview' ? previewSearchSummaries(input.payload) :
        input.operation === 'text_preview' ? memberText(input.payload) : invalid();
      return response({ data: { ...data, ownerId: access.userId, persisted: false, externalRequests: 0 } });
    } catch (error) {
      if (error instanceof InputError) return response({ error: '자료 형식·출처 확인·입력 크기를 확인해 주세요.' }, error.message === 'too_large' ? 413 : 400);
      return response({ error: '서버 준비 상태를 확인해 주세요.' }, 503);
    }
  };
}
