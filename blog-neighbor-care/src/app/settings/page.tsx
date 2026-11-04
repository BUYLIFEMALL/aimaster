import {ExtensionExecutionSettings} from '../../components/analysis/ExtensionExecutionSettings';
import { ProgramShell } from '../../components/ProgramShell';
import { MemberGate } from '../../components/MemberGate';
import {ExecutionControl} from '../../components/analysis/ExecutionControl';
import { WorkRecords } from '../../components/analysis/WorkRecords';
import { SchedulePreferences } from '../../components/analysis/SchedulePreferences';
import { ScheduleRecovery } from '../../components/analysis/ScheduleRecovery';
import { DefaultModelSettings } from '../../components/analysis/DefaultModelSettings';
import { FoldablePanels } from '../../components/FoldablePanels';
import ReaderConnection from '../reader/reader-connection';
export const dynamic = 'force-dynamic';
// v1.16: 기본 화면은 연결 상태·실행 허용과 일일 상한·시간대·모델 1곳. 나머지는 「고급 설정」 접기.
export default function SettingsPage() {
  return <ProgramShell><MemberGate>{userId => <>
    <div className="page-heading"><div className="eyebrow">SETTINGS / API키등록·플랫폼연동</div><h1>처음 한 번 정하면 되는 설정.</h1><p>확장 연결, 실행 허용과 하루 상한, 동작 시간대, AI 모델을 여기서 한 번만 정합니다.</p></div>
    <div id="connection"><ReaderConnection key={`reader-${userId}`} /></div>
    <div className="settings-grid"><ExecutionControl key={`execution-${userId}`} /><DefaultModelSettings key={`model-${userId}`} /></div>
    <SchedulePreferences key={`schedule-${userId}`} />
    <details className="bnc-advanced"><summary>고급 설정 — 기기별 세부 허용 · 반복 기록·복구 · 작업 기록 전체 조회</summary>
      <FoldablePanels><ExtensionExecutionSettings key={`extension-${userId}`} /><ScheduleRecovery key={`recovery-${userId}`} /><WorkRecords key={`records-${userId}`} /></FoldablePanels>
    </details>
  </>}</MemberGate></ProgramShell>;
}
