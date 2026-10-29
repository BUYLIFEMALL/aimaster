import { ProgramShell } from '../../components/ProgramShell';
import { MemberGate } from '../../components/MemberGate';
import { NeighborRecords } from '../../components/analysis/NeighborRecords';
import { EngagementRecords } from '../../components/analysis/EngagementRecords';
export const dynamic = 'force-dynamic';
export default function NeighborsPage() {
  return <ProgramShell><MemberGate>{userId=><><NeighborRecords key={userId}/><EngagementRecords key={`engagement-${userId}`}/></>}</MemberGate></ProgramShell>;
}
