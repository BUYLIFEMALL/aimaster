'use client';
import {useEffect,useRef,useState} from 'react';
type Row={id:string;neighbor_id:string;own_post_id:string;comment_id:string;return_post_id:string|null;observed_at:string;expires_at:string;reply_job_id:string|null;visit_job_id:string|null};
type Draft={id:string;kind:string;neighbor_id:string;post_id:string;parent_comment_id:string|null;body:string;state:string};
export function EngagementRecords(){
 const [rows,setRows]=useState<Row[]|null>(null),[draft,setDraft]=useState<Draft|null>(null),[body,setBody]=useState('');
 const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const lock=useRef(false),alive=useRef(true),controller=useRef<AbortController|null>(null);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;controller.current?.abort();};},[]);
 async function run(operation:string,payload:Record<string,unknown>={}){
  if(lock.current)return;lock.current=true;setBusy(true);setMessage('');
  const c=new AbortController();controller.current=c;const timer=setTimeout(()=>c.abort(),20000);
  // Discard previous approval UI before any request whose result could be lost.
  setDraft(null);
  try{
   const r=await fetch('/api/work',{method:'POST',credentials:'same-origin',cache:'no-store',signal:c.signal,
    headers:{'content-type':'application/json'},body:JSON.stringify({operation,payload})});
   const v=await r.json();if(!r.ok)throw Error(v.error||'작업 상태를 확인하지 못했습니다.');
   if(!alive.current)return;
   if(operation==='engagement_list'){
    if(!Array.isArray(v.data)||v.data.length>50)throw Error('대상 목록을 확인하지 못했습니다.');
    setRows(v.data);setBody('');setMessage('저장된 대상을 조회했습니다. 네이버 조회·AI 생성·등록은 실행하지 않았습니다.');
   }else if(operation==='approve'){
    if(v.data?.id!==payload.id||v.data.state!=='ready')throw Error('검토 결과를 확인하지 못했습니다.');
    setMessage('검토 완료로 저장했습니다. 실제 등록은 실행하지 않았습니다. 작업 기록에서 상태를 확인하세요.');
   }else{
    if(!v.data||!['draft','ready'].includes(v.data.state)||typeof v.data.id!=='string'||typeof v.data.body!=='string')throw Error('초안 결과를 확인하지 못했습니다. 작업 기록에서 현재 상태를 확인하세요.');
    setDraft(v.data);setRows(null);setBody(v.data.body);setMessage('초안을 불러왔습니다. 대상·원댓글·문장을 확인한 뒤 검토 완료로 저장하세요.');
   }
  }catch(e){if(alive.current){setRows(null);setMessage(c.signal.aborted?'응답을 확인하지 못했습니다. 자동 재요청하지 않습니다. 대상 목록과 작업 기록부터 다시 조회하세요.':e instanceof Error?e.message:'처리 결과를 확인하지 못했습니다.');}}
  finally{clearTimeout(timer);lock.current=false;if(alive.current)setBusy(false);}
 }
 return <section className="panel"><h2>답방·대댓글 준비</h2>
  <p>본인 글에 남겨진 원댓글을 확인한 기록으로 대댓글과 답방 초안을 준비합니다. 목록 조회·초안 저장·검토 완료는 네이버 등록을 실행하지 않습니다.</p>
  <p>실제 댓글 읽기와 브라우저 등록 연결은 준비 중입니다. 등록 직전 서로이웃 관계·원댓글·중복 여부를 다시 확인하며, 댓글과 대댓글은 이웃당 한국 날짜 기준 하루 1회를 함께 사용합니다.</p>
  <button className="primary" disabled={busy} onClick={()=>run('engagement_list')}>{busy?'처리 중…':'답방·대댓글 대상 조회'}</button>
  <p role="status">{message}</p>
  {rows?.length===0&&<p>저장된 대상이 없습니다. 네이버에 댓글이 없다는 뜻은 아닙니다.</p>}
  {!!rows?.length&&<><label>검토할 문장<textarea maxLength={4000} value={body} disabled={busy} onChange={e=>setBody(e.target.value)}/></label>
   <ul className="history">{rows.map(row=><li key={row.id}><h3>{row.neighbor_id}</h3><p>내 글 {row.own_post_id} · 원댓글 {row.comment_id}</p>
    <small>보관 기한 {new Date(row.expires_at).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'})}</small>
    <div className="actions"><button className="primary" disabled={busy||(!row.reply_job_id&&!body.trim())} onClick={()=>row.reply_job_id?run('engagement_review',{id:row.reply_job_id}):run('draft_reply',{id:row.id,body})}>{row.reply_job_id?'대댓글 초안 불러오기':'대댓글 초안 저장'}</button>
    <button className="primary" disabled={busy||(!row.visit_job_id&&(!body.trim()||!row.return_post_id))} onClick={()=>row.visit_job_id?run('engagement_review',{id:row.visit_job_id}):run('draft_return_visit',{id:row.id,body})}>{row.visit_job_id?'답방 초안 불러오기':row.return_post_id?`답방 글 ${row.return_post_id} 초안 저장`:'확인된 답방 글 없음'}</button></div>
   </li>)}</ul></>}
  {draft&&<div className="notice"><h3>{draft.kind==='reply'?'대댓글':'답방 댓글'} 초안 확인</h3><p>{draft.neighbor_id} · 글 {draft.post_id}{draft.parent_comment_id&&` · 원댓글 ${draft.parent_comment_id}`}</p>
   <p style={{whiteSpace:'pre-wrap'}}>{draft.body}</p>
   <label>문장 수정<textarea maxLength={4000} value={body} disabled={busy} onChange={e=>setBody(e.target.value)}/></label>
   <div className="actions"><button className="primary" disabled={busy||!body.trim()||body===draft.body} onClick={()=>run('edit',{id:draft.id,body})}>수정 내용 저장 · 다시 검토</button>
   <button className="primary" disabled={busy||draft.state!=='draft'||body!==draft.body} onClick={()=>run('approve',{id:draft.id})}>{draft.state==='ready'?'검토 완료됨':'이 내용으로 검토 완료 저장'}</button></div></div>}
 </section>;
}
