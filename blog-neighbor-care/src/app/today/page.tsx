import { ProgramShell } from '../../components/ProgramShell';
import { MemberGate } from '../../components/MemberGate';
import { CommunicationWorkspace } from '../../components/analysis/CommunicationWorkspace';
import { EngagementRecords } from '../../components/analysis/EngagementRecords';
import { IncomingRequests } from '../../components/analysis/IncomingRequests';
import { FoldablePanels } from '../../components/FoldablePanels';
import { ApprovedRunButton } from '../../components/analysis/ApprovedRunButton';
import { AutopilotPanel } from '../../components/analysis/AutopilotPanel';
export const dynamic = 'force-dynamic';
// v1.16 첫 화면: 매일 하는 일(새 글 확인 → 문장 → 작업 결과 → 답방·대댓글 → 받은 신청)을 한곳에.
export default function TodayPage() {
  return <ProgramShell><MemberGate>{userId => <FoldablePanels>
    <div className="page-heading"><div className="eyebrow">TODAY / 오늘의 소통</div><h1>오늘 할 소통을 한곳에서.</h1>
      <p>처음 한 번 「시작하기」를 마치면 프로그램이 대신 소통하고, 이 화면에서는 오늘 한 일과 확인이 필요한 것만 보면 됩니다. 아래 칸들은 직접 처리할 때 씁니다.</p></div>
    <AutopilotPanel key={`autopilot-${userId}`} />
    <ApprovedRunButton key={`run-${userId}`} />
    <CommunicationWorkspace key={`messages-${userId}`} />
    <EngagementRecords key={`engagement-${userId}`} />
    <IncomingRequests key={`incoming-${userId}`} />
  </FoldablePanels>}</MemberGate></ProgramShell>;
}
