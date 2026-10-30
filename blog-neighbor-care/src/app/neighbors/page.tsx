import { ProgramShell } from '../../components/ProgramShell';
import { MemberGate } from '../../components/MemberGate';
import { NeighborRecords } from '../../components/analysis/NeighborRecords';
import { EngagementRecords } from '../../components/analysis/EngagementRecords';
import { MessageStudio } from '../../components/analysis/MessageStudio';
export const dynamic = 'force-dynamic';
export default function NeighborsPage() {
  return <ProgramShell><MemberGate>{userId=><><NeighborRecords key={userId}/><MessageStudio key={`messages-${userId}`}/><EngagementRecords key={`engagement-${userId}`}/></>}</MemberGate></ProgramShell>;
}
