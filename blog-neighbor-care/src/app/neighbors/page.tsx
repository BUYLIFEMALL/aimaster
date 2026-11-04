import Link from 'next/link';
import { ProgramShell } from '../../components/ProgramShell';
import { MemberGate } from '../../components/MemberGate';
import { NeighborRecords } from '../../components/analysis/NeighborRecords';
import { AnalysisStudio } from '../../components/analysis/AnalysisStudio';
import { FoldablePanels } from '../../components/FoldablePanels';
export const dynamic = 'force-dynamic';
// v1.16 「이웃」: 관계 기록(기존 이웃 가져오기·소통 대상 포함)과 이웃 후보 찾기(옛 /candidates)를 탭으로.
export default async function NeighborsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const candidates = (await searchParams).tab === 'candidates';
  return <ProgramShell><MemberGate>{userId => <>
    <nav className="bnc-tabs" aria-label="이웃 화면 탭">
      <Link href="/neighbors" aria-current={candidates ? undefined : 'page'}>관계 기록·가져오기</Link>
      <Link href="/neighbors?tab=candidates" aria-current={candidates ? 'page' : undefined}>이웃 후보 찾기</Link>
    </nav>
    {candidates ? <AnalysisStudio key={`candidates-${userId}`} userId={userId} mode="candidates" />
      : <FoldablePanels><NeighborRecords key={userId} /></FoldablePanels>}
  </>}</MemberGate></ProgramShell>;
}
