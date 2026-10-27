import { ProgramShell } from '../../components/ProgramShell';
import { MemberGate } from '../../components/MemberGate';
import { NeighborRecords } from '../../components/analysis/NeighborRecords';
export const dynamic = 'force-dynamic';
export default function NeighborsPage() {
  return <ProgramShell><MemberGate>{userId=><NeighborRecords key={userId}/>}</MemberGate></ProgramShell>;
}
