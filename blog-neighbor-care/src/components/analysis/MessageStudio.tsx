'use client';
import {useEffect,useRef,useState} from 'react';
import type {PreparedPost} from './PostPlanner';
import {ModelPicker} from './ModelPicker';
import {selectionForProvider} from '../../lib/analysis/modelSelection';
type Lists={materials:{id:string;title:string;blog_id:string;post_id:string}[];profiles:{id:string;revision:number;topics:string[]}[];accounts:{id:string;external_id:string}[];candidates:{id:string;profile_job_id:string;profile_revision:number;selection:string[]}[];replies:{id:string;neighbor_id:string;own_post_id:string;comment_id:string}[];jobs:{id:string;kind:string;state:string}[]};
type Result={id:string;kind:string;state:string;neighborId:string;postId:string;parentCommentId?:string;profileStale?:boolean;draftJobId?:string;result?:{text:string;summary:string;emotion:string;aiLikeScore:number;details:{sourceId:string;quote:string}[]}};
export function MessageStudio({preparedPost=null}:{preparedPost?:PreparedPost|null}={}){
 const [lists,setLists]=useState<Lists|null>(null),[kind,setKind]=useState('comment'),[profileId,setProfile]=useState(''),[accountId,setAccount]=useState(''),[candidate,setCandidate]=useState(''),[sourceId,setSource]=useState('');
 const [model,setModel]=useState(()=>selectionForProvider('anthropic')),[url,setUrl]=useState(''),[title,setTitle]=useState(''),[body,setBody]=useState(''),[original,setOriginal]=useState(''),[facts,setFacts]=useState('');
 const [rights,setRights]=useState(false),[consent,setConsent]=useState(false),[confirmed,setConfirmed]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[result,setResult]=useState<Result|null>(null),[edited,setEdited]=useState('');
 const selectionEpoch=useRef(0),lock=useRef(false),alive=useRef(true);useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 useEffect(()=>{if(!preparedPost)return;selectionEpoch.current++;setKind('comment');setAccount(preparedPost.accountId);setUrl(preparedPost.url);setTitle(preparedPost.title);setBody(preparedPost.body);setRights(false);setConsent(false);setConfirmed(false);setResult(null);setMessage('글 자료를 불러왔습니다. 프로필·모델·사용 권한과 AI 전송 동의를 확인하세요.');},[preparedPost]);
 async function run(operation:string,payload:Record<string,unknown>={}){
  if(lock.current)return;const version=selectionEpoch.current;lock.current=true;setBusy(true);setMessage(operation==='generate'?'AI 문장을 생성하고 있습니다. 이 화면에서 결과를 확인하세요.':'처리 중…');
  try{
   const r=await fetch('/api/messages',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'content-type':'application/json'},body:JSON.stringify({operation,payload})});const v=await r.json();
   if(!r.ok)throw Error(v.error||'결과를 확인하지 못했습니다.');if(!alive.current||version!==selectionEpoch.current)return;
   if(operation==='list')setLists(v.data);
   else if(operation==='material'){setUrl(v.data.url);setTitle(v.data.title);setBody(v.data.body);setRights(false);setConsent(false);setMessage('저장된 내 글을 불러왔습니다. 사용 권한과 AI 전송 동의를 다시 확인하세요.');return;}
   else if(operation==='adopt'){setConfirmed(false);setResult(null);setMessage('문장을 초안으로 저장했습니다. 작업 기록에서 대상과 내용을 확인하세요.');return;}
   else{setResult(v.data);setEdited(v.data.result?.text??'');setConfirmed(false);}
   setMessage(operation==='list'?'저장된 선택 항목과 생성 기록을 조회했습니다.':v.data.state==='succeeded'?'생성 완료. 근거·대상·문장을 확인하고 초안으로 저장하세요.':`현재 상태: ${v.data.state}. 자동으로 재생성하지 않습니다.`);
  }catch(e){if(alive.current&&version===selectionEpoch.current)setMessage(`${e instanceof Error?e.message:'응답을 확인하지 못했습니다.'} 응답이 끊겼다면 생성 기록 조회로 먼저 확인하세요.`);}
  finally{lock.current=false;if(alive.current)setBusy(false);}
 }
 function generate(){
  const profile=lists?.profiles.find(p=>p.id===profileId),pair=candidate.split(':');
  if(!profile||!accountId||!rights||!consent)return;
  setResult(null);setConfirmed(false);
  void run('generate',{id:crypto.randomUUID(),kind,...model,profileId,profileRevision:profile.revision,accountId,rightsConfirmed:true,externalAiConfirmed:true,facts:facts.split('\n').map(s=>s.trim()).filter(Boolean),
   ...(kind==='request'?{candidateId:pair[0],neighborId:pair[1]}:{post:{url,title,body},...(kind==='reply'?{sourceId,originalComment:original}:{})})});
 }
 return <section className="panel"><h2>신청·댓글·대댓글 문장 만들기</h2><p>확인한 프로필과 사용 권한이 있는 본문으로 문장을 완성합니다. 생성과 초안 저장은 네이버 등록을 실행하지 않습니다.</p>
 <button disabled={busy} onClick={()=>run('list')}>선택 항목·생성 기록 조회</button>
 <p role="status" aria-live="polite">{message}</p>
 <fieldset disabled={busy}><legend>문장과 자료 선택</legend>
 <label>문장 종류<select value={kind} onChange={e=>{setKind(e.target.value);setRights(false);setConsent(false);}}><option value="request">이웃 신청</option><option value="comment">댓글</option><option value="reply">대댓글</option></select></label>
 <label>확인한 내 프로필<select value={profileId} onChange={e=>{setProfile(e.target.value);setCandidate('');}}><option value="">선택하세요</option>{lists?.profiles.map(p=><option key={p.id} value={p.id}>{p.topics.join(', ')} · 수정 {p.revision}</option>)}</select></label>
 <label>내 블로그<select value={accountId} onChange={e=>setAccount(e.target.value)}><option value="">선택하세요</option>{lists?.accounts.map(a=><option key={a.id} value={a.id}>{a.external_id}</option>)}</select></label>
 {kind==='request'?<label>평가 후 선택한 후보<select value={candidate} onChange={e=>setCandidate(e.target.value)}><option value="">선택하세요</option>{lists?.candidates.filter(c=>c.profile_job_id===profileId&&c.profile_revision===lists.profiles.find(p=>p.id===profileId)?.revision).flatMap(c=>c.selection.map(n=><option key={`${c.id}:${n}`} value={`${c.id}:${n}`}>{n}</option>))}</select></label>:<>
 {kind==='reply'&&<><label>확인한 원댓글<select value={sourceId} onChange={e=>setSource(e.target.value)}><option value="">선택하세요</option>{lists?.replies.map(s=><option key={s.id} value={s.id}>{s.neighbor_id} · 내 글 {s.own_post_id} · 댓글 {s.comment_id}</option>)}</select></label><label>사용 권한을 확인한 원댓글<textarea value={original} maxLength={4000} onChange={e=>setOriginal(e.target.value)}/></label></>}
 {!!lists?.materials.length&&<label>이미 연결한 내 글 불러오기<select defaultValue="" onChange={e=>e.target.value&&run('material',{id:e.target.value})}><option value="">저장된 글 선택</option>{lists.materials.map(m=><option key={m.id} value={m.id}>{m.title} · {m.blog_id}/{m.post_id}</option>)}</select></label>}
 <label>글 주소<input value={url} onChange={e=>setUrl(e.target.value)}/></label><label>글 제목<input value={title} maxLength={500} onChange={e=>setTitle(e.target.value)}/></label><label>사용 권한을 확인한 글 전문<textarea value={body} maxLength={20000} onChange={e=>setBody(e.target.value)}/></label></>}
 <label>문장에 사용할 본인 경험·사실 (선택, 한 줄에 하나·최대 10개)<textarea value={facts} maxLength={3000} onChange={e=>setFacts(e.target.value)}/></label>
 <ModelPicker value={model} onChange={setModel} label="댓글·신청 문장"/>
 <label><input type="checkbox" checked={rights} onChange={e=>setRights(e.target.checked)}/>선택한 본문과 원댓글의 사용 권한을 확인했습니다.</label>
 <label><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/>선택한 AI에 프로필·본문·원댓글·사실을 전송하고 본인 키로 생성하는 데 동의합니다.</label>
 <button className="primary" disabled={!profileId||!accountId||!rights||!consent||(kind==='request'?!candidate:!url||!title||body.length<30)||(kind==='reply'&&(!sourceId||!original))} onClick={generate}>AI 문장 생성</button></fieldset>
 {result?.result&&<fieldset disabled={busy}><legend>생성 결과 · {result.kind}</legend><p>대상 {result.neighborId} · 글 {result.postId||'프로필'}{result.parentCommentId&&` · 원댓글 ${result.parentCommentId}`}</p><p>{result.result.summary}</p><p>감정: {result.result.emotion} · AI 자체 점수: {result.result.aiLikeScore}/10</p><small>자체 점수는 독립적인 품질 검수가 아닙니다. 문장과 근거를 직접 확인하세요.</small><ul>{result.result.details.map((d,i)=><li key={i}>{d.quote}</li>)}</ul><label>최종 문장<textarea value={edited} maxLength={result.kind==='request'?200:600} onChange={e=>{setEdited(e.target.value);setConfirmed(false);}}/></label><label><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>대상과 문장을 확인했습니다.</label><button className="primary" disabled={!confirmed||!!result.profileStale||!!result.draftJobId||edited.trim().length<30} onClick={()=>run('adopt',{id:result.id,text:edited,confirmed:true})}>{result.draftJobId?'초안 저장 완료':result.profileStale?'프로필 변경됨 · 다시 확인 필요':'확인한 문장을 초안으로 저장'}</button></fieldset>}
 {!!lists?.jobs.length&&<ul>{lists.jobs.map(j=><li key={j.id}>{j.kind} · {j.state} <button disabled={busy} onClick={()=>run('get',{id:j.id})}>결과 확인</button>{j.state==='queued'&&<button disabled={busy} onClick={()=>run('cancel',{id:j.id})}>생성 대기 취소</button>}</li>)}</ul>}
 </section>;
}
