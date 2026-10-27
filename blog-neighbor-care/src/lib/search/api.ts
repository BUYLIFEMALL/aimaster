import type { Access } from '../work-api';
import { previewSearchSummaries } from '../material-preview';
import type { AnalysisJob } from '../analysis/client';

type NaverKeys = { clientId: string; clientSecret: string };
type Dependencies = {
  member: () => Promise<Access>;
  profile: (userId: string, id: string) => Promise<AnalysisJob | null>;
  keys: (userId: string) => Promise<NaverKeys | null>;
  fetch: typeof fetch;
  now?: () => number;
};
export class SearchError extends Error { constructor(readonly kind: 'auth' | 'quota' | 'response' | 'network') { super(kind); } }
const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'cache-control': 'private, no-store', vary: 'Cookie, Origin' } });
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const only = (v: Record<string, unknown>, keys: string[]) => Object.keys(v).every(k => keys.includes(k));
const keyValid = (key: string) => typeof key === 'string' && !!key.trim() && key.length <= 4096 && !/[\r\n]/.test(key);

// Same HUB endpoint/header contract as blog-keyword/kw/naver.ts. One bounded call, no legacy fallback/retry.
export async function searchHub(keys: NaverKeys, query: string, fetcher: typeof fetch) {
  const url = new URL('https://naverapihub.apigw.ntruss.com/search/v1/blog');
  for (const [key, value] of Object.entries({ query, display: '20', start: '1', sort: 'date', format: 'json' })) url.searchParams.set(key, value);
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetcher(url, { method: 'GET', headers: { 'X-NCP-APIGW-API-KEY-ID': keys.clientId, 'X-NCP-APIGW-API-KEY': keys.clientSecret }, signal: controller.signal, redirect: 'error', cache: 'no-store' });
    if (!response.ok) {
      await response.body?.cancel();
      throw new SearchError([401, 403].includes(response.status) ? 'auth' : response.status === 429 ? 'quota' : 'response');
    }
    const reader = response.body?.getReader(); if (!reader) throw new SearchError('response');
    const chunks: Uint8Array[] = []; let length = 0;
    for (;;) { const { done, value } = await reader.read(); if (done) break; length += value.length; if (length > 524288) { await reader.cancel(); throw new SearchError('response'); } chunks.push(value); }
    let data: unknown; try { data = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw new SearchError('response'); }
    if (!record(data) || !Array.isArray(data.items) || data.items.length > 20) throw new SearchError('response');
    return data.items.map(item => {
      if (!record(item)) throw new SearchError('response');
      const result: Record<string, string> = {};
      for (const [field, max] of [['title', 500], ['description', 2000], ['link', 2048], ['postdate', 8], ['bloggername', 500], ['bloggerlink', 2048]] as const) {
        if (typeof item[field] !== 'string' || item[field].length > max) throw new SearchError('response'); result[field] = item[field];
      }
      return result;
    });
  } catch (error) { if (error instanceof SearchError) throw error; throw new SearchError('network'); }
  finally { clearTimeout(timer); }
}

