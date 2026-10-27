import { ProgramShell } from '../../components/ProgramShell';
import { MemberGate } from '../../components/MemberGate';
import { AnalysisStudio } from '../../components/analysis/AnalysisStudio';
export const dynamic = 'force-dynamic';
export default function CandidatesPage() {
  return <ProgramShell><MemberGate>{userId => <AnalysisStudio key={userId} userId={userId} mode="candidates" />}</MemberGate></ProgramShell>;
}
