// Local file intake only. Reuses the extension's strict Naver single-post parser.
// No network, credentials, persistence, HTML rendering or AI execution.
import { parsePost } from '../../../extension/extractor.mjs';

export type CandidatePostInput = { url: string; title: string; body: string; rightsConfirmed: boolean };
/** A changed source must never inherit the old article's permission checkbox. */
export function reviseCandidateSource(post:CandidatePostInput,field:'url'|'title'|'body',value:string):CandidatePostInput{
 if(!['url','title','body'].includes(field)||typeof value!=='string')throw new Error('후보 글 수정 항목을 확인해 주세요.');
 return {...post,[field]:value,rightsConfirmed:false};
}
export const MAX_CANDIDATE_FILE_BYTES = 192 * 1024;
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
export class CandidateFileError extends Error {}
const fail = (message: string): never => { throw new CandidateFileError(message); };
function bodyText(value: unknown) {
  if (typeof value !== 'string' || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)) fail('본문은 읽을 수 있는 UTF-8 텍스트여야 합니다.');
  const body = (value as string).replace(/\r\n?/g, '\n').trim();
  if (!body || body.length > 6000) fail('각 글의 실제 본문을 1~6,000자 이내로 준비해 주세요.');
  return body;
}
function normalize(value: unknown): CandidatePostInput {
  if (!object(value) || Object.keys(value).some(key => !['url', 'title', 'body', 'rightsConfirmed'].includes(key))) fail('각 글에는 url·title·body만 넣어 주세요.');
  const item = value as Record<string, unknown>;
  if ('rightsConfirmed' in item && typeof item.rightsConfirmed !== 'boolean') fail('파일 형식을 확인해 주세요.');
  if (typeof item.url !== 'string' || item.url.length > 2048 || !parsePost(item.url)) fail('각 글에 https 네이버 단일 글 주소를 넣어 주세요.');
  if (typeof item.title !== 'string' || !item.title.trim() || item.title.trim().length > 500 || /[\u0000-\u001f\u007f]/.test(item.title)) fail('각 글의 제목을 1~500자 이내로 넣어 주세요.');
  return { url: parsePost(item.url)!.url, title: (item.title as string).trim(), body: bodyText(item.body), rightsConfirmed: false };
}
function checkLimits(posts: CandidatePostInput[]) {
  if (posts.length < 1 || posts.length > 20) fail('한 번에 1~20개 글까지 가져올 수 있습니다.');
  if (posts.reduce((count, post) => count + post.body.length, 0) > 60000) fail('본문 합계는 60,000자 이내여야 합니다.');
  const counts = new Map<string, number>();
  for (const post of posts) {
    const blogId = parsePost(post.url)!.blogId;
    counts.set(blogId, (counts.get(blogId) || 0) + 1);
  }
  if ([...counts.values()].some(count => count > 5)) fail('같은 블로그의 글은 최대 5개까지만 넣어 주세요.');
  // Reserve space for the analysis operation, UUIDs, model and consent fields.
  const bytes = new TextEncoder().encode(JSON.stringify(posts.map(post => ({ ...post, rightsConfirmed: true })))).length;
  if (bytes > 190 * 1024) fail('분석 요청 크기를 넘습니다. 글 수나 본문 분량을 줄여 주세요.');
}
export function parseCandidateJson(text: string): CandidatePostInput[] {
  if (new TextEncoder().encode(text).length > MAX_CANDIDATE_FILE_BYTES) fail('JSON 파일은 192KiB 이내로 준비해 주세요.');
  let json: unknown;
  try { json = JSON.parse(text.replace(/^\uFEFF/, '')); } catch { fail('JSON 파일 형식을 확인해 주세요.'); }
  if (!object(json) || Object.keys(json).some(key => key !== 'posts') || !Array.isArray(json.posts)) fail('JSON 양식의 posts 배열에 글을 넣어 주세요.');
  const posts = ((json as Record<string, unknown>).posts as unknown[]).map(normalize);
  checkLimits(posts);
  if (new Set(posts.map(post => post.url)).size !== posts.length) fail('파일에 같은 글 주소가 두 번 들어 있습니다.');
  return posts;
}
type LocalFile = Pick<File, 'name' | 'size' | 'arrayBuffer'>;
async function readUtf8(file: LocalFile, pattern: RegExp) {
  if (!pattern.test(file.name)) fail('지원하는 파일 형식을 선택해 주세요.');
  if (!Number.isFinite(file.size) || file.size <= 0 || file.size > MAX_CANDIDATE_FILE_BYTES) fail('빈 파일은 읽을 수 없고 파일 크기는 192KiB 이내여야 합니다.');
  const buffer = await file.arrayBuffer();
  if (buffer.byteLength > MAX_CANDIDATE_FILE_BYTES) fail('파일 크기는 192KiB 이내여야 합니다.');
  try { return new TextDecoder('utf-8', { fatal: true }).decode(buffer); } catch { return fail('파일을 UTF-8로 저장한 뒤 다시 선택해 주세요.'); }
}
export async function readCandidateJson(file: LocalFile) { return parseCandidateJson(await readUtf8(file, /\.json$/i)); }
export async function readCandidateText(file: LocalFile) { return bodyText(await readUtf8(file, /\.(txt|md)$/i)); }

export function mergeCandidatePosts(existing: CandidatePostInput[], incoming: CandidatePostInput[], mode: 'append' | 'replace') {
  // Pure/atomic: failures leave the caller's current inputs intact.
  const additions = incoming.map(normalize);
  let skipped = 0;
  const result: CandidatePostInput[] = mode === 'replace' ? [] : existing.filter(post => post.url.trim() || post.title.trim() || post.body.trim()).map(post => ({ ...post }));
  const known = new Map<string, CandidatePostInput>();
  for (const post of result) {
    const parsed = parsePost(post.url);
    if (!parsed) throw new CandidateFileError('현재 입력 중인 글의 주소부터 완성하거나 교체 방식을 선택해 주세요.');
    if (known.has(parsed.url)) fail('현재 입력에 같은 글 주소가 중복되어 있습니다.');
    known.set(parsed.url, post);
  }
  for (const post of additions) {
    const previous = known.get(post.url);
    if (previous) {
      if (!previous.body.trim() && (!previous.title.trim() || previous.title.trim() === post.title)) { Object.assign(previous, post); continue; }
      if (previous.title.trim() !== post.title || previous.body.replace(/\r\n?/g, '\n').trim() !== post.body) fail('같은 글 주소에 다른 제목·본문이 있습니다. 기존 입력을 확인한 뒤 다시 가져오세요.');
      skipped++; continue;
    }
    known.set(post.url, post); result.push(post);
  }
  // Incomplete existing inputs stay editable; final analysis still validates every field.
  if (result.length > 20) fail('현재 입력과 합치면 20개를 넘습니다. 먼저 필요 없는 글을 제외해 주세요.');
  if (result.some(post => !post.title.trim() || !post.body.trim())) fail('현재 입력의 제목·본문부터 완성하거나 교체 방식을 선택해 주세요.');
  checkLimits(result);
  return { posts: result, added: additions.length - skipped, skipped };
}
