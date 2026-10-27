'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ModelPicker } from './ModelPicker';
import { selectionForProvider, isAnalysisSelection } from '../../lib/analysis/modelSelection';
import { analysis, request, blankPreferences, date, stateLabels, pendingIds, rememberPending, AnalysisResponseError, type Preferences, type Profile, type AnalysisJob, type JobSummary, type Material } from '../../lib/analysis/client';

type PostInput = { url: string; title: string; body: string; rightsConfirmed: boolean };
const blankPost = (): PostInput => ({ url: '', title: '', body: '', rightsConfirmed: false });

function PreferenceFields({ value, onChange, disabled }: { value: Preferences; onChange: (p: Preferences) => void; disabled: boolean }) {
  return <fieldset disabled={disabled}><legend>원하는 이웃의 기준</legend>
    <label className="field">꼭 만나고 싶은 주제 · 한 줄에 하나<textarea rows={2} maxLength={1600} value={value.requiredTopics.join('\n')} onChange={e => onChange({ ...value, requiredTopics: e.target.value.split('\n') })} /></label>
    <label className="field">피하고 싶은 주제 · 한 줄에 하나<textarea rows={2} maxLength={1600} value={value.excludedTopics.join('\n')} onChange={e => onChange({ ...value, excludedTopics: e.target.value.split('\n') })} /></label>
    <div className="field-pair"><label className="field">지역<input maxLength={100} value={value.region} onChange={e => onChange({ ...value, region: e.target.value })} placeholder="상관없으면 비워 두세요" /></label><label className="field">선호 규모<select value={value.scale} onChange={e => onChange({ ...value, scale: e.target.value as Preferences['scale'] })}><option value="any">상관없음</option><option value="small">소규모 블로그 선호</option></select></label></div>
    <label className="field">내 말투 예시 · 한 줄에 하나, 최대 10개<textarea rows={2} maxLength={5000} value={value.styleSamples.join('\n')} onChange={e => onChange({ ...value, styleSamples: e.target.value.split('\n') })} /></label>
  </fieldset>;
}
function normalizePreferences(p: Preferences): Preferences {
  return { ...p, requiredTopics: p.requiredTopics.map(x => x.trim()).filter(Boolean), excludedTopics: p.excludedTopics.map(x => x.trim()).filter(Boolean), styleSamples: p.styleSamples.map(x => x.trim()).filter(Boolean) };
}
function ProfileFields({ value, onChange, disabled }: { value: Profile; onChange: (p: Profile) => void; disabled: boolean }) {
  return <fieldset disabled={disabled}><legend>분석 내용 확인·수정</legend>
    {(['topics', 'interests', 'keywords', 'phrases'] as const).map(key => <label className="field" key={key}>{({ topics: '주제', interests: '관심사', keywords: '키워드', phrases: '실제 표현' })[key]} · 한 줄에 하나<textarea rows={2} value={value[key].join('\n')} onChange={e => onChange({ ...value, [key]: e.target.value.split('\n') })} /></label>)}
    <label className="field">주요 독자<input value={value.audience} maxLength={500} onChange={e => onChange({ ...value, audience: e.target.value })} /></label>
    <label className="field">문체·분위기<textarea rows={2} maxLength={500} value={value.tone} onChange={e => onChange({ ...value, tone: e.target.value })} /></label>
  </fieldset>;
}
function Evidence({ job, citations }: { job: AnalysisJob; citations: { sourceId: string; quote: string }[] }) {
  return <div className="citations">{citations.map((citation, i) => {
    const source = job.result?.sources?.find(s => s.id === citation.sourceId);
    return <blockquote key={`${citation.sourceId}-${i}`}>{citation.quote}<footer>{source ? <a href={`https://blog.naver.com/${encodeURIComponent(source.blogId)}/${encodeURIComponent(source.postId)}`} target="_blank" rel="noopener noreferrer">근거 글 열기 ↗{source.bodyTruncated ? ' · 일부 본문 분석' : ''}</a> : '제공된 본문 근거'}</footer></blockquote>;
  })}</div>;
}
export function AnalysisStudio({ userId, mode }: { userId: string; mode: 'profile' | 'candidates' }) {
  const [jobs, setJobs] = useState<JobSummary[]>([]), [materials, setMaterials] = useState<Material[]>([]);
  const [materialIds, setMaterialIds] = useState<string[]>([]), [selection, setSelection] = useState<string[]>([]);
  const [model, setModel] = useState(() => selectionForProvider('openai'));
  const [preferences, setPreferences] = useState<Preferences>(blankPreferences);
  const [job, setJob] = useState<AnalysisJob | null>(null), [profile, setProfile] = useState<Profile | null>(null);
  const [profileId, setProfileId] = useState(''), [posts, setPosts] = useState<PostInput[]>(() => Array.from({ length: 3 }, blankPost));
  const [confirmed, setConfirmed] = useState(false), [reviewConfirmed, setReviewConfirmed] = useState(false), [rights, setRights] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false), [busy, setBusy] = useState(false), [message, setMessage] = useState(''), [error, setError] = useState('');
  const [remembered, setRemembered] = useState<string[]>([]), [requestId, setRequestId] = useState('');
  const lock = useRef(false), alive = useRef(true);
  useEffect(() => { alive.current = true; setRemembered(pendingIds(userId)); return () => { alive.current = false; }; }, [userId]);
  const load = useCallback(async () => {
    const results = await Promise.allSettled([analysis<JobSummary[]>('list'), request<Material[]>('/api/reader/member', 'materials')]);
    if (!alive.current) return;
    if (results[0].status === 'fulfilled') setJobs(results[0].value);
    if (results[1].status === 'fulfilled') setMaterials(results[1].value);
    const failed = results.find(result => result.status === 'rejected');
    if (failed?.status === 'rejected') throw failed.reason;
  }, []);
  async function run(work: () => Promise<void>) {
    if (lock.current) return; lock.current = true; setBusy(true); setError(''); setMessage('');
    try { await work(); } catch (e) { if (alive.current) {
      if (e instanceof AnalysisResponseError && [401, 403].includes(e.status)) { setJob(null); setProfile(null); setJobs([]); setMaterials([]); setMaterialIds([]); setSelection([]); setRemembered([]); }
      setError(e instanceof Error ? e.message : '결과를 확인하지 못했습니다. 같은 요청을 자동으로 재실행하지 않습니다.');
    } }
    finally { lock.current = false; if (alive.current) setBusy(false); }
  }
  useEffect(() => { let cancelled = false; load().catch(e => { if (!cancelled) setError(e instanceof Error ? e.message : '목록을 확인하지 못했습니다.'); }); return () => { cancelled = true; }; }, [load]);
  async function open(id: string) {
    const result = await analysis<AnalysisJob>('get', { id });
    if (!alive.current) return;
    setJob(result); setSelection(result.selection || []); setReviewConfirmed(false); setRequestId(id);
    if (result.kind === 'profile') {
      setProfile(result.reviewedProfile?.profile || result.result?.profile || null);
      setPreferences(result.reviewedProfile?.preferences || result.preferences || blankPreferences());
    }
    if (['succeeded', 'cancelled'].includes(result.state)) { rememberPending(userId, id, true); setRemembered(pendingIds(userId)); }
  }
  async function generate() {
    if (!confirmed || !isAnalysisSelection(model)) throw new Error('AI 플랫폼·모델과 외부 전송 동의를 확인해 주세요.');
    let payload: Record<string, unknown>;
    if (mode === 'profile') {
      if (materialIds.length < 1 || materialIds.length > 20) throw new Error('같은 본인 블로그의 글을 1~20개 선택해 주세요.');
      payload = { materialIds, preferences: normalizePreferences(preferences) };
    } else {
      const selectedProfile = jobs.find(p => p.id === profileId && p.kind === 'profile' && p.state === 'succeeded' && p.revision > 0);
      if (!selectedProfile || !rights) throw new Error('확인한 프로필과 후보 글 사용 권한을 확인해 주세요.');
      const counts = new Map<string, number>();
      for (const post of posts) {
        let url; try { url = new URL(post.url); } catch { throw new Error('후보 글의 네이버 주소를 확인해 주세요.'); }
        const blogId = url.hostname === 'blog.naver.com' || url.hostname === 'm.blog.naver.com' ? (url.searchParams.get('blogId') || url.pathname.split('/')[1]) : '';
        if (!blogId || !post.title.trim() || !post.body.trim() || post.body.length > 6000 || !post.rightsConfirmed) throw new Error('후보 글마다 네이버 주소·제목·본문(최대 6,000자)·사용 권한을 확인해 주세요.');
        counts.set(blogId.toLowerCase(), (counts.get(blogId.toLowerCase()) || 0) + 1);
      }
      if (posts.length > 20 || [...counts.values()].some(n => n < 3 || n > 5) || posts.reduce((n, p) => n + p.body.length, 0) > 60000) throw new Error('블로그당 3~5개, 전체 3~20개 글·본문 합계 60,000자 이내로 제공해 주세요.');
      payload = { profileId, profileRevision: selectedProfile.revision, rightsConfirmed: true, posts };
    }
    const id = crypto.randomUUID(); setRequestId(id); rememberPending(userId, id); setRemembered(pendingIds(userId));
    try {
      const result = await analysis<AnalysisJob>(mode, { id, ...model, externalAiConfirmed: true, ...payload });
      if (!alive.current) return;
      setConfirmed(false); setAcknowledged(false);
      await open(result.id); await load(); setMessage(result.state === 'succeeded' ? '분석 결과를 저장했습니다. 내용을 확인해 주세요.' : '같은 요청의 기존 상태를 확인했습니다.');
    } catch (e) {
      // Never create a new request automatically after an unconfirmed response.
      if (e instanceof AnalysisResponseError && [400, 403, 404].includes(e.status) && !e.jobId) rememberPending(userId, id, true);
      await load().catch(() => {}); setRemembered(pendingIds(userId));
      throw e;
    }
  }
  const unresolved = [...new Set([...remembered, ...jobs.filter(j => j.state === 'running' || j.state === 'uncertain').map(j => j.id)])];
  const checkedProfiles = jobs.filter(j => j.kind === 'profile' && j.state === 'succeeded' && j.revision > 0);
  const shownJobs = jobs.filter(j => j.kind === mode);
  return <>
    <div className="page-heading"><div className="eyebrow">{mode === 'profile' ? '01 / 내 블로그 이해하기' : '02 / 후보 비교하기'}</div><h1>{mode === 'profile' ? '나를 알고, 닮은 이웃을 찾습니다.' : '근거를 나란히. 선택은 정확히.'}</h1><p>{mode === 'profile' ? '내가 전달한 글로 프로필을 만들고, 원하는 이웃의 기준을 직접 확인하세요.' : '회원이 제공한 후보 글의 주제 적합도를 비교합니다. 선택만으로 신청하지 않습니다.'}</p></div>
    <div className="workflow"><span>① 내 글 연결</span><span className={mode === 'profile' ? 'active' : ''}>② 프로필 확인</span><span className={mode === 'candidates' ? 'active' : ''}>③ 후보 비교·선택</span><span>자동 소통 · 준비 중</span></div>
    {(message || error) && <div className={error ? 'feedback error' : 'feedback'} role={error ? 'alert' : 'status'}>{error || message}</div>}
    {requestId && <div className="request-id">현재 요청 번호 <code>{requestId}</code><button disabled={busy} onClick={() => run(async () => { await open(requestId); await load(); })}>결과 상태 확인</button></div>}
    <div className="studio-grid"><section className="panel">
      <div className="section-head"><h2>{mode === 'profile' ? '분석할 내 글' : '평가할 후보 글'}</h2><button disabled={busy} onClick={() => run(load)}>목록 새로고침</button></div>
      {mode === 'profile' ? <>
        <p>같은 본인 블로그에서 전달한 글 1~20개를 선택합니다. 글 10개 미만이면 잠정 초안입니다.</p>
        {materials.length === 0 && <div className="empty"><h3>받은 글이 아직 없어요.</h3><p>목록을 확인하거나 내 글 연결 화면에서 본문을 전달해 주세요.</p><Link className="primary" href="/reader">내 글 연결하기 ↗</Link></div>}
        <div className="material-list">{materials.map(material => <label className="material" key={material.id}><input type="checkbox" disabled={busy} checked={materialIds.includes(material.id)} onChange={e => { setMaterialIds(ids => e.target.checked ? [...ids, material.id] : ids.filter(x => x !== material.id)); setConfirmed(false); }} /><span><strong>{material.title}</strong><small>{material.blog_id} · 보관 기한 {date(material.expires_at)}</small></span></label>)}</div>
        <PreferenceFields value={preferences} onChange={value => { setPreferences(value); setConfirmed(false); }} disabled={busy} />
      </> : <>
        <label className="field">확인한 내 프로필<select disabled={busy} value={profileId} onChange={e => { setProfileId(e.target.value); setConfirmed(false); }}><option value="">프로필을 선택해 주세요</option>{checkedProfiles.map(p => <option key={p.id} value={p.id}>{date(p.created_at)} · 확인본 {p.revision}</option>)}</select></label>
        {checkedProfiles.length === 0 && <p><Link href="/studio">내 프로필을 먼저 확인해 주세요 ↗</Link></p>}
        <p>블로그당 3~5개 글, 전체 최대 20개입니다. 후보 검색과 자동 본문 가져오기는 아직 제공하지 않습니다.</p>
        <div className="post-inputs">{posts.map((post, index) => <fieldset key={index} disabled={busy} className="post-input"><legend>후보 글 {index + 1}</legend><label className="field">네이버 글 주소<input type="url" maxLength={2048} value={post.url} onChange={e => { setPosts(values => values.map((p, i) => i === index ? { ...p, url: e.target.value } : p)); setConfirmed(false); }} placeholder="https://blog.naver.com/블로그ID/글번호" /></label><label className="field">제목<input maxLength={500} value={post.title} onChange={e => { setPosts(values => values.map((p, i) => i === index ? { ...p, title: e.target.value } : p)); setConfirmed(false); }} /></label><label className="field">사용 권한을 확인한 본문 · 최대 6,000자<textarea rows={4} maxLength={6000} value={post.body} onChange={e => { setPosts(values => values.map((p, i) => i === index ? { ...p, body: e.target.value } : p)); setConfirmed(false); }} /></label><label className="check"><input type="checkbox" checked={post.rightsConfirmed} onChange={e => { setPosts(values => values.map((p, i) => i === index ? { ...p, rightsConfirmed: e.target.checked } : p)); setConfirmed(false); }} />이 글의 본문을 제공·분석할 권한을 확인했습니다.</label>{posts.length > 3 && <button onClick={() => { setPosts(values => values.filter((_, i) => i !== index)); setConfirmed(false); }}>이 글 제외</button>}</fieldset>)}</div>
        <button disabled={busy || posts.length >= 20} onClick={() => { setPosts(values => [...values, blankPost()]); setConfirmed(false); }}>후보 글 추가</button>
        <label className="check"><input type="checkbox" disabled={busy} checked={rights} onChange={e => setRights(e.target.checked)} />제공하는 모든 후보 글의 사용 권한을 확인했습니다.</label>
      </>}
      <ModelPicker value={model} disabled={busy} onChange={value => { setModel(value); setConfirmed(false); }} label={mode === 'profile' ? '프로필 분석' : '후보 평가'} />
      <div className="cost-notice"><strong>유료 AI 분석을 실행하기 전에</strong><p>선택한 플랫폼·모델에 글의 제목과 본문을 전송합니다. 회원 본인 키에 사용료가 발생할 수 있습니다. 입력 길이·응답량에 따라 금액이 달라지며 확정 견적은 제공하지 않습니다.</p></div>
      <label className="check"><input type="checkbox" checked={confirmed} disabled={busy} onChange={e => setConfirmed(e.target.checked)} />선택한 자료의 외부 AI 전송과 사용료 발생 가능성을 확인했습니다.</label>
      {unresolved.length > 0 && <div className="uncertain"><strong>이전 요청의 결과를 먼저 확인해 주세요.</strong>{unresolved.map(id => <button key={id} disabled={busy} onClick={() => run(() => open(id))}>요청 {id.slice(0, 8)} 상태 확인</button>)}<label className="check"><input type="checkbox" checked={acknowledged} disabled={busy} onChange={e => setAcknowledged(e.target.checked)} />이전 요청이 과금됐을 수 있음을 확인했고, 별도 새 분석을 요청합니다.</label></div>}
      <button className="primary" disabled={busy || !confirmed || !isAnalysisSelection(model) || (unresolved.length > 0 && !acknowledged)} onClick={() => run(generate)}>{busy ? '요청 확인 중…' : mode === 'profile' ? '선택한 글로 프로필 분석' : '제공한 글로 후보 평가'}</button>
      <small>모델 변경·페이지 열기·새로고침만으로 AI를 호출하지 않습니다.</small>
    </section><section className="panel result-panel"><div className="section-head"><h2>{mode === 'profile' ? '프로필 확인·수정' : '후보 평가 결과'}</h2>{job && <span className="badge">{stateLabels[job.state]}</span>}</div>
      {!job && <div className="empty"><h3>저장된 결과를 열어 주세요.</h3><p>아래 이전 분석 목록에서 선택하거나 왼쪽에서 새 분석을 요청할 수 있습니다.</p></div>}
      {job && <><p>{job.provider} · {job.model}<br /><small>보관 기한 {date(job.expiresAt)} · 수정·재조회로 연장되지 않습니다.</small></p>
        {job.state === 'queued' && <div className="notice"><p>아직 실행 대기 상태입니다. 키 등록·입력 조건을 확인하세요. 이 대기를 취소한 후 새 분석을 직접 요청할 수 있습니다.</p><button disabled={busy} onClick={() => run(async () => { await analysis('cancel', { id: job.id }); await open(job.id); await load(); setMessage('실행 전 대기를 취소했습니다.'); })}>이 대기 취소</button></div>}
        {(job.state === 'running' || job.state === 'uncertain') && <div className="notice"><strong>{stateLabels[job.state]}</strong><p>실제 호출·과금 여부가 확실하지 않을 수 있습니다. 같은 요청을 자동으로 다시 실행하지 않습니다. 위의 결과 상태 확인 버튼을 이용하세요.</p></div>}
        {job.kind === 'profile' && job.state === 'succeeded' && profile && <>
          {job.result?.provisional && <p className="notice">글 {job.result.sampleCount}개를 사용한 잠정 초안입니다. 최근 글 전체를 조사한 결과가 아닙니다.</p>}
          <ProfileFields value={profile} disabled={busy} onChange={value => { setProfile(value); setReviewConfirmed(false); }} />
          <PreferenceFields value={preferences} disabled={busy} onChange={value => { setPreferences(value); setReviewConfirmed(false); }} />
          <details><summary>AI 원래 초안·근거 보기</summary><pre>{JSON.stringify(job.result?.profile, null, 2)}</pre><Evidence job={job} citations={job.result?.evidence || []} /></details>
          <label className="check"><input type="checkbox" disabled={busy} checked={reviewConfirmed} onChange={e => setReviewConfirmed(e.target.checked)} />프로필과 원하는 이웃의 기준을 직접 확인했습니다.</label>
          <button className="primary" disabled={busy || !reviewConfirmed} onClick={() => run(async () => {
            const normalized = { ...profile, topics: profile.topics.map(x => x.trim()).filter(Boolean), interests: profile.interests.map(x => x.trim()).filter(Boolean), phrases: profile.phrases.map(x => x.trim()).filter(Boolean), keywords: profile.keywords.map(x => x.trim()).filter(Boolean) };
            await analysis('review_profile', { id: job.id, revision: job.revision, profile: normalized, preferences: normalizePreferences(preferences), confirmed: true }); await open(job.id); await load(); setMessage('회원 확인본을 저장했습니다. 기존 후보 평가는 이전 기준이 될 수 있습니다.');
          })}>확인한 프로필 저장</button>
          {job.revision > 0 && <Link className="secondary-link" href="/candidates">확인본 {job.revision} · 후보 비교로 이동 ↗</Link>}
        </>}
        {job.kind === 'candidates' && job.state === 'succeeded' && <>
          {job.profileStale && <p className="feedback error">프로필이 바뀌었습니다. 이전 기준의 평가이므로 후보를 선택할 수 없습니다.</p>}
          <p className="notice">점수는 제공된 글의 잠정 주제 적합도입니다. 활동·진정성·이웃 관계를 확인한 종합 점수가 아닙니다.</p>
          <div className="table-scroll"><table><caption>후보별 잠정 주제 적합도</caption><thead><tr><th>선택</th><th>블로그</th><th>주제점수</th><th>관계</th></tr></thead><tbody>{job.result?.candidates?.map(candidate => <tr key={candidate.blogId}><td><input type="checkbox" aria-label={`${candidate.blogId} 선택`} disabled={busy || job.profileStale} checked={selection.includes(candidate.blogId)} onChange={e => setSelection(ids => e.target.checked ? [...ids, candidate.blogId] : ids.filter(id => id !== candidate.blogId))} /></td><td><strong>{candidate.blogId}</strong><small>제공 글 {candidate.sourcePostCount}개</small></td><td><b className="score">{candidate.topicScore}</b><small>잠정</small></td><td>미확인</td></tr>)}</tbody></table></div>
          {job.result?.candidates?.map(candidate => <details key={candidate.blogId}><summary>{candidate.blogId} · 이유와 근거</summary><ul>{candidate.reasons.map((reason, i) => <li key={i}>{reason}</li>)}</ul><Evidence job={job} citations={candidate.evidence} /></details>)}
          <div className="section-head"><b>{selection.length}명 선택</b><small>실제 이웃 신청 없음</small></div><button className="primary" disabled={busy || job.profileStale} onClick={() => run(async () => { await analysis('select_candidates', { id: job.id, blogIds: selection }); await open(job.id); setMessage('선택한 후보를 저장했습니다. 이웃 신청·공감·댓글은 실행하지 않았습니다.'); })}>선택한 후보 저장</button>
        </>}
      </>}
      <div className="divider" /><h3>이전 분석</h3><div className="history">{shownJobs.length === 0 && <p>목록에 표시할 분석이 없습니다.</p>}{shownJobs.map(item => <button disabled={busy} key={item.id} onClick={() => run(() => open(item.id))}><span>{date(item.created_at)}<small>{item.id.slice(0, 8)} · 보관 기한 {date(item.expires_at)}</small></span><span className="badge">{stateLabels[item.state]}</span></button>)}</div>
    </section></div>
  </>;
}
