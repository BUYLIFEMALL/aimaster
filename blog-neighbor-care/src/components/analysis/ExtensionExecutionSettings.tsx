'use client';
import {useEffect,useRef,useState} from 'react';
type Device={id:string;blog_id:string;expires_at:string;kinds:string[]|null;reads?:string[];revoked_at:string|null;permission_expires_at:string|null};
const actions={request:'이웃 신청',like:'공감',comment:'댓글·답방',reply:'대댓글'};
const readActions={relationship:'신청 수락 상태 확인',incoming:'내 글 원댓글 정보 확인',return_post:'답방 글 주소 확인'};
/** v1.16: 저장된 허용(유효한 것만)을 체크 상태로 보여 준다 — 서버는 보낸 목록으로 통째로 바꾸므로 「보이는 체크 = 저장될 값」. */
export function savedPermissions(d:Device|undefined,now=Date.now()){
 const valid=!!d?.kinds&&!d.revoked_at&&Date.parse(d.permission_expires_at??'')>now;
 return {kinds:valid?(d!.kinds??[]).filter(k=>k in actions):[],reads:valid?(d!.reads??[]).filter(k=>k in readActions):[]};
}
export function ExtensionExecutionSettings(){
 const [devices,setDevices]=useState<Device[]|null>(null),[selected,setSelected]=useState(''),[consent,setConsent]=useState(false);
 const [kinds,setKinds]=useState<string[]>([]),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const [reads,setReads]=useState<string[]>([]);
 const lock=useRef(false),alive=useRef(true),controller=useRef<AbortController|null>(null);
 const device=devices?.find(d=>d.id===selected),authorized=device?.kinds&&!device.revoked_at&&Date.parse(device.permission_expires_at??'')>Date.now();
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;controller.current?.abort();};},[]);
 async function run(operation:string){
  if(lock.current)return;lock.current=true;setBusy(true);setMessage('');const c=new AbortController();controller.current=c;const timer=setTimeout(()=>c.abort(),20000);
  const payload=operation==='extension_devices'?{}:operation==='grant_extension'?{device_id:selected,kinds,reads,confirmed:consent}:{device_id:selected};
  setConsent(false);
  try{
   const r=await fetch('/api/work',{method:'POST',credentials:'same-origin',cache:'no-store',signal:c.signal,headers:{'content-type':'application/json'},body:JSON.stringify({operation,payload})});
   const v=await r.json();if(!r.ok)throw Error(v.error||'확장 실행 설정을 확인하지 못했습니다.');if(!alive.current)return;
   // 저장·해제 뒤에도 목록을 지우지 않고 다시 조회해 저장된 상태를 그대로 보여 준다(조회만, 재저장 없음).
   const list=operation==='extension_devices'?v.data:await(async()=>{const again=await fetch('/api/work',{method:'POST',credentials:'same-origin',cache:'no-store',signal:c.signal,headers:{'content-type':'application/json'},body:JSON.stringify({operation:'extension_devices',payload:{}})});const w=await again.json();if(!again.ok)throw Error('저장은 됐지만 목록을 다시 확인하지 못했습니다. 「연결된 확장 조회」를 눌러 확인하세요.');return w.data;})();
   if(!Array.isArray(list)||list.length>50)throw Error('기기 목록 형식 미확인');if(!alive.current)return;
   const keep=operation!=='extension_devices'&&list.some((d:Device)=>d.id===selected)?selected:list[0]?.id??'';
   const saved=savedPermissions(list.find((d:Device)=>d.id===keep));
   setDevices(list);setSelected(keep);setKinds(saved.kinds);setReads(saved.reads);
   setMessage(operation==='extension_devices'?'연결된 확장을 조회했습니다. 체크된 항목이 지금 저장된 허용입니다. 바꿀 항목만 고친 뒤 동의하고 저장하세요.':operation==='grant_extension'?'체크한 동작 그대로 허용을 저장했습니다. 자동 실행 설정과 별개이며 새 작업을 등록하지 않았습니다.':'확장 동작 허용을 해제했습니다. 이미 시도한 작업은 결과를 확인하세요.');
  }catch(e){if(alive.current){setDevices(null);setSelected('');setMessage(c.signal.aborted?'응답 미확인 · 자동 재요청하지 않습니다. 기기와 작업 기록을 다시 조회하세요.':e instanceof Error?e.message:'확장 설정 미확인');}}
  finally{clearTimeout(timer);lock.current=false;if(alive.current)setBusy(false);}
 }
 return <section className="panel"><h2>웹·확장 실행 연결</h2><p>웹 프로그램과 확장 프로그램으로 동작합니다. 연결된 기기마다 실행할 동작을 선택해 허용하세요. 본인 글 읽기 연결만으로 이웃 신청·공감·댓글 권한이 생기지 않습니다.</p>
  <p>반복 실행은 웹 주기·시간대를 저장한 뒤 확장의 현재 탭 반복 시작에서 별도로 동의합니다. 허용 저장만으로 반복이 켜지지 않습니다.</p><button className="primary" disabled={busy} onClick={()=>run('extension_devices')}>연결된 확장 조회</button><p role="status">{message}</p>
  {devices?.length===0&&<p>현재 연결된 확장이 없습니다. 내 글 연결에서 먼저 연결해 주세요.</p>}
  {!!devices?.length&&<><label>연결된 확장<select value={selected} disabled={busy} onChange={e=>{const saved=savedPermissions(devices.find(d=>d.id===e.target.value));setSelected(e.target.value);setConsent(false);setKinds(saved.kinds);setReads(saved.reads);}}>{devices.map(d=><option key={d.id} value={d.id}>{d.blog_id} · 기기 {d.id.slice(0,8)}</option>)}</select></label>
   <p>조회한 실행 허용: {authorized&&device.kinds?.length?device.kinds.map(k=>actions[k as keyof typeof actions]??k).join(' · '):'허용 안 됨'}{authorized&&` · 기한 ${new Date(device.permission_expires_at!).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'})}`}</p>
   <p>조회한 읽기 허용: {authorized&&device.reads?.length?device.reads.map(k=>readActions[k as keyof typeof readActions]??k).join(' · '):'허용 안 됨'}</p>
   {Object.entries(readActions).map(([key,label])=><label className="check" key={key}><input type="checkbox" checked={reads.includes(key)} disabled={busy} onChange={e=>{setReads(old=>e.target.checked?[...old,key]:old.filter(k=>k!==key));setConsent(false);}}/>{label}</label>)}
   {Object.entries(actions).map(([key,label])=><label className="check" key={key}><input type="checkbox" checked={kinds.includes(key)} disabled={busy} onChange={e=>{setKinds(old=>e.target.checked?[...old,key]:old.filter(k=>k!==key));setConsent(false);}}/>{label}</label>)}
   <label className="check"><input type="checkbox" checked={consent} disabled={busy} onChange={e=>setConsent(e.target.checked)}/>선택한 본인 확장에서 선택한 읽기·실행 동작을 수행하는 데 동의합니다.</label>
   <div className="actions"><button className="primary" disabled={busy||!selected||!consent||!(kinds.length+reads.length)} onClick={()=>run('grant_extension')}>선택한 확장 동작 허용</button><button className="bnc-danger" disabled={busy||!selected} onClick={()=>run('revoke_extension')}>동작 허용 해제</button></div>
  </>}
 </section>;
}
