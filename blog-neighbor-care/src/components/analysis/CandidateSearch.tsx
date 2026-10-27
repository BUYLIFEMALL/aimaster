'use client';
import { useEffect, useRef, useState } from 'react';
import { analysis, type AnalysisJob } from '../../lib/analysis/client';
type Lead = { blogId: string; postId: string; title: string; summary: string; summaryMatchCount: number; postdate: string; url: string };
type SearchResult = { candidates: Lead[]; fetchedCount: number; searchedAt: string; expiresAt: string };
export function CandidateSearch({ profileId, disabled, onPick }: { profileId: string; disabled: boolean; onPick: (lead: Lead) => boolean }) {
  const [query, setQuery] = useState(''), [confirmed, setConfirmed] = useState(false), [busy, setBusy] = useState(false);
  const [result, setResult] = useState<SearchResult | null>(null), [message, setMessage] = useState('');
  const [keywords, setKeywords] = useState<string[]>([]);
  const lock = useRef(false), controller = useRef<AbortController | null>(null), alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; controller.current?.abort(); }; }, []);
  useEffect(() => {
    if (!profileId) return;
    let cancelled = false;
    analysis<AnalysisJob>('get', { id: profileId }).then(profile => { if (!cancelled) setKeywords(profile.reviewedProfile?.profile.keywords || []); }).catch(() => { if (!cancelled) setMessage('프로필 키워드를 확인하지 못했습니다. 프로필 상태부터 확인해 주세요.'); });
    return () => { cancelled = true; };
  }, [profileId]);
  async function search() {
    if (lock.current || !confirmed || !profileId || !query.trim()) return;
    lock.current = true; setBusy(true); setMessage(''); setResult(null);
    const current = new AbortController(); controller.current = current;
    const timer = setTimeout(() => current.abort(), 30000);
    try {
      const response = await fetch('/api/candidates/search', { method: 'POST', credentials: 'same-origin', cache: 'no-store', signal: current.signal, headers: { 'content-type': 'application/json' }, body: JSON.stringify({ profileId, query, quotaConfirmed: true }) });
      const json = await response.json();
      if (!response.ok) throw new Error(typeof json.error === 'string' ? json.error : '검색 결과를 확인하지 못했습니다.');
      if (alive.current) { setResult(json.data); setConfirmed(false); setMessage('검색 요약을 확인했습니다. 본문 분석이나 이웃 관계 확인 결과는 아닙니다.'); }
    } catch (error) { if (alive.current) setMessage(current.signal.aborted ? '검색 응답을 제때 확인하지 못했습니다. 자동으로 다시 호출하지 않습니다.' : error instanceof Error ? error.message : '검색 결과를 확인하지 못했습니다.'); }
    finally { clearTimeout(timer); lock.current = false; if (alive.current) setBusy(false); }
  }
  return <section className="candidate-search" aria-labelledby="candidate-search-heading"><h3 id="candidate-search-heading">키워드로 후보 글 찾기</h3><p>회원 본인의 NAVER API HUB 검색 키를 사용합니다. 검색 요약만 가져오며 AI를 호출하지 않습니다.</p>
    {keywords.length > 0 && <div className="profile-keywords"><small>확인한 프로필 키워드 · 누르면 검색어에 넣습니다</small>{keywords.map(keyword => <button key={keyword} disabled={disabled || busy} onClick={() => { setQuery(keyword); setConfirmed(false); }}>{keyword}</button>)}</div>}
    <fieldset disabled={disabled || busy || !profileId}><label className="field">검색어<input maxLength={100} value={query} onChange={e => { setQuery(e.target.value); setConfirmed(false); }} placeholder="예: 소규모 사업 업무 자동화" /></label><label className="check"><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />검색어를 NAVER API HUB에 보내고 내 검색 API 사용량을 사용하는 데 동의합니다.</label><button className="primary" disabled={!confirmed || !query.trim()} onClick={search}>{busy ? '검색 중…' : '후보 글 검색 · 최대 20개'}</button></fieldset>
    {!profileId && <small>위에서 확인한 프로필을 먼저 선택해 주세요.</small>}<div role="status">{message}</div>
    {result && <><small>검색 응답 {result.fetchedCount}개 → 본인 블로그·중복·주소·날짜·요약 키워드를 확인한 후보 {result.candidates.length}개. 활동·관계는 미확인입니다.</small><div className="search-leads">{result.candidates.map(lead => <article key={lead.blogId}><div className="section-head"><strong>{lead.blogId}</strong><span className="badge">검색 요약</span></div><h3>{lead.title}</h3><p>{lead.summary}</p><small>작성일 {lead.postdate} · 요약 키워드 포함 {lead.summaryMatchCount}개 · AI 점수 아님</small><div className="lead-actions"><a href={`https://blog.naver.com/${encodeURIComponent(lead.blogId)}/${encodeURIComponent(lead.postId)}`} target="_blank" rel="noopener noreferrer">원문 직접 열기 ↗</a><button disabled={disabled || busy} onClick={() => setMessage(onPick(lead) ? '주소와 제목만 후보 글 칸에 넣었습니다. 본문을 직접 확인하고 사용 권한을 체크해 주세요. 블로그당 3~5개 글이 필요합니다.' : '후보 글 입력이 최대 20개입니다. 먼저 필요 없는 글을 제외해 주세요.')}>이 글 주소·제목 사용</button></div></article>)}</div>{result.candidates.length === 0 && <p>조건에 맞는 네이버 후보가 없습니다. 다른 검색어를 사용할지 직접 선택해 주세요.</p>}</>}
  </section>;
}
