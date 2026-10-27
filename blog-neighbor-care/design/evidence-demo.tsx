import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { CandidateEvidence } from '../src/components/analysis/CandidateEvidence';
import type { RelationshipEvidence, SearchActivity } from '../src/lib/search/evidence';
const activity: SearchActivity = { scope: 'single-search-response', observedPostCount: 3, observedRecent30DayCount: 2,
  latestObservedPostDate: '2026-10-26', windowStartDate: '2026-09-28', asOfDate: '2026-10-27', fullCoverage: false, inactivityConfirmed: false, activityScore: null };
function Demo() {
  const [state, setState] = useState('missing');
  const cases = [['missing','기록 없음'],['pending','신청 대기'],['mutual','최근 서로이웃 기록'],['stale','오래된 서로이웃 기록']];
  const relation: RelationshipEvidence = { state: state === 'pending' ? 'pending' : state === 'mutual' ? 'mutual' : 'unknown',
    recordedState: state === 'stale' ? 'mutual' : state, observedAt: state === 'missing' ? null : new Date(Date.now() - (state === 'stale' ? 600000 : 0)).toISOString(),
    freshness: state === 'missing' ? 'missing' : state === 'stale' ? 'stale' : 'fresh', source: state === 'missing' ? 'none' : 'server-relationship-record', canAutoEngage: false };
  return <div className="bnc-app"><aside className="bnc-sidebar"><div className="bnc-brand"><span>N↗</span><strong>AI 블로그<br />이웃 소통 자동화</strong><small>RELAY DESK</small></div><p>릴레이 데스크 · 네이버 그린</p></aside><div className="bnc-workspace"><header className="bnc-top"><strong>후보 근거 표시</strong><span className="badge">합성 자료 · 운영 회원 데이터 없음</span></header><main><div className="page-heading"><h1>확인한 범위만 보여드립니다.</h1><p>실제 화면과 같은 CandidateEvidence 컴포넌트입니다. 네트워크·DB·AI·네이버 연결 없이 상태별 표시를 확인합니다.</p></div><section className="panel"><div className="lead-actions" role="group" aria-label="합성 관계 기록">{cases.map(([value,label])=><button key={value} className={state===value?'primary':''} aria-pressed={state===value} onClick={()=>setState(value)}>{label}</button>)}</div><h2>후보 블로그 · 합성 예시</h2><CandidateEvidence activity={activity} relationship={relation} /><p className="notice">이 화면은 실제 수집·관계 확인·종합 평가 완료를 뜻하지 않습니다. 종합 점수·외부 동작은 제공하지 않습니다.</p></section></main></div></div>;
}
createRoot(document.getElementById('root')!).render(<Demo />);
