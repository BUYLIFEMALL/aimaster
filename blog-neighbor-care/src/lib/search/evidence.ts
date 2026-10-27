import { parsePostUrl } from '../material-preview';

export type SearchActivity = { scope: 'single-search-response'; observedPostCount: number; observedRecent30DayCount: number;
  latestObservedPostDate: string | null; windowStartDate: string; asOfDate: string; fullCoverage: false;
  inactivityConfirmed: false; activityScore: null };
export type RelationshipEvidence = { state: 'unknown' | 'pending' | 'mutual' | 'removed';
  recordedState: string | null; observedAt: string | null; freshness: 'missing' | 'fresh' | 'stale' | 'invalid';
  source: 'server-relationship-record' | 'none'; canAutoEngage: false };
export type RelationRow = { neighbor_id: string; state: string; verified_at: string };
const day = 86400000;
const kstDate = (now: number) => new Date(now + 9 * 3600000).toISOString().slice(0, 10);
function date(value: unknown): string | null {
  if (typeof value !== 'string' || !/^\d{8}$/.test(value)) return null;
  const iso = `${value.slice(0,4)}-${value.slice(4,6)}-${value.slice(6,8)}`;
  const stamp = Date.parse(iso + 'T00:00:00Z');
  return Number.isFinite(stamp) && new Date(stamp).toISOString().slice(0,10) === iso ? iso : null;
}

// A lower bound from this response, never a blog-wide publishing frequency or dormant verdict.
export function searchActivity(items: Record<string, unknown>[], blogId: string, now: number): SearchActivity {
  const asOfDate = kstDate(now), start = Date.parse(asOfDate + 'T00:00:00Z') - 29 * day;
  const windowStartDate = new Date(start).toISOString().slice(0,10);
  const posts = new Map<string, string>(), conflicts = new Set<string>();
  for (const item of items) {
    const post = parsePostUrl(item.link), published = date(item.postdate);
    if (!post || post.blogId !== blogId || !published || published > asOfDate || conflicts.has(post.url)) continue;
    if (posts.has(post.url) && posts.get(post.url) !== published) { posts.delete(post.url); conflicts.add(post.url); continue; }
    posts.set(post.url, published);
  }
  const dates = [...posts.values()].sort();
  return { scope: 'single-search-response', observedPostCount: dates.length,
    observedRecent30DayCount: dates.filter(d => d >= windowStartDate).length,
    latestObservedPostDate: dates.at(-1) ?? null, windowStartDate, asOfDate, fullCoverage: false,
    inactivityConfirmed: false, activityScore: null };
}

export function relationshipEvidence(rows: RelationRow[], blogId: string, now: number): RelationshipEvidence {
  const records = rows.filter(row => row.neighbor_id === blogId);
  const empty: RelationshipEvidence = { state: 'unknown', recordedState: null, observedAt: null,
    freshness: 'missing', source: 'none', canAutoEngage: false };
  if (!records.length) return empty;
  if (records.length !== 1) return { ...empty, freshness: 'invalid' };
  const row = records[0], stamp = Date.parse(row.verified_at);
  if (!['unknown','pending','mutual','removed'].includes(row.state) || !Number.isFinite(stamp) || stamp > now)
    return { ...empty, freshness: 'invalid' };
  const fresh = now - stamp < 300000;
  return { state: fresh ? row.state as RelationshipEvidence['state'] : 'unknown', recordedState: row.state,
    observedAt: row.verified_at, freshness: fresh ? 'fresh' : 'stale', source: 'server-relationship-record', canAutoEngage: false };
}
