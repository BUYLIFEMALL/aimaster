import Link from 'next/link';
import { ProgramShell } from '../../components/ProgramShell';
import { MemberGate } from '../../components/MemberGate';
import { ConnectionSettings } from '../../components/analysis/ConnectionSettings';
import { WorkRecords } from '../../components/analysis/WorkRecords';
import { SchedulePreferences } from '../../components/analysis/SchedulePreferences';
export const dynamic = 'force-dynamic';
export default function SettingsPage() {
  return <ProgramShell><MemberGate>{userId => <><div className="page-heading"><div className="eyebrow">SETTINGS / 연결과 실행 기준</div><h1>내 계정. 내 기준. 내 선택.</h1><p>연결 상태를 확인하고, 분석할 때 사용할 플랫폼과 모델을 살펴보세요.</p></div><div className="settings-grid"><ConnectionSettings key={userId} /><section className="panel"><div className="section-head"><h2>자동 소통</h2><span className="badge">꺼짐 · 아직 제공하지 않음</span></div><p>이웃 신청·공감·댓글·답글·예약·반복 실행은 후속 기능입니다. 설정 화면에서 켤 수 없습니다.</p><div className="caps"><div><b>20</b><small>이웃 신청 / 일</small></div><div><b>100</b><small>공감 / 일</small></div><div><b>30</b><small>댓글·답글 / 일</small></div></div><small>앱의 최대 상한 안내입니다. 실제 허용량·실행량이나 현재 사용할 수 있는 기능을 뜻하지 않습니다.</small><div className="notice"><strong>결과가 불확실하면 멈춥니다.</strong><p>AI 응답 유실·불완전 결과는 이전 요청 상태부터 확인합니다. 회원 확인과 실제 외부 실행을 구분합니다.</p></div><Link href="/guide">실행 범위와 복구 방법 보기 ↗</Link></section></div><SchedulePreferences key={`schedule-${userId}`}/><WorkRecords key={userId}/></>}</MemberGate></ProgramShell>;
}
