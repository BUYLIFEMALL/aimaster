'use client';
import {useEffect,useRef,useState} from 'react';
type Settings={request_cap:number;like_cap:number;comment_cap:number;enabled:boolean;revision:number;live_allowed?:boolean};
export function ExecutionControl(){
 const [settings,setSettings]=useState<Settings|null>(null),[limits,setLimits]=useState({request_cap:20,like_cap:100,comment_cap:30}),[enabled,setEnabled]=useState(false),[consent,setConsent]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState('현재 실행 허용 상태를 조회해 확인하세요.');
 const lock=useRef(false),alive=useRef(true);useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 async function run(save=false){if(lock.current||save&&(!settings||!consent))return;lock.current=true;setBusy(true);setConsent(false);try{
  const r=await fetch('/api/work',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'content-type':'application/json'},body:JSON.stringify(save?{operation:'save_execution',payload:{...limits,enabled,expected_revision:settings?.revision,confirmed:true}}:{operation:'settings',payload:{}})}),v=await r.json();if(!r.ok)throw Error(v.error||'상태 미확인');if(!alive.current)return;
  setSettings(save?null:v.data);if(!save){setLimits({request_cap:v.data.request_cap,like_cap:v.data.like_cap,comment_cap:v.data.comment_cap});setEnabled(v.data.enabled);}
  setMessage(save?'실행 허용·상한을 저장했습니다. 실제 등록하지 않았습니다. 설정 변경 뒤 작업 기록에서 대상을 다시 검토 완료로 저장하세요.':v.data.enabled?'조회한 회원 실행 허용: 켜짐':v.data.live_allowed?'조회한 회원 실행 허용: 꺼짐':'운영 실행 준비 전 · 회원 실행 허용을 켤 수 없습니다.');
 }catch(e){if(alive.current){setSettings(null);setMessage(`${e instanceof Error?e.message:'결과 미확인'} 상태부터 다시 조회하세요. 자동 재요청하지 않습니다.`);}}finally{lock.current=false;if(alive.current)setBusy(false);}}
 return <section className="panel"><h2>회원 실행 허용·일일 상한</h2><p>웹의 회원 실행 허용, 확장의 기기별 동작 허용, 작업별 검토 완료를 각각 확인합니다. 설정 저장만으로 실제 등록하거나 확장 반복을 시작하지 않습니다.</p><button disabled={busy} onClick={()=>run()}>회원 실행 상태 조회</button><p role="status" aria-live="polite">{message}</p>
 {settings&&<fieldset disabled={busy}><legend>실행 기준</legend>{(['request_cap','like_cap','comment_cap'] as const).map((key,i)=><label key={key}>{['신청·수락 합산','공감','댓글·대댓글 합산'][i]} / 일<input type="number" min={0} max={[20,100,30][i]} value={limits[key]} onChange={e=>{setLimits(old=>({...old,[key]:Number(e.target.value)}));setConsent(false);}}/></label>)}
 <label><input type="checkbox" checked={enabled} disabled={!settings.live_allowed&&!enabled} onChange={e=>{setEnabled(e.target.checked);setConsent(false);}}/>허용한 확장에서 검토 완료 작업 실행 허용</label><label><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/>위 상한과 실행 허용을 확인했습니다.</label><button className="primary" disabled={!consent} onClick={()=>run(true)}>확인한 실행 기준 저장</button><p>설정 변경 후 이전 승인은 다시 확인해야 합니다. 먼저 실행 기준을 저장한 다음 작업을 검토 완료로 저장하세요. 불확정 결과가 남아 있으면 실행을 다시 켤 수 없습니다.</p></fieldset>}
 </section>;
}
