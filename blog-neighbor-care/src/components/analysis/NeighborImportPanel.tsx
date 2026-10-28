'use client';
import {useEffect,useRef,useState} from 'react';
type Row={neighbor_id:string;relation_type:'mutual'|'one_way';new_posts_enabled:boolean;return_visits_enabled:boolean;observed_at:string};
type Directory={total:number;records:Row[]};
type Run={id:string;state:string;captured_count:number;total_count:number|null;last_page:number;total_pages:number|null};
type Preview={id:string;state:string;validUntil:string;capturedCount:number;totalCount:number|null;lastPage:number;totalPages:number|null;rows:{blogId:string;relation:string}[]};
const labels:Record<string,string>={capturing:'일부 페이지 받음',ready:'표시된 전 페이지 받음',confirmed:'확인·반영됨',cancelled:'취소됨',expired:'확인 기한 지남'};
async function call<T>(operation:string,payload:Record<string,unknown>,signal:AbortSignal):Promise<T>{
 const r=await fetch('/api/neighbors/import/member',{method:'POST',credentials:'same-origin',cache:'no-store',signal,headers:{'content-type':'application/json'},body:JSON.stringify({operation,payload})});
 const result=await r.json();if(!r.ok)throw Object.assign(new Error(typeof result.error==='string'?result.error:'가져온 목록을 확인하지 못했습니다.'),{status:r.status});return result.data as T;
}
export function NeighborImportPanel({accountId}:{accountId:string}){
 const [directory,setDirectory]=useState<Directory|null>(null),[runs,setRuns]=useState<Run[]>([]),[preview,setPreview]=useState<Preview|null>(null);
 const [cursor,setCursor]=useState<string|null>(null),[pageStart,setPageStart]=useState<string|null>(null),[previewCursor,setPreviewCursor]=useState<string|null>(null),[confirmed,setConfirmed]=useState(false),[allConfirmed,setAllConfirmed]=useState(false);
 const [busy,setBusy]=useState(false),[message,setMessage]=useState('');const alive=useRef(true),controller=useRef<AbortController|null>(null),lock=useRef(false);
 const [clock,setClock]=useState(Date.now);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;controller.current?.abort();};},[]);
 useEffect(()=>{
  if(preview?.state!=='ready')return;
  const deadline=Date.parse(preview.validUntil);if(!Number.isFinite(deadline)||deadline<=Date.now())return;
  const timer=setTimeout(()=>{setClock(Date.now());setConfirmed(false);},Math.min(deadline-Date.now()+1,2147483647));
  return()=>clearTimeout(timer);
 },[preview]);
 async function run(work:(signal:AbortSignal)=>Promise<void>){
  if(lock.current)return;lock.current=true;setBusy(true);setMessage('');const c=new AbortController();controller.current=c;const timer=setTimeout(()=>c.abort(),20000);
  try{await work(c.signal);}catch(e){if(alive.current){if((e as {status?:number}).status===401||(e as {status?:number}).status===403){setDirectory(null);setRuns([]);setPreview(null);}setMessage(c.signal.aborted?'응답을 확인하지 못했습니다. 자동으로 반영하거나 다시 요청하지 않습니다. 결과부터 조회하세요.':e instanceof Error?e.message:'가져오기 결과를 확인하지 못했습니다.');}}
  finally{clearTimeout(timer);lock.current=false;if(alive.current)setBusy(false);}
 }
 async function load(signal:AbortSignal,next:string|null=null){
  const [d,r]=await Promise.all([call<Directory>('directory',{account_id:accountId,cursor:next},signal),call<Run[]>('runs',{account_id:accountId},signal)]);
  if(!alive.current)return;setDirectory({...d,records:d.records.slice(0,50)});setPageStart(next);setCursor(d.records.length>50?d.records[49].neighbor_id:null);setRuns(r);setAllConfirmed(false);
 }
 async function open(id:string,signal:AbortSignal,next:string|null=null){
  const p=await call<Preview>('get',{id,cursor:next},signal);if(!alive.current)return;
  setClock(Date.now());setPreview({...p,rows:p.rows.slice(0,50)});setPreviewCursor(p.rows.length>50?p.rows[49].blogId:null);setConfirmed(false);
 }
 async function targets(signal:AbortSignal,newPosts:boolean,returnVisits:boolean,ids?:string[]){
  await call('configure',{account_id:accountId,new_posts:newPosts,return_visits:returnVisits,confirmed:true,...(ids?{ids}:{all:true,expected_total:directory?.total})},signal);
  await load(signal,pageStart);if(alive.current)setMessage('소통 대상 설정을 저장했습니다. 지금 신청·공감·댓글을 실행하지 않습니다.');
 }
 if(!accountId)return null;
 const previewDeadline=Date.parse(preview?.validUntil||'');
 const canConfirm=preview?.state==='ready'&&Number.isFinite(previewDeadline)&&previewDeadline>clock;
 return <section className="candidate-files"><h2>가져온 기존 이웃 · 소통 대상</h2>
  <p>내 이웃 관리의 전체 목록을 확장에서 읽은 뒤, 여기서 받은 페이지·인원·관계를 확인하고 반영합니다. 읽기 허용 수단·지원 화면 검수가 끝나기 전에는 운영 읽기가 차단됩니다.</p>
  <p>회원이 확인한 목록입니다. 현재 네이버 관계를 독립 검증한 기록은 아니며, 대상 설정을 켜도 자동 소통 실행은 꺼져 있습니다.</p>
  <button className="primary" disabled={busy} onClick={()=>run(s=>load(s))}>가져온 목록·진행 상태 조회</button><div role="status">{busy?'목록을 확인하고 있습니다.':message}</div>
  {runs.length>0&&<div className="history">{runs.map(r=><button key={r.id} disabled={busy} onClick={()=>run(s=>open(r.id,s))}>{labels[r.state]||r.state} · {r.captured_count}/{r.total_count??'?'}명 · {r.last_page}/{r.total_pages??'?'}페이지</button>)}</div>}
  {preview&&<div className="file-preview"><h3>반영 전 받은 범위 확인</h3><p>{preview.state==='ready'&&!canConfirm?'확인 기한 지남':labels[preview.state]||preview.state} · {preview.capturedCount}/{preview.totalCount??'?'}명 · {preview.lastPage}/{preview.totalPages??'?'}페이지</p>
   {Number.isFinite(previewDeadline)&&<p>확인·반영 기한: {new Date(previewDeadline).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'})} (한국 시간)</p>}
   {preview.state==='ready'&&!canConfirm&&<p role="status">이 목록의 확인 기한이 지났거나 기한을 확인하지 못했습니다. 기존 목록은 보존하며, 확장에서 새로 읽은 뒤 기한 안에 확인·반영해 주세요.</p>}
   <p>네이버가 표시한 전 페이지·인원이 일치해야 반영할 수 있습니다. 여러 시점에 읽은 목록이며 동시점의 전체 관계를 보장하지 않습니다. 이번 목록에 없는 기존 이웃은 자동 삭제하지 않습니다.</p>
   <ul>{preview.rows.map(r=><li key={r.blogId}>{r.blogId} · {r.relation==='mutual'?'서로이웃 표시':'일반 이웃 표시'}</li>)}</ul>
   {previewCursor&&<button disabled={busy} onClick={()=>run(s=>open(preview.id,s,previewCursor))}>다음 받은 이웃 50명 확인</button>}
   {canConfirm&&<><label className="check"><input type="checkbox" disabled={busy} checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>받은 범위·관계를 확인했습니다. 새로 가져온 서로이웃의 새 글·답방 대상은 켜지고 일반 이웃은 꺼지며, 기존에 바꾼 설정은 유지됩니다.</label><button className="primary" disabled={busy||!confirmed} onClick={()=>run(async s=>{await call('confirm',{id:preview.id,confirmed:true},s);await open(preview.id,s);await load(s);if(alive.current)setMessage('확인한 목록을 반영했습니다. 외부 소통은 실행하지 않았습니다.');})}>확인한 이웃 목록 반영</button></>}
   {['capturing','ready','expired'].includes(preview.state)&&<button disabled={busy} onClick={()=>run(async s=>{await call('cancel',{id:preview.id},s);await open(preview.id,s);await load(s);})}>이 가져오기 취소 · 임시 목록 삭제</button>}
  </div>}
  {directory&&<><h3>반영된 이웃 {directory.total}명</h3><small>현재 페이지 최대 50명. 아래 ‘전체’는 이 계정에 반영된 {directory.total}명을 뜻합니다.</small>
   <div className="table-scroll"><table><caption>회원이 확인한 기존 이웃과 소통 대상 설정</caption><thead><tr><th>블로그</th><th>가져온 관계 표시</th><th>새 글 대상</th><th>답방 대상</th></tr></thead><tbody>{directory.records.map(row=><tr key={row.neighbor_id}><td>{row.neighbor_id}</td><td>{row.relation_type==='mutual'?'서로이웃':'일반 이웃'}<small>목록 읽은 시각 {new Date(row.observed_at).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'})}</small></td><td><input type="checkbox" aria-label={`${row.neighbor_id} 새 글 대상`} disabled={busy} checked={row.new_posts_enabled} onChange={e=>run(s=>targets(s,e.target.checked,row.return_visits_enabled,[row.neighbor_id]))}/></td><td><input type="checkbox" aria-label={`${row.neighbor_id} 답방 대상`} disabled={busy} checked={row.return_visits_enabled} onChange={e=>run(s=>targets(s,row.new_posts_enabled,e.target.checked,[row.neighbor_id]))}/></td></tr>)}</tbody></table></div>
   {!directory.total&&<p>아직 반영한 목록이 없습니다. 실제 네이버 이웃이 없다는 뜻은 아닙니다.</p>}
   {cursor&&<button disabled={busy} onClick={()=>run(s=>load(s,cursor))}>다음 반영된 이웃 50명</button>}
   {directory.total>0&&<><label className="check"><input type="checkbox" disabled={busy} checked={allConfirmed} onChange={e=>setAllConfirmed(e.target.checked)}/>이 계정의 반영된 이웃 전체 {directory.total}명에 대해 새 글·답방 대상 설정을 함께 바꿉니다.</label><button className="primary" disabled={busy||!allConfirmed} onClick={()=>run(s=>targets(s,true,true))}>전체 대상 켜기</button><button disabled={busy||!allConfirmed} onClick={()=>run(s=>targets(s,false,false))}>전체 대상 끄기</button></>}
  </>}
 </section>;
}
