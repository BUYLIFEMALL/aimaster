'use client';
import { useEffect, useState } from 'react';
import type { RelationshipEvidence, SearchActivity } from '../../lib/search/evidence';

export function relationshipLabel(evidence: RelationshipEvidence | undefined, now: number) {
  if (!evidence || evidence.freshness === 'missing') return '관계 미확인 · 서버 기록 없음';
  if (evidence.freshness === 'invalid') return '관계 미확인 · 기록 점검 필요';
  const stamp = Date.parse(evidence.observedAt || '');
  if (evidence.freshness !== 'fresh' || !Number.isFinite(stamp) || now < stamp || now - stamp >= 300000)
    return '관계 미확인 · 기록이 오래되어 다시 확인 필요';
  const labels = { unknown: '관계 미확인', pending: '서버 기록: 신청 대기', mutual: '서버 기록: 서로이웃', removed: '서버 기록: 관계 해제' };
  return labels[evidence.state] || '관계 미확인';
}
export function CandidateEvidence({ activity, relationship }: { activity?: SearchActivity; relationship?: RelationshipEvidence }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    setNow(Date.now());
    const expiry = Date.parse(relationship?.observedAt || '') + 300000;
    if (!Number.isFinite(expiry) || expiry <= Date.now()) return;
    const timer = setTimeout(() => setNow(Date.now()), Math.min(expiry - Date.now() + 1, 300001));
    return () => clearTimeout(timer);
  }, [relationship?.observedAt]);
  return <div className="candidate-evidence">
    {activity && <p>이번 검색에서 확인한 글 {activity.observedPostCount}개 · 최근 30일 범위 내 최소 {activity.observedRecent30DayCount}개<br />
      <small>{activity.windowStartDate}~{activity.asOfDate} KST · 확인한 글 중 최신 작성일 {activity.latestObservedPostDate || '없음'}. 검색에 빠진 글은 포함하지 않으며, 전체 활동량·휴면 여부를 판정하지 않습니다.</small></p>}
    <p>{relationshipLabel(relationship, now)}{relationship?.observedAt && <><br /><small>기록 시각 {relationship.observedAt} · 현재 네이버 화면에서 새로 확인한 결과가 아닙니다.</small></>}</p>
    <small>종합 점수 보류 · 전체 활동·진정성·소통 성향 근거가 더 필요합니다.</small>
  </div>;
}
