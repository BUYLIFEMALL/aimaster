'use client';
import {useEffect,useRef,useState} from 'react';
import {freshRequestObservation,type RequestStatus} from '../../lib/execution/requestStatus';
type Job={id:string;state:string;kind:string;neighbor_id:string;actor_id?:string;post_id?:string;parent_comment_id?:string;body:string;created_at:string;expires_at:string};
const states:Record<string,string>={draft:'초안',ready:'검토 완료 · 실행 전',claimed:'실행 준비 중',armed:'등록 허가 발급됨',succeeded:'성공 확인',uncertain:'결과 불확실 · 재실행 금지',failed_no_effect:'미실행 확인',skipped:'중단됨'};
const kinds:Record<string,string>={request:'이웃 신청',like:'공감',comment:'댓글',reply:'답글'};
const relationLabels:Record<string,string>={not_requested:'신청 전 또는 미실행 확인',pending:'신청 대기 확인',accepted:'서로이웃 수락 확인',removed:'관계 해제 확인',unknown:'현재 수락 여부 미확인'};
export function WorkRecords(){
 const [jobs,setJobs]=useState<Job[]|null>(null),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const [reviewed,setReviewed]=useState('');
 const [relations,setRelations]=useState<RequestStatus[]>([]),[clock,setClock]=useState(Date.now);
 const lock=useRef(false),alive=useRef(true),controller=useRef<AbortController|null>(null);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;controller.current?.abort();};},[]);
 useEffect(()=>{if(!relations.length)return;const timer=setInterval(()=>setClock(Date.now()),30000);return()=>clearInterval(timer);},[relations]);
 async function run(id?:string,approve=false){
  if(lock.current)return;lock.current=true;setBusy(true);setMessage('');setReviewed('');const c=new AbortController();controller.current=c;const timer=setTimeout(()=>c.abort(),20000);
  async function call(operation:string,payload:Record<string,unknown>={}){
   const response=await fetch('/api/work',{method:'POST',credentials:'same-origin',cache:'no-store',signal:c.signal,headers:{'content-type':'application/json'},body:JSON.stringify({operation,payload})});
   const result=await response.json();if(!response.ok)throw new Error(result.error||'작업 상태를 확인하지 못했습니다.');return result.data;
  }
  try{
   let outcome='';
   if(id&&approve){const job=jobs?.find(j=>j.id===id);if(!job)throw Error('작업을 다시 조회하세요.');const r=await call('review_approve',{id,expected_body:job.body});if(r.id!==id||r.state!=='ready')throw Error('검토 저장 결과 미확인');outcome='확인한 내용으로 검토 완료 저장했습니다. 실제 등록은 실행하지 않았습니다.';}
   else if(id){const r=await call('cancel',{id});outcome=r.resultCheckRequired?'중단을 요청했습니다. 이미 실행됐을 수 있어 결과 확인이 필요합니다. 자동으로 다시 실행하지 않습니다.':r.cancelled?'실행 전 작업을 중단했습니다.':r.state==='succeeded'?'이미 성공한 작업입니다. 취소하거나 다시 실행하지 않았습니다.':'현재 작업 상태를 확인해 주세요.';}
   const rows=await call('list');let relationshipRows:RequestStatus[]=[],relationNote='';
   if(Array.isArray(rows)&&rows.some(job=>job.kind==='request')){
    try{
     const r=await call('request_status');
     if(r.externalActions!==0||!Array.isArray(r.requests)||r.requests.length>50||r.requests.some((item:RequestStatus)=>!item||!Object.hasOwn(relationLabels,item.state)||typeof item.jobId!=='string'||typeof item.cancellationSuggested!=='boolean'))throw Error('관계 기록 형식 미확인');
     relationshipRows=r.requests;
    }catch{relationNote=' 신청 상태 기록은 확인하지 못했습니다. 현재 수락 여부를 추측하지 않습니다.';}
   }
   if(alive.current){setJobs(rows);setRelations(relationshipRows);setClock(Date.now());setMessage((outcome||'최근 작업을 최대 50개 조회했습니다. 네이버에 새 요청을 보내지 않았습니다.')+relationNote);}
  }catch(e){if(alive.current){setJobs(null);setRelations([]);setMessage(c.signal.aborted?'응답을 확인하지 못했습니다. 자동으로 재요청하지 않습니다. 작업 기록부터 다시 조회해 주세요.':e instanceof Error?e.message:'작업 상태를 확인하지 못했습니다.');}}
  finally{clearTimeout(timer);lock.current=false;if(alive.current)setBusy(false);}
 }
 return <section className="panel"><h2>작업 대기·결과 기록</h2><p>저장된 작업을 조회하고, 계정·대상·문장을 확인해 검토 완료로 저장하거나 실행 전 작업을 중단합니다. 이 화면에서 이웃 신청·공감·댓글·답글을 새로 실행하지 않습니다.</p>
  <button className="primary" disabled={busy} onClick={()=>run()}>{busy?'상태 확인 중…':'작업 기록 조회'}</button><p role="status">{message}</p>
  {jobs?.length===0&&<p>보관 중인 작업이 없습니다.</p>}
  {jobs&&jobs.length>0&&<ul className="history">{jobs.map(job=>{const relation=relations.find(r=>r.jobId===job.id),fresh=relation&&freshRequestObservation(relation.checkedAt,clock);
   const label=relation?(relation.state==='not_requested'?relation.state:fresh?relation.state:'unknown'):'unknown';
   return <li key={job.id}><h3>{kinds[job.kind]||job.kind} · {job.neighbor_id}</h3><p>{states[job.state]||job.state}</p><small>자료 보관 기한 {new Date(job.expires_at).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'})}</small>
   {job.kind==='request'&&<div className="notice"><strong>{relationLabels[label]}</strong><p>서버에 저장된 관계 확인 기록입니다. 조회만으로 네이버에 접속하지 않으며, 5분이 지난 기록은 현재 상태로 표시하지 않습니다.</p>
    {relation?.requestedAt&&<small>신청 확인 시각: {new Date(relation.requestedAt).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'})}</small>}
    {fresh&&relation?.cancellationSuggested&&label==='pending'&&<p>신청 확인 후 7일 이상 대기 중입니다. 네이버에서 현재 상태를 확인한 뒤 취소를 검토하세요. 자동으로 취소하지 않습니다.</p>}
   </div>}
   <p>내 계정 {job.actor_id??'미확인'} → {job.neighbor_id} · 글 {job.post_id||'프로필'}{job.parent_comment_id&&` · 원댓글 ${job.parent_comment_id}`}</p>{['draft','ready'].includes(job.state)&&<pre>{job.body}</pre>}
   {['draft','ready'].includes(job.state)&&job.actor_id&&<><label><input type="checkbox" disabled={busy} checked={reviewed===job.id} onChange={e=>setReviewed(e.target.checked?job.id:'')}/>이 계정·대상·문장을 확인했습니다.</label><button className="primary" disabled={busy||reviewed!==job.id} onClick={()=>run(job.id,true)}>{job.state==='ready'?'현재 기준으로 다시 검토 완료':'확인한 내용으로 검토 완료'}</button></>}
   {['draft','ready','claimed','armed'].includes(job.state)&&<button disabled={busy} onClick={()=>run(job.id)}>{job.state==='armed'?'중단 요청 · 결과 확인 필요':'이 작업 중단'}</button>}
   {job.state==='uncertain'&&<p>결과를 확인하기 전에는 다시 실행할 수 없습니다.</p>}
  </li>;})}</ul>}
 </section>;
}
