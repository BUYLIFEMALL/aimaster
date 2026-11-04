import { ProgramShell } from '../../components/ProgramShell';
import { MemberGate } from '../../components/MemberGate';
import { CommunicationWorkspace } from '../../components/analysis/CommunicationWorkspace';
import { EngagementRecords } from '../../components/analysis/EngagementRecords';
import { IncomingRequests } from '../../components/analysis/IncomingRequests';
import { FoldablePanels } from '../../components/FoldablePanels';
export const dynamic = 'force-dynamic';
// v1.16 첫 화면: 매일 하는 일(새 글 확인 → 문장 → 작업 결과 → 답방·대댓글 → 받은 신청)을 한곳에.
export default function TodayPage() {
  return <ProgramShell><MemberGate>{userId => <FoldablePanels>
    <div className="page-heading"><div className="eyebrow">TODAY / 오늘의 소통</div><h1>오늘 할 소통을 한곳에서.</h1>
      <p>새 글 확인과 문장 만들기, 작업 결과, 답방·대댓글, 받은 신청을 이 화면에서 처리합니다. 실행 허용·일일 상한·AI 모델은 설정에서 한 번만 정합니다.</p></div>
    <CommunicationWorkspace key={`messages-${userId}`} />
    <EngagementRecords key={`engagement-${userId}`} />
    <IncomingRequests key={`incoming-${userId}`} />
  </FoldablePanels>}</MemberGate></ProgramShell>;
}
