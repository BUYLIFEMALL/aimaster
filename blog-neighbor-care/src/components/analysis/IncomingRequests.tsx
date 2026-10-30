'use client';
import {useEffect,useRef,useState} from 'react';
type Row={id:string;actor_id:string;request_key:string;neighbor_id:string;state:string;job_id:string|null;job_state:string|null;expires_at:string};
type Device={id:string;blog_id:string;read_allowed:boolean|null;execute_allowed:boolean|null;revoked_at:string|null;expires_at:string|null};
export function IncomingRequests(){
 const [rows,setRows]=useState<Row[]|null>(null),[devices,setDevices]=useState<Device[]|null>(null),[selected,setSelected]=useState(''),[read,setRead]=useState(false),[execute,setExecute]=useState(false),[consent,setConsent]=useState(false),[target,setTarget]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const lock=useRef(false),alive=useRef(true);useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 async function run(operation:string,payload:Record<string,unknown>={}){
  if(lock.current)return;lock.current=true;setBusy(true);setMessage('처리 중…');setConsent(false);setTarget('');
  try{const r=await fetch('/api/work',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'content-type':'application/json'},body:JSON.stringify({operation,payload})});const v=await r.json();if(!r.ok)throw Error(v.error||'상태를 확인하지 못했습니다.');if(!alive.current)return;
   if(operation==='accept_list'){setRows(v.data);setMessage('저장된 받은 신청과 수락 작업을 조회했습니다. 네이버에 접속하지 않았습니다.');}
   else if(operation==='accept_devices'){setDevices(v.data);setMessage('연결된 확장의 수락 전용 허용 상태를 조회했습니다.');}
   else {setRows(null);setDevices(null);setMessage(operation==='approve_accept'?'수락 대상을 검토 완료로 저장했습니다. 확장에서 실제 수락을 별도로 시작하세요.':operation==='draft_accept'?'수락 초안을 저장했습니다. 목록을 다시 조회해 대상을 확인하세요.':'수락 전용 동의를 저장했습니다. 실제 수락은 실행하지 않았습니다.');}
  }catch(e){if(alive.current)setMessage(`${e instanceof Error?e.message:'응답 미확인'} 자동 재요청하지 않습니다. 목록과 이전 수락 결과를 먼저 확인하세요.`);}finally{lock.current=false;if(alive.current)setBusy(false);}
 }
 return <section className="panel"><h2>받은 서로이웃 신청 검토·수락</h2><p>보낸 신청의 수락 상태 조회와 별도 기능입니다. 확장에서 본인 받은 신청 관리의 현재 페이지를 읽고 확인해 저장한 항목만 표시합니다. 현재 목록이 비어 있어도 네이버에 신청이 없다는 뜻은 아닙니다.</p>
 <button disabled={busy} onClick={()=>run('accept_devices')}>수락 전용 확장 허용 조회</button><button className="primary" disabled={busy} onClick={()=>run('accept_list')}>받은 신청·수락 기록 조회</button><p role="status" aria-live="polite">{message}</p>
 {devices&&<fieldset disabled={busy}><legend>이 기기의 읽기·실제 수락 허용</legend><label>확장 기기<select value={selected} onChange={e=>{setSelected(e.target.value);setConsent(false);setRead(false);setExecute(false);}}><option value="">선택하세요</option>{devices.map(d=><option key={d.id} value={d.id}>{d.blog_id} · {d.id.slice(0,8)} · 읽기 {d.read_allowed&&!d.revoked_at&&Date.parse(d.expires_at??'')>Date.now()?'허용':'꺼짐'} / 수락 {d.execute_allowed&&!d.revoked_at&&Date.parse(d.expires_at??'')>Date.now()?'허용':'꺼짐'}</option>)}</select></label>
 <label><input type="checkbox" checked={read} onChange={e=>{setRead(e.target.checked);setConsent(false);}}/>받은 신청 ID·작성자 읽기 허용</label><label><input type="checkbox" checked={execute} onChange={e=>{setExecute(e.target.checked);setConsent(false);}}/>검토 완료 신청의 실제 수락 허용</label><label><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/>선택한 본인 기기의 동작에 동의합니다.</label>
 <button className="primary" disabled={!selected||!consent} onClick={()=>run('grant_accept',{device_id:selected,read,execute,confirmed:true})}>선택한 수락 동작 허용 저장</button><button disabled={!selected} onClick={()=>run('revoke_accept',{device_id:selected})}>수락 동작 허용 해제</button></fieldset>}
 {rows?.length===0&&<p>저장된 받은 신청이 없습니다. 확장에서 현재 페이지를 읽어 확인한 뒤 저장하세요.</p>}
 {!!rows?.length&&<ul className="history">{rows.map(row=><li key={row.id}><h3>{row.neighbor_id} → {row.actor_id}</h3><p>신청 {row.request_key} · {row.job_state??'수락 초안 없음'} · {new Date(row.expires_at).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'})}까지 보관</p>
 {row.state==='pending'&&(!row.job_id||['draft','skipped'].includes(row.job_state??''))&&<><label><input type="checkbox" disabled={busy} checked={target===row.id} onChange={e=>setTarget(e.target.checked?row.id:'')}/>이 계정과 신청자를 확인했습니다.</label><button className="primary" disabled={busy||target!==row.id} onClick={()=>run(row.job_id?'approve_accept':'draft_accept',{id:row.job_id??row.id,confirmed:true})}>{row.job_id?'이 신청을 수락 대상으로 검토 완료':'수락 초안 저장'}</button></>}
 {row.job_state==='uncertain'&&<p>결과가 불확실합니다. 자동으로 다시 수락하지 않습니다. 네이버 현재 상태와 이전 확장 결과부터 확인하세요. 확장의 불확정 수락 상태 다시 읽기는 수락 버튼을 누르지 않고 관계만 재확인합니다.</p>}
 </li>)}</ul>}
 <p>수락은 기존 이웃 신청과 합산한 하루 상한을 사용합니다. 읽기·초안·검토 완료 저장만으로 실제 수락하거나 자동 소통을 켜지 않습니다. 운영 준비 전에는 실제 실행되지 않습니다.</p></section>;
}
