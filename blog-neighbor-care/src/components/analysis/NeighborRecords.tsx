'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { Account } from '../../lib/neighbors/api';
import type { RelationshipEvidence } from '../../lib/search/evidence';
import { relationshipLabel } from './CandidateEvidence';
import {NeighborImportPanel} from './NeighborImportPanel';
type Row = { blogId: string; relationship: RelationshipEvidence };
type Page = { account: Account; records: Row[]; nextCursor: string | null };
class RecordError extends Error { constructor(message:string,readonly status:number){super(message);} }
async function read<T>(operation: string, payload: Record<string,unknown>, controller: AbortController): Promise<T> {
  const timer = setTimeout(()=>controller.abort(),20000);
  try {
    const response = await fetch('/api/neighbors',{method:'POST',credentials:'same-origin',cache:'no-store',signal:controller.signal,
      headers:{'content-type':'application/json'},body:JSON.stringify({operation,...payload})});
    const result = await response.json();
    if (!response.ok) throw new RecordError(typeof result.error === 'string' ? result.error : '관계 기록을 확인하지 못했습니다.',response.status);
    return result.data as T;
  } finally { clearTimeout(timer); }
}
export function NeighborRecords() {
  const [accounts,setAccounts] = useState<Account[]>([]), [accountId,setAccountId] = useState('');
  const [rows,setRows] = useState<Row[]>([]), [cursor,setCursor] = useState<string|null>(null), [loaded,setLoaded] = useState(false);
  const [busy,setBusy] = useState(false), [message,setMessage] = useState(''), [filter,setFilter] = useState('all'), [clock,setClock] = useState(Date.now);
  const current = useRef<AbortController|null>(null), sequence = useRef(0), lock = useRef(false);
  useEffect(()=>{
    let alive=true;
    const controller = new AbortController(); current.current = controller;
    read<{accounts:Account[];truncated:boolean}>('accounts',{},controller).then(data=>{
      if (controller.signal.aborted) return;
      setAccounts(data.accounts); setAccountId(data.accounts[0]?.id || '');
      if (data.truncated) setMessage('연결된 계정 중 앞 20개만 표시합니다.');
    }).catch(()=>{if(alive)setMessage('연결된 계정을 확인하지 못했습니다. 새로고침할지 직접 선택해 주세요.');});
    return ()=>{alive=false;sequence.current++;controller.abort();current.current?.abort();};
  },[]);
  useEffect(()=>{
    const upcoming = rows.map(row=>Date.parse(row.relationship.observedAt || '')+300000).filter(t=>Number.isFinite(t)&&t>clock);
    if (!upcoming.length) return;
    const timer=setTimeout(()=>setClock(Date.now()),Math.min(Math.max(1,Math.min(...upcoming)-Date.now()+1),300001));
    return ()=>clearTimeout(timer);
  },[rows,clock]);
  function choose(id:string) {
    sequence.current++;current.current?.abort();lock.current=false;setBusy(false);setAccountId(id);setRows([]);setCursor(null);setLoaded(false);setMessage('');
  }
  async function load(more=false) {
    if(lock.current||!accountId)return;lock.current=true;setBusy(true);setMessage('');
    const ticket=++sequence.current, controller=new AbortController();current.current=controller;
    if(!more){setRows([]);setCursor(null);setLoaded(false);}
    try{
      const data=await read<Page>('list',{accountId,cursor:more?cursor:null},controller);
      if(controller.signal.aborted||ticket!==sequence.current)return;
      setRows(previous=>more?[...previous,...data.records.filter(row=>!previous.some(old=>old.blogId===row.blogId))]:data.records);
      setCursor(data.nextCursor);setLoaded(true);setClock(Date.now());
    }catch(error){if(ticket===sequence.current){
      if(error instanceof RecordError&&[401,403].includes(error.status)){setAccounts([]);setAccountId('');setRows([]);setLoaded(false);setCursor(null);}
      setMessage(controller.signal.aborted?'조회 응답을 제때 확인하지 못했습니다. 자동으로 다시 요청하지 않습니다.':error instanceof Error?error.message:'관계 기록을 확인하지 못했습니다.');
    }}
    finally{if(ticket===sequence.current){lock.current=false;setBusy(false);}}
  }
  const visible=rows.filter(row=>filter==='all'||row.relationship.recordedState===filter);
  return <>
    <div className="page-heading"><div className="eyebrow">NEIGHBORS / 관계 기록</div><h1>내 블로그별 관계를 확인하세요.</h1><p>프로그램에 저장된 기록을 조회합니다. AI 분석이나 네이버 접속을 실행하지 않습니다.</p></div>
    <section className="panel"><p className="notice">가져온 이웃 목록과 서버 관계 기록을 구분합니다. 가져온 표시나 대상 설정만으로 현재 관계를 단정하거나 외부 소통을 실행하지 않습니다. 읽기 허용·지원 화면 검수와 운영 반영이 먼저 필요합니다.</p>
      <label className="field">내 연결 블로그<select value={accountId} onChange={e=>choose(e.target.value)}><option value="">계정을 선택하세요</option>{accounts.map(account=><option key={account.id} value={account.id}>{account.blogId}</option>)}</select></label>
      {!accounts.length&&<p>표시할 연결 계정이 없으면 <Link href="/reader">내 글 연결</Link>에서 본인 블로그 연결 상태를 확인하세요.</p>}
      {accountId&&<NeighborImportPanel key={accountId} accountId={accountId}/>}
      <button className="primary" disabled={busy||!accountId} onClick={()=>load()}>관계 기록 {loaded?'다시 조회':'조회'}</button>
      <div role="status">{busy?'저장된 기록을 조회하는 중입니다.':message}</div>
      {loaded&&<><p>현재 불러온 기록 {rows.length}건 · 네이버 전체 이웃 수가 아닙니다.</p><label className="field">불러온 기록에서 보기<select value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">전체 기록</option><option value="mutual">서로이웃 기록</option><option value="pending">신청 대기 기록</option><option value="removed">관계 해제 기록</option><option value="unknown">미확인 기록</option></select></label>
        <div className="table-scroll"><table><caption>선택한 본인 블로그의 서버 관계 기록</caption><thead><tr><th>블로그</th><th>관계 기록</th><th>기록 시각</th></tr></thead><tbody>{visible.map(row=><tr key={row.blogId}><td>{row.blogId}</td><td>{relationshipLabel(row.relationship,clock)}{row.relationship.freshness==='stale'&&<small>이전 기록: {({mutual:'서로이웃',pending:'신청 대기',removed:'관계 해제',unknown:'미확인'} as Record<string,string>)[row.relationship.recordedState||'unknown']}</small>}</td><td>{row.relationship.observedAt?new Date(row.relationship.observedAt).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'}):'없음'}</td></tr>)}</tbody></table></div>
        {!rows.length&&<p>프로그램에 저장된 관계 기록이 없습니다. 실제 이웃이 없다는 뜻이 아닙니다.</p>}
        {rows.length>0&&!visible.length&&<p>현재 불러온 범위에 이 상태의 기록이 없습니다.</p>}
        {cursor&&<button className="primary" disabled={busy} onClick={()=>load(true)}>다음 기록 50개까지 불러오기</button>}
      </>}
    </section>
  </>;
}
