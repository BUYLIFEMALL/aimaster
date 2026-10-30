'use client';
import {useEffect,useRef,useState} from 'react';
export type PreparedPost={id:string;accountId:string;url:string;title:string;body:string;expiresAt:string};
type Row={id:string;account_id:string;neighbor_id:string;post_id:string;title:string;published_at:string|null;body_confirmed:boolean;expires_at:string};
type Post={postId:string;title:string;body:string;publishedAt:string|null};
export function PostPlanner({onPick}:{onPick:(post:PreparedPost)=>void}){
 const [directory,setDirectory]=useState<{account_id:string;external_id:string;neighbor_id:string}[]>([]),[selection,setSelection]=useState(''),[xml,setXml]=useState(''),[preview,setPreview]=useState<Post[]|null>(null),[chosen,setChosen]=useState<string[]>([]),[rights,setRights]=useState(false),[full,setFull]=useState(false),[feedConsent,setFeedConsent]=useState(false),[rows,setRows]=useState<Row[]|null>(null),[body,setBody]=useState(''),[rowId,setRowId]=useState(''),[bodyConsent,setBodyConsent]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const lock=useRef(false),alive=useRef(true);useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 const [accountId,neighborId]=selection.split(':');
 async function run(operation:string,payload:Record<string,unknown>={}){
  if(lock.current)return;lock.current=true;setBusy(true);setMessage('처리 중…');
  try{const r=await fetch('/api/neighbors/posts',{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'content-type':'application/json'},body:JSON.stringify({operation,payload})}),v=await r.json();if(!r.ok)throw Error(v.error||'결과 미확인');if(!alive.current)return;
   if(operation==='directory')setDirectory(v.data);else if(operation==='list')setRows(v.data);else if(operation==='material'){onPick(v.data);setMessage('확인한 전문을 문장 만들기에 넘겼습니다. 프로필·모델·AI 전송 동의를 다시 확인하세요.');return;}
   else if(operation==='preview'||operation==='fetch_preview'){setPreview(v.data);setChosen([]);setRights(false);setFull(false);if(operation==='fetch_preview'){setXml(v.xml);setFeedConsent(false);}setMessage('제공된 피드 항목만 미리봅니다. 날짜 없음은 새 글 확인이 아니며, 피드 본문은 요약일 수 있습니다.');return;}
   else{setPreview(null);setRows(null);setRights(false);setFull(false);setBodyConsent(false);setMessage('자료 저장 완료. 재가져오기는 기존 본문과 최초 보관기한을 덮어쓰지 않습니다. AI·등록은 실행하지 않았습니다.');return;}
   setMessage('저장된 설정·자료를 조회했습니다. RSS·AI·네이버 소통을 실행하지 않았습니다.');
  }catch(e){if(alive.current)setMessage(`${e instanceof Error?e.message:'결과 미확인'} 자동 재요청하지 않습니다.`);}finally{lock.current=false;if(alive.current)setBusy(false);}
 }
 return <section className="panel"><h2>이웃 새 글 자료 준비</h2><small>새 글 대상 최대200명·최근 준비 자료50개를 조회합니다.</small><p>새 글 대상으로 켠 기존 이웃을 재사용합니다. RSS에 제공된 항목만 확인하며, 요약을 전문으로 취급하지 않습니다.</p>
 <button disabled={busy} onClick={()=>run('directory')}>새 글 대상 이웃 조회</button><button disabled={busy} onClick={()=>run('list')}>준비한 글 목록 조회</button><p role="status" aria-live="polite">{message}</p>
 <fieldset disabled={busy}><legend>피드 미리보기</legend><label>내 블로그 · 이웃<select value={selection} onChange={e=>{setSelection(e.target.value);setXml('');setPreview(null);setRights(false);setFull(false);setFeedConsent(false);}}><option value="">선택하세요</option>{directory.map(d=><option key={`${d.account_id}:${d.neighbor_id}`} value={`${d.account_id}:${d.neighbor_id}`}>{d.external_id} → {d.neighbor_id}</option>)}</select></label>
 <label>제공받은 RSS/Atom XML<textarea value={xml} maxLength={1048576} onChange={e=>{setXml(e.target.value);setPreview(null);setRights(false);setFull(false);}}/></label>
 <label>UTF-8 XML 파일<input type="file" accept=".xml,.rss,.atom,text/xml,application/xml" onChange={async e=>{const file=e.target.files?.[0];if(!file)return;if(file.size>1048576){setMessage('파일은 1MiB 이내로 준비하세요.');return;}try{const source=await file.text();if(!alive.current)return;setXml(source);setPreview(null);setRights(false);setFull(false);setMessage('파일을 불러왔습니다. 아직 서버에 보내지 않았습니다.');}catch{setMessage('파일을 읽지 못했습니다.');}}}/></label>
 <button className="primary" disabled={!selection||!xml} onClick={()=>run('preview',{accountId,neighborId,xml})}>제공한 피드 미리보기</button>
 <label><input type="checkbox" checked={feedConsent} onChange={e=>setFeedConsent(e.target.checked)}/>선택한 이웃의 공개 RSS를 확인하는 데 동의합니다.</label><button className="primary" disabled={!selection||!feedConsent} onClick={()=>run('fetch_preview',{accountId,neighborId,confirmed:true})}>선택한 이웃 RSS 확인</button><small>운영 읽기 준비가 끝나야 사용할 수 있습니다. 같은 이웃은 실패를 포함해 15분 간격으로 확인합니다.</small>
 {preview&&<><p>제공된 항목 {preview.length}개 · 저장·AI 호출 전</p>{preview.map(p=><details key={p.postId}><summary><input aria-label={`${p.title} 선택`} type="checkbox" checked={chosen.includes(p.postId)} onChange={e=>{setChosen(old=>e.target.checked?[...old,p.postId]:old.filter(id=>id!==p.postId));setRights(false);setFull(false);}}/>{p.title} · {p.publishedAt?new Date(p.publishedAt).toLocaleString('ko-KR'):'날짜 미확인'}</summary><pre>{p.body||'제공된 본문 없음'}</pre></details>)}
 <label><input type="checkbox" checked={rights} onChange={e=>setRights(e.target.checked)}/>선택한 피드 정보의 사용 권한을 확인했습니다.</label><label><input type="checkbox" checked={full} onChange={e=>setFull(e.target.checked)}/>선택한 본문이 요약이 아닌 전문이며 사용할 권한을 확인했습니다. (선택하지 않으면 제목·주소만 저장)</label><button className="primary" disabled={!chosen.length||!rights} onClick={()=>run('import',{accountId,neighborId,xml,selected:chosen,rightsConfirmed:true,bodyConfirmed:full})}>확인한 글 자료 저장</button></>}
 </fieldset>
 {rows?.length===0&&<p>준비한 글 자료가 없습니다. 실제 새 글이 없다는 뜻은 아닙니다.</p>}
 {!!rows?.length&&<ul>{rows.map(row=><li key={row.id}><h3>{row.title}</h3><p>{row.neighbor_id}/{row.post_id} · {row.body_confirmed?'전문 사용 확인됨':'제목·주소만 저장됨'} · 보관 {new Date(row.expires_at).toLocaleString('ko-KR')}</p>
 {row.body_confirmed?<button className="primary" disabled={busy} onClick={()=>run('material',{id:row.id})}>이 글로 댓글 문장 준비</button>:<><button disabled={busy} onClick={()=>{setRowId(row.id);setBody('');setBodyConsent(false);}}>이 글의 확인한 전문 입력</button>{rowId===row.id&&<><label>제공받은 전문<textarea maxLength={20000} value={body} onChange={e=>{setBody(e.target.value);setBodyConsent(false);}}/></label><label><input type="checkbox" checked={bodyConsent} onChange={e=>setBodyConsent(e.target.checked)}/>이 본문이 전문이며 사용 권한을 확인했습니다.</label><button className="primary" disabled={busy||!bodyConsent||body.length<30} onClick={()=>run('provide',{id:row.id,body,confirmed:true,rightsConfirmed:true})}>확인한 전문 저장</button></>}</>}
 </li>)}</ul>}
 </section>;
}
