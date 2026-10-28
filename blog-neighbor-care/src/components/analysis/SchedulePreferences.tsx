'use client';
import {useEffect,useRef,useState} from 'react';
import {validSchedule,nextSchedulePreview,type SchedulePreferences as Preferences} from '../../lib/schedule';
type Saved=Preferences&{revision:number};
const time=(minute:number)=>minute<0?'':`${String(Math.floor(minute/60)).padStart(2,'0')}:${String(minute%60).padStart(2,'0')}`;
const minute=(value:string)=>/^\d{2}:\d{2}$/.test(value)?Number(value.slice(0,2))*60+Number(value.slice(3)):-1;
export function SchedulePreferences(){
 const [saved,setSaved]=useState<Saved|null>(null),[draft,setDraft]=useState<Preferences|null>(null),[clock,setClock]=useState(Date.now);
 const [busy,setBusy]=useState(false),[message,setMessage]=useState('');const lock=useRef(false),alive=useRef(true),current=useRef<AbortController|null>(null);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;current.current?.abort();};},[]);
 async function run(save=false){
  if(lock.current||(save&&(!draft||!saved||!validSchedule(draft))))return;
  lock.current=true;setBusy(true);setMessage('');const controller=new AbortController();current.current=controller;const timer=setTimeout(()=>controller.abort(),20000);
  try{
   const response=await fetch('/api/work',{method:'POST',credentials:'same-origin',cache:'no-store',signal:controller.signal,headers:{'content-type':'application/json'},
    body:JSON.stringify({operation:save?'save_schedule':'schedule',payload:save?{...draft,expected_revision:saved!.revision}:{}})});
   const result=await response.json();if(!response.ok)throw new Error(result.error||'반복 설정을 확인하지 못했습니다.');
   const p=result.data as Saved&{executionAvailable:unknown};if(!validSchedule(p)||!Number.isSafeInteger(p.revision)||p.revision<1||p.executionAvailable!==false)throw new Error('반복 설정의 실행 범위를 확인하지 못했습니다.');
   if(alive.current){setSaved(p);setDraft({interval_minutes:p.interval_minutes,start_minute:p.start_minute,end_minute:p.end_minute});setClock(Date.now());setMessage(save?'반복 주기 설정을 저장했습니다. 자동 실행은 시작하지 않았습니다.':'저장된 반복 주기 설정입니다. 자동 실행은 꺼져 있습니다.');}
  }catch(e){if(alive.current){setSaved(null);setDraft(null);setMessage(controller.signal.aborted?'저장 여부를 확인하지 못했습니다. 자동으로 다시 저장하지 않습니다. 현재 설정부터 조회해 주세요.':e instanceof Error?e.message:'반복 설정을 확인하지 못했습니다.');}}
  finally{clearTimeout(timer);lock.current=false;if(alive.current)setBusy(false);}
 }
 const next=draft&&validSchedule(draft)?nextSchedulePreview(clock,draft):null;
 return <section className="panel"><div className="section-head"><h2>반복 주기 설정</h2><span className="badge">자동 실행 꺼짐</span></div><p>현재는 주기와 한국 시간대를 저장할 수 있습니다. 실제 예약·반복 실행은 준비 중입니다.</p>
  <button disabled={busy} onClick={()=>run()}>{busy?'확인 중…':'저장된 반복 설정 조회'}</button><p role="status">{message}</p>
  {draft&&<fieldset disabled={busy}><label className="field">확인 주기<select value={draft.interval_minutes} onChange={e=>setDraft({...draft,interval_minutes:Number(e.target.value)})}><option value={30}>30분</option>{Array.from({length:24},(_,i)=><option key={i+1} value={(i+1)*60}>{i+1}시간</option>)}</select></label>
   <div className="field-pair"><label className="field">시작 시간 · 한국 시간<input type="time" value={time(draft.start_minute)} onChange={e=>setDraft({...draft,start_minute:minute(e.target.value)})}/></label><label className="field">종료 시간 · 한국 시간<input type="time" value={time(draft.end_minute)} onChange={e=>setDraft({...draft,end_minute:minute(e.target.value)})}/></label></div>
   <p>시작과 종료가 같으면 하루 전체입니다. 종료 시각은 포함하지 않으며 자정을 넘는 시간대도 사용할 수 있습니다.</p>
   {next&&<p>설정 기준 예상 확인 시각: {new Date(next).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'})} · 실제 예약된 실행이 아닙니다.</p>}
   <button className="primary" disabled={!validSchedule(draft)} onClick={()=>run(true)}>반복 설정만 저장</button><small>PC가 꺼져 있던 동안의 누락 횟수만큼 몰아서 실행하지 않습니다.</small>
  </fieldset>}
 </section>;
}
