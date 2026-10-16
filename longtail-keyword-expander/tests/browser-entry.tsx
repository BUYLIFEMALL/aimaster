// Test-only fixture: real UI components and server-rendered detail, fake data/actions.
import { createRoot } from 'react-dom/client';
import { SeedMatrix } from '@/components/seeds/SeedMatrix';
import { RunMatrix } from '@/components/runs/RunMatrix';
import { SeedForm } from '@/components/seeds/SeedForm';
import RunDetailPage from '@/app/(dashboard)/seeds/[id]/runs/[runId]/page';
import SeedLayout from '@/app/(dashboard)/seeds/[id]/layout';

const seeds = [
  { id: 'seed-one', keyword: '제주 가을 여행', engine: 'naver' as const, is_active: true, runCount: 2, lastRunAt: '2026-10-15T23:30:00Z' },
  { id: 'seed-two', keyword: 'AI Automation', engine: 'google' as const, is_active: true, runCount: 1, lastRunAt: '2026-10-16T00:00:00Z' },
  { id: 'seed-three', keyword: '가을 등산', engine: 'naver' as const, is_active: false, runCount: 0, lastRunAt: null },
];
const runs = seeds.slice(0, 2).map((s, i) => ({ seedId: s.id, runId: `run-${i}`, keyword: s.keyword, executedAt: '2026-10-15T23:30:00Z', relatedCount: 2, expansionCount: 3, summaryPreview: '블로그 작업 지시문 — 합성 검수 데이터' }));
async function main() {
  const detail = await RunDetailPage({ params: { id: 'seed-one', runId: 'run-0' } });
  const layout = await SeedLayout({ params: { id: 'seed-one' }, children: detail });
  createRoot(document.getElementById('root')!).render(<>
    <section id="seed-form"><SeedForm /></section>
    <section id="seeds"><SeedMatrix seeds={seeds} /></section>
    <section id="runs"><RunMatrix runs={runs} /></section>
    <section id="detail">{layout}</section>
  </>);
}
void main();
