"use client";
import { useEffect, useRef, useState } from "react";

type Review={state:string;allowed:boolean;note:string;source:string;fingerprint:string;aiStatus?:string|null;aiNote?:string|null};
export default function PostReviewGate({postId,snapshot,onBlockingChange}:{postId:string|null;snapshot:string;onBlockingChange:(blocked:boolean)=>void}) {
  const [review,setReview]=useState<Review|null>(null);
  const [busy,setBusy]=useState(false);
  const [confirmed,setConfirmed]=useState(false);
  const [error,setError]=useState("");
  const [reviewFor,setReviewFor]=useState("");
  const [postStatus,setPostStatus]=useState("");
  const [refresh,setRefresh]=useState(0);
  const latest=useRef(snapshot);latest.current=snapshot;
  const active=useRef(true);
  useEffect(()=>{active.current=true;return()=>{active.current=false;};},[]);
  useEffect(()=>{onBlockingChange(reviewFor!==snapshot || !review?.allowed || busy || Boolean(error));return()=>onBlockingChange(true);},[review,reviewFor,snapshot,busy,error,onBlockingChange]);
  useEffect(()=>{
    let cancelled=false;setReview(null);setConfirmed(false);setError("");
    if(!postId || !/^[\da-f-]{36}$/i.test(postId)){setBusy(false);setError("원고를 서버에 저장한 뒤 검수해 주세요.");return;}
    setBusy(true);
    (async()=>{
      try {
        const res=await fetch(`/api/posts/${postId}/review`,{cache:"no-store"});const data=await res.json();
        if(!res.ok)throw new Error(data.error || "검수 기록 조회 실패");
        if(data.snapshot!==snapshot)throw new Error("화면 원고와 서버 저장본이 다릅니다. 원고를 저장한 뒤 보관함에서 다시 열어 검수해 주세요.");
        if(!cancelled){setReview(data.review);setReviewFor(snapshot);setPostStatus(data.postStatus);}
      }catch(e){if(!cancelled)setError(e instanceof Error?e.message:"검수 기록 조회 실패");}
      finally{if(!cancelled)setBusy(false);}
    })();return()=>{cancelled=true;};
  },[postId,snapshot,refresh]);
  async function cancelQueued() {
    setBusy(true);setError("");
    try {
      const res=await fetch("/api/posts",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:postId,status:"draft"})});
      const data=await res.json();if(!res.ok)throw new Error(data.error || "작업 대기 취소 실패");
      if(active.current)setRefresh(value=>value+1);
    }catch(e){if(active.current)setError(e instanceof Error?e.message:"작업 대기 취소 실패");}
    finally{if(active.current)setBusy(false);}
  }
  async function complete() {
    if(!confirmed || !review)return;
    const expected=snapshot;setBusy(true);setError("");
    try {
      const res=await fetch(`/api/posts/${postId}/review`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({confirmed:true,fingerprint:review.fingerprint})});
      const data=await res.json();if(!res.ok)throw new Error(data.error || "직접 검수 저장 실패");
      if(active.current && latest.current===expected)setReview(data.review);
    }catch(e){if(active.current && latest.current===expected)setError(e instanceof Error?e.message:"직접 검수 저장 실패");}
    finally{if(active.current && latest.current===expected)setBusy(false);}
  }
  const label=review?.allowed?(review.source==="ai"?"AI 검수 통과":"회원 직접 검수 완료"):
    review?.state==="STALE"?"검수 후 원고가 변경됐습니다":review?.state==="FAIL"?"AI 검수 실패":review?.state==="WARN"?"AI 검수 경고":"최종 원고 검수가 필요합니다";
  return <section aria-label="최종 원고 검수" className="rounded-xl border border-neutral-200 bg-white p-4 space-y-2">
    <p className="text-sm font-bold text-neutral-900">{busy?"검수 기록 확인 중…":label}</p>
    {review && <p className="text-xs text-neutral-600">{review.note}</p>}
    {review?.source==="manual" && review.aiStatus && <p className="text-xs text-neutral-600">이전 AI 판정: {review.aiStatus} · {review.aiNote}</p>}
    {!review?.allowed && review && !error && <>
      <p className="text-xs text-neutral-600">사실·수치·출처·이미지·표현을 직접 확인하고 문제가 있으면 수정·저장한 뒤 검수해 주세요. 직접 검수는 AI 통과 판정을 바꾸지 않으며 최종 발행을 실행하지 않습니다.</p>
      <label className="flex gap-2 text-xs text-neutral-700"><input type="checkbox" checked={confirmed} disabled={busy} onChange={e=>setConfirmed(e.target.checked)} />저장된 최종 원고 전체를 확인했고 필요한 수정을 마쳤습니다.</label>
      {postStatus==="queued" ? <button type="button" disabled={busy} onClick={cancelQueued} className="rounded-lg border border-neutral-300 px-3 py-2 text-xs">대기를 취소하고 다시 검수</button> :
      <button type="button" disabled={!confirmed || busy || postStatus==="publishing"} onClick={complete} className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">직접 검수 완료 기록</button>}
    </>}
    {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
    {error && <button type="button" disabled={busy} onClick={()=>setRefresh(value=>value+1)} className="rounded-lg border border-neutral-300 px-3 py-2 text-xs text-neutral-700">저장본 다시 확인</button>}
    {review?.allowed && <p role="status" className="text-xs text-emerald-700">저장한 원고가 검수한 내용과 같습니다. 내용이나 이미지를 바꾸면 다시 검수해야 합니다.</p>}
  </section>;
}
