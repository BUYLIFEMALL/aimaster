'use client';
import {useEffect,useRef,useState} from 'react';
type Job={id:string;state:string;kind:string;neighbor_id:string;body:string;created_at:string;expires_at:string};
const states:Record<string,string>={draft:'초안',ready:'검토 완료 · 실행 전',claimed:'실행 준비 중',armed:'등록 허가 발급됨',succeeded:'성공 확인',uncertain:'결과 불확실 · 재실행 금지',failed_no_effect:'미실행 확인',skipped:'중단됨'};
const kinds:Record<string,string>={request:'이웃 신청',like:'공감',comment:'댓글',reply:'답글'};
export function WorkRecords(){
 const [jobs,setJobs]=useState<Job[]|null>(null),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const lock=useRef(false),alive=useRef(true),controller=useRef<AbortController|null>(null);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;controller.current?.abort();};},[]);
 async function run(id?:string){
  if(lock.current)return;lock.current=true;setBusy(true);setMessage('');const c=new AbortController();controller.current=c;const timer=setTimeout(()=>c.abort(),20000);
  async function call(operation:string,payload:Record<string,unknown>={}){
   const response=await fetch('/api/work',{method:'POST',credentials:'same-origin',cache:'no-store',signal:c.signal,headers:{'content-type':'application/json'},body:JSON.stringify({operation,payload})});
   const result=await response.json();if(!response.ok)throw new Error(result.error||'작업 상태를 확인하지 못했습니다.');return result.data;
  }
  try{
   let outcome='';
   if(id){const r=await call('cancel',{id});outcome=r.resultCheckRequired?'중단을 요청했습니다. 이미 실행됐을 수 있어 결과 확인이 필요합니다. 자동으로 다시 실행하지 않습니다.':r.cancelled?'실행 전 작업을 중단했습니다.':r.state==='succeeded'?'이미 성공한 작업입니다. 취소하거나 다시 실행하지 않았습니다.':'현재 작업 상태를 확인해 주세요.';}
   const rows=await call('list');if(alive.current){setJobs(rows);setMessage(outcome||'최근 작업을 최대 50개 조회했습니다. 네이버에 새 요청을 보내지 않았습니다.');}
  }catch(e){if(alive.current){setJobs(null);setMessage(c.signal.aborted?'응답을 확인하지 못했습니다. 자동으로 재요청하지 않습니다. 작업 기록부터 다시 조회해 주세요.':e instanceof Error?e.message:'작업 상태를 확인하지 못했습니다.');}}
  finally{clearTimeout(timer);lock.current=false;if(alive.current)setBusy(false);}
 }
 return <section className="panel"><h2>작업 대기·결과 기록</h2><p>저장된 작업을 조회하거나 실행 전 작업을 중단합니다. 이 화면에서 이웃 신청·공감·댓글·답글을 새로 실행하지 않습니다.</p>
  <button className="primary" disabled={busy} onClick={()=>run()}>{busy?'상태 확인 중…':'작업 기록 조회'}</button><p role="status">{message}</p>
  {jobs?.length===0&&<p>보관 중인 작업이 없습니다.</p>}
  {jobs&&jobs.length>0&&<ul className="history">{jobs.map(job=><li key={job.id}><h3>{kinds[job.kind]||job.kind} · {job.neighbor_id}</h3><p>{states[job.state]||job.state}</p><small>자료 보관 기한 {new Date(job.expires_at).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'})}</small>
   {['draft','ready','claimed','armed'].includes(job.state)&&<button disabled={busy} onClick={()=>run(job.id)}>{job.state==='armed'?'중단 요청 · 결과 확인 필요':'이 작업 중단'}</button>}
   {job.state==='uncertain'&&<p>결과를 확인하기 전에는 다시 실행할 수 없습니다.</p>}
  </li>)}</ul>}
 </section>;
}