export function createSearchHandler(deps: Dependencies) {
  // Per-process duplicate guard, not a distributed daily quota or cache.
  const active = new Set<string>();
  return async (request: Request): Promise<Response> => {
    if (request.method !== 'POST') return reply({ error: 'POST 요청이 필요합니다.' }, 405);
    let owner: string | null = null;
    try {
      const access = await deps.member(); if (!access.allowed) return reply({ error: access.error }, access.status);
      const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || new URL(request.url).host;
      const protocol = request.headers.get('x-forwarded-proto') || new URL(request.url).protocol.slice(0, -1);
      try { const origin = new URL(request.headers.get('origin') || ''); if (origin.origin !== `${protocol}://${host}` || !['https:', 'http:'].includes(origin.protocol) || origin.origin !== request.headers.get('origin')) return reply({ error: '프로그램 화면에서 검색해 주세요.' }, 403); }
      catch { return reply({ error: '프로그램 화면에서 검색해 주세요.' }, 403); }
      if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') return reply({ error: 'JSON 요청이 필요합니다.' }, 415);
      const reader = request.body?.getReader(); if (!reader) return reply({ error: '검색 조건을 확인해 주세요.' }, 400);
      let length = 0; const chunks: Uint8Array[] = [];
      for (;;) { const { done, value } = await reader.read(); if (done) break; length += value.length; if (length > 8192) { await reader.cancel(); return reply({ error: '검색 조건이 너무 큽니다.' }, 413); } chunks.push(value); }
      let input: unknown; try { input = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { return reply({ error: '검색 조건을 확인해 주세요.' }, 400); }
      if (!record(input) || !only(input, ['profileId', 'query', 'quotaConfirmed']) || typeof input.profileId !== 'string' || !/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(input.profileId) || typeof input.query !== 'string' || !input.query.trim() || input.query.length > 100 || /[\u0000-\u001f]/.test(input.query) || input.quotaConfirmed !== true) return reply({ error: '확인한 프로필·검색어·검색 API 사용 동의를 확인해 주세요.' }, 400);
      if (active.has(access.userId)) return reply({ error: '진행 중인 검색 결과부터 확인해 주세요.' }, 409);
      active.add(access.userId); owner = access.userId;
      const now = () => deps.now?.() ?? Date.now();
      const profile = await deps.profile(access.userId, input.profileId);
      const ownBlogId = profile?.result?.sources?.[0]?.blogId;
      if (!profile || profile.kind !== 'profile' || profile.state !== 'succeeded' || !profile.reviewedProfile || profile.revision < 1 || !Number.isFinite(Date.parse(profile.expiresAt)) || Date.parse(profile.expiresAt) <= now() || !/^[a-z0-9_-]{1,50}$/.test(ownBlogId || '')) return reply({ error: '유효한 본인 프로필 확인본을 먼저 선택해 주세요.' }, 409);
      const keys = await deps.keys(access.userId);
      if (!keys || !keyValid(keys.clientId) || !keyValid(keys.clientSecret)) return reply({ error: '회원 본인의 NAVER API HUB 검색용 Client ID와 Secret을 등록해 주세요. 네이버 로그인 앱 키와 구분해 주세요.', needKey: true }, 400);
      const before = await deps.member(); if (!before.allowed) return reply({ error: before.error }, before.status); if (before.userId !== access.userId) return reply({ error: '로그인 계정을 다시 확인해 주세요.' }, 403);
      const query = input.query.trim(), items = await searchHub(keys, query, deps.fetch);
      const after = await deps.member(); if (!after.allowed) return reply({ error: after.error }, after.status); if (after.userId !== access.userId) return reply({ error: '로그인 계정을 다시 확인해 주세요.' }, 403);
      const current = await deps.profile(access.userId, input.profileId);
      if (!current || current.revision !== profile.revision || !Number.isFinite(Date.parse(current.expiresAt)) || Date.parse(current.expiresAt) <= now()) return reply({ error: '검색 중 프로필이 변경되거나 만료됐습니다. 확인한 프로필을 다시 선택해 주세요.' }, 409);
      const preview = previewSearchSummaries({ profile: { own_blog_id: ownBlogId, keywords: [...new Set(query.split(/\s+/))].slice(0, 20), excluded_blog_ids: [] }, items, limit: 20 });
      return reply({ data: { ...preview, candidates: preview.candidates.map(candidate => ({ ...candidate, evidenceLevel: 'naver-api-hub-search-summary' })), profileId: profile.id, profileRevision: profile.revision, searchedAt: new Date(now()).toISOString(), expiresAt: profile.expiresAt, fetchedCount: items.length, externalActions: 0, automaticRetry: false } });
    } catch (error) {
      if (error instanceof SearchError) {
        const errors = { auth: '검색용 키의 NAVER API HUB 이용 설정을 확인해 주세요.', quota: '검색 API 한도에 도달했습니다. 자동으로 다시 호출하지 않습니다.', response: '검색 응답을 확인하지 못했습니다. 자동 재호출하지 않습니다.', network: '검색 연결 결과가 불확실합니다. 검색 API 사용량을 확인하고 다시 검색할지 직접 결정해 주세요.' };
        return reply({ error: errors[error.kind] }, error.kind === 'quota' ? 429 : 502);
      }
      return reply({ error: '검색 준비 상태를 확인해 주세요.' }, 503);
    } finally { if (owner) active.delete(owner); }
  };
}
