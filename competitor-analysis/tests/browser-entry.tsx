// Real components/server-rendered pages with isolated data/actions; no member DB writes.
import { createRoot } from 'react-dom/client';
import { KeywordMatrix } from '@/components/keywords/KeywordMatrix';
import { AnalysisMatrix } from '@/components/analyses/AnalysisMatrix';
import { KeywordForm } from '@/components/keywords/KeywordForm';
import { ReportButton } from '@/components/keywords/ReportButton';
import JobDetail from '@/app/(dashboard)/keywords/[id]/jobs/[jobId]/page';
import KeywordLayout from '@/app/(dashboard)/keywords/[id]/layout';
import AnalysesPage from '@/app/(dashboard)/analyses/page';
import CompetitorsPage from '@/app/(dashboard)/competitors/page';
const keywords = [
  { id: 'key-one', keyword: '제주 가을 여행', location: 'South Korea', engine: 'naver' as const, is_active: true, analysisCount: 2, lastAnalyzedAt: '2026-10-15T23:30:00Z' },
  { id: 'key-two', keyword: 'AI Automation', location: 'South Korea', engine: 'google' as const, is_active: true, analysisCount: 1, lastAnalyzedAt: '2026-10-16T00:00:00Z' },
  { id: 'key-three', keyword: '가을 산책', location: 'South Korea', engine: 'naver' as const, is_active: false, analysisCount: 0, lastAnalyzedAt: null },
];
const items = keywords.slice(0, 2).map((k, i) => ({ keywordId: k.id, jobId: `job-${i}`, keywordText: k.keyword, executedAt: '2026-10-15T23:30:00Z', totalResults: 4, summaryPreview: '합성 리포트' }));
async function main() {
  window.fixture.empty = true;
  const emptyAnalyses = await AnalysesPage(), emptyCompetitors = await CompetitorsPage();
  window.fixture.empty = false;
  const detail = await KeywordLayout({ params: { id: 'key-one' }, children: await JobDetail({ params: { id: 'key-one', jobId: 'job-one' } }) });
  const competitors = await CompetitorsPage();
  createRoot(document.getElementById('root')!).render(<>
    <section id="keyword-form"><KeywordForm /></section>
    <section id="keywords"><KeywordMatrix keywords={keywords} /></section>
    <section id="analyses"><AnalysisMatrix items={items} /></section>
    <section id="detail">{detail}</section>
    <section id="report-button"><ReportButton analysisId="report-missing" hasReport={false} /></section>
    <section id="competitors">{competitors}</section>
    <section id="empty-analyses">{emptyAnalyses}</section><section id="empty-competitors">{emptyCompetitors}</section>
  </>);
}
void main();
