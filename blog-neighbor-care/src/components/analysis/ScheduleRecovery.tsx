'use client';
import {useEffect,useRef,useState} from 'react';
type Status={state:'uninitialized'|'idle'|'running'|'paused';generation:number|null;run_id:string|null;job_id:string|null;job_state:string|null;
 next_due_at:string|null;running_until:string|null;last_result:string|null;settings_revision:number;preference_revision:number;
 executionEnabled:boolean;resumable:boolean;resumed:boolean;externalActions:0};
const labels={uninitialized:'실행 기록 없음',idle:'반복 대기',running:'작업 확인 중',paused:'결과 확인 필요 · 중단됨'};
const jobLabels:Record<string,string>={ready:'실행 전',claimed:'실행 준비 중',armed:'등록 허가 발급됨',uncertain:'결과 불확실',succeeded:'성공 확인',failed_no_effect:'미실행 확인',skipped:'중단 확인'};
function valid(s:Status){return s&&Object.hasOwn(labels,s.state)&&typeof s.executionEnabled==='boolean'&&typeof s.resumable==='boolean'&&s.externalActions===0&&
 Number.isSafeInteger(s.settings_revision)&&s.settings_revision>0&&Number.isSafeInteger(s.preference_revision)&&s.preference_revision>0&&
 (!s.resumable||(s.state==='paused'&&!s.executionEnabled&&typeof s.run_id==='string'&&/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(s.run_id)&&Number.isSafeInteger(s.generation)&&Number(s.generation)>0));}
export function ScheduleRecovery(){
 const [status,setStatus]=useState<Status|null>(null),[confirmed,setConfirmed]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const lock=useRef(false),alive=useRef(true),controller=useRef<AbortController|null>(null);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;controller.current?.abort();};},[]);
 async function run(resume=false){
  if(lock.current||(resume&&(!status?.resumable||!confirmed)))return;
  lock.current=true;setBusy(true);setMessage('');setConfirmed(false);
  const c=new AbortController();controller.current=c;const timer=setTimeout(()=>c.abort(),20000);
  try{
   const response=await fetch('/api/work',{method:'POST',credentials:'same-origin',cache:'no-store',signal:c.signal,headers:{'content-type':'application/json'},
    body:JSON.stringify({operation:resume?'resume_schedule':'schedule_status',payload:resume?{run_id:status!.run_id,generation:status!.generation,
     settings_revision:status!.settings_revision,preference_revision:status!.preference_revision,confirmed:true}:{}})});
   const result=await response.json();if(!response.ok)throw Error(result.error||'반복 실행 기록을 확인하지 못했습니다.');
   const s=result.data as Status;
   if(!valid(s)||(resume&&(s.resumed!==true||s.state!=='idle'||s.executionEnabled!==false)))throw Error('복구 상태를 확인하지 못했습니다. 기록을 다시 조회해 주세요.');
   if(alive.current){setStatus(s);setMessage(resume?'반복 대기 기록을 복구했습니다. 자동 실행은 꺼져 있으며 네이버 동작을 실행하지 않았습니다.':'마지막 조회 시점의 반복 실행 기록입니다. 최신 상태는 다시 조회해 주세요. 조회만으로 실행하지 않습니다.');}
  }catch(e){if(alive.current){setStatus(null);setMessage(c.signal.aborted?'응답을 확인하지 못했습니다. 자동으로 재요청하지 않습니다. 기록부터 다시 조회해 주세요.':e instanceof Error?e.message:'반복 실행 기록을 확인하지 못했습니다.');}}
  finally{clearTimeout(timer);lock.current=false;if(alive.current)setBusy(false);}
 }
 const expired=status?.state==='running'&&status.running_until&&Date.parse(status.running_until)<=Date.now();
 return <section className="panel"><div className="section-head"><h2>반복 실행 기록·복구</h2><span className="badge">실제 반복 실행 준비 중</span></div>
  <p>진행 기록과 이전 결과를 확인합니다. 결과가 불확실한 작업은 복구 버튼으로 성공 처리하거나 다시 실행할 수 없습니다.</p>
  <button className="primary" disabled={busy} onClick={()=>run()}>{busy?'기록 확인 중…':'반복 실행 기록 조회'}</button><p role="status">{message}</p>
  {status&&<div className="notice"><strong>{expired?'실행 확인 기한 경과 · 결과 확인 필요':labels[status.state]}</strong>
   <p>자동 실행: {status.executionEnabled?'켜짐':'꺼짐'}</p>
   {status.job_id&&<><small>마지막 작업 번호: {status.job_id}</small><p>이전 작업 결과: {jobLabels[status.job_state||'']||'확인 필요'}</p></>}
   {status.state==='idle'&&status.next_due_at&&<p>다음 확인 기준: {new Date(status.next_due_at).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'})} · 실제 실행을 보장하지 않습니다.</p>}
   {status.state==='paused'&&!status.resumable&&<p>이전 작업과 미해결 작업의 서버 결과부터 확인해 주세요. 복구할 수 있는 상태가 아닙니다.</p>}
   {status.resumable&&<><label className="check"><input type="checkbox" checked={confirmed} disabled={busy} onChange={e=>setConfirmed(e.target.checked)}/>이전 작업의 결과를 확인했습니다. 자동 실행을 끈 상태로 반복 대기만 복구합니다.</label>
    <button className="primary" disabled={busy||!confirmed} onClick={()=>run(true)}>결과 확인 후 반복 대기 복구</button></>}
  </div>}
 </section>;
}
