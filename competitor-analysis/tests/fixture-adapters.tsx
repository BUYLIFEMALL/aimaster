// Test-only adapters. Never imported by application routes or production authentication.
import React from 'react';
declare global { interface Window { fixture: any } }
export default function Link({ children, href, ...props }: any) { return <a {...props} href={href}>{children}</a>; }
export function useRouter() { return { push: (p: string) => { window.fixture.lastPush = p; }, refresh: () => { window.fixture.refresh++; } }; }
export function usePathname() { return '/keywords/key-one/jobs/job-one'; }
export function notFound(): never { throw Error('Fixture not found'); }
export async function requireProgramAccess() { return { id: 'fixture-member' }; }
export async function createKeywordAction() { window.fixture.created++; await new Promise(r => setTimeout(r, 25)); return {}; }
export async function deleteKeywordAction() { window.fixture.deleted++; }
export async function deleteJobAction() { window.fixture.deleted++; }
export async function runKeywordAnalysisAction() { window.fixture.analyzed++; return { needsApiKey: 'serpapi' }; }
export async function generateReportAction() { window.fixture.reports++; return { needsApiKey: 'anthropic' }; }
export async function trackCompetitorAction() { window.fixture.tracked++; }
export async function untrackCompetitorAction() { window.fixture.tracked--; }
const data: Record<string, any[]> = {
  competitor_keywords: [{ id: 'key-one', keyword: '제주 가을 여행', location: 'South Korea', engine: 'naver' }],
  competitor_serp_jobs: [{ id: 'job-one', keyword_id: 'key-one', executed_at: '2026-10-15T23:30:00Z', total_results: 4, engine: 'naver' }],
  competitor_serp_results: [
    { id: 'r1', job_id: 'job-one', position: 1, result_type: 'organic', title: '자연 결과', link: 'https://example.org/a', snippet: '공개 정보', domain: 'example.org' },
    { id: 'r2', job_id: 'job-one', position: 2, result_type: 'ad', title: '위험 링크', link: 'javascript:alert(1)', snippet: '링크 차단 검수', domain: 'example.org' },
    { id: 'r3', job_id: 'job-one', position: null, result_type: 'paa', title: '어떤 여행이 좋을까?', link: null, snippet: '질문', domain: null },
    { id: 'r4', job_id: 'job-one', position: 1, result_type: 'local', title: '지역 결과', link: 'https://local.example.org', domain: 'local.example.org' },
  ],
  competitor_analyses: [{ id: 'analysis-one', job_id: 'job-one', summary_text: '합성 경쟁사 분석 리포트 — 비용 없는 검수', html_report: '<h1>격리된 합성 리포트</h1><script>parent.fixture.compromised=true;</script>' }],
  user_tracked_competitors: [{ domain: 'example.org', note: '', created_at: '2026-10-15T23:30:00Z' }],
  competitor_profiles: [{ domain: 'example.org', company_name: '합성 회사', summary: '합성 회사 소개' }],
};
export async function createClient() {
  return { from: (table: string) => {
    let single = false; const filters: any[] = []; const q: any = {};
    q.select = () => q; q.order = () => q; q.limit = () => q;
    q.eq = (column: string, value: any) => { filters.push(['eq', column, value]); return q; };
    q.in = (column: string, value: any[]) => { filters.push(['in', column, value]); return q; };
    q.maybeSingle = () => { single = true; return q; };
    q.then = (ok: any, reject: any) => {
      window.fixture.queries.push({ table, filters, empty: window.fixture.empty });
      const rows = (window.fixture.empty ? [] : data[table] || []).filter(row => filters.every(([op, key, value]) => key === 'user_id' || (op === 'eq' ? row[key] === value : value.includes(row[key]))));
      return Promise.resolve({ data: single ? rows[0] ?? null : rows, error: null }).then(ok, reject);
    }; return q;
  } };
}
