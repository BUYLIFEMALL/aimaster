import {ExtensionExecutionSettings} from '../../components/analysis/ExtensionExecutionSettings';
import { ProgramShell } from '../../components/ProgramShell';
import { MemberGate } from '../../components/MemberGate';
import { ConnectionSettings } from '../../components/analysis/ConnectionSettings';
import {ExecutionControl} from '../../components/analysis/ExecutionControl';
import { WorkRecords } from '../../components/analysis/WorkRecords';
import { SchedulePreferences } from '../../components/analysis/SchedulePreferences';
import { ScheduleRecovery } from '../../components/analysis/ScheduleRecovery';
export const dynamic = 'force-dynamic';
export default function SettingsPage() {
  return <ProgramShell><MemberGate>{userId => <><div className="page-heading"><div className="eyebrow">SETTINGS / 연결과 실행 기준</div><h1>내 계정. 내 기준. 내 선택.</h1><p>연결 상태를 확인하고, 분석할 때 사용할 플랫폼과 모델을 살펴보세요.</p></div><div className="settings-grid"><ConnectionSettings key={userId} /><ExecutionControl key={`execution-${userId}`}/></div><SchedulePreferences key={`schedule-${userId}`}/><ScheduleRecovery key={`recovery-${userId}`}/><ExtensionExecutionSettings key={`extension-${userId}`}/><WorkRecords key={userId}/></>}</MemberGate></ProgramShell>;
}
