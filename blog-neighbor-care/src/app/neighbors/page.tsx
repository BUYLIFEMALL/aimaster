import { ProgramShell } from '../../components/ProgramShell';
import { MemberGate } from '../../components/MemberGate';
import { NeighborRecords } from '../../components/analysis/NeighborRecords';
import { EngagementRecords } from '../../components/analysis/EngagementRecords';
import { CommunicationWorkspace } from '../../components/analysis/CommunicationWorkspace';
import { IncomingRequests } from '../../components/analysis/IncomingRequests';
import { FoldablePanels } from '../../components/FoldablePanels';
export const dynamic = 'force-dynamic';
export default function NeighborsPage() {
  return <ProgramShell><MemberGate>{userId=><FoldablePanels><NeighborRecords key={userId}/><IncomingRequests key={`incoming-${userId}`}/><CommunicationWorkspace key={`messages-${userId}`}/><EngagementRecords key={`engagement-${userId}`}/></FoldablePanels>}</MemberGate></ProgramShell>;
}
