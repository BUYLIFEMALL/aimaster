"use client";
import { useState } from "react";
import { executionStageLabels, type ExecutionStatus } from "@/lib/executionStatus";

export default function ExecutionProgress({id,status,execution,onRecovered}:{id:string;status:string;execution?:ExecutionStatus|null;onRecovered:()=>void}) {
  const [confirmed,setConfirmed]=useState(false),[saving,setSaving]=useState(false),[error,setError]=useState("");
  if(!execution || status!=="publishing")return null;
  const recover=async()=>{
    setSaving(true);setError("");
    try{
      const res=await fetch(`/api/posts/${encodeURIComponent(id)}/recovery`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({runId:execution.runId,confirmed})});
      const data=await res.json();
      if(!res.ok || data.success!==true || data.post?.id!==id || data.post?.status!=="draft")throw new Error(data.error || "복구 저장을 확인하지 못했습니다.");
      setConfirmed(false);onRecovered();
    }catch(err){setError(err instanceof Error?err.message:"복구를 확인하지 못했습니다.");}finally{setSaving(false);}
  };
  return <div className="mt-2 rounded-lg border border-neutral-200 bg-white p-3 text-xs text-neutral-700" aria-live="polite">
    <p className="font-medium">{execution.expired?"확장 연결이 끊겼습니다":executionStageLabels[execution.stage] || "진행 확인 중"}</p>
    <p className="mt-1">{execution.message}{execution.total>0?` · ${execution.done}/${execution.total}`:""}</p>
    {execution.total>0 && <progress className="mt-2 h-1.5 w-full accent-emerald-600" value={execution.done} max={execution.total} aria-label="네이버 입력 진행" />}
    <p className="mt-1 text-neutral-500">마지막 확인 {new Date(execution.updatedAt).toLocaleString("ko-KR")}</p>
    <details className="mt-1 text-neutral-500"><summary>실행 번호</summary><code>{execution.runId}</code></details>
    {execution.expired && <div className="mt-2 border-t border-neutral-200 pt-2">
      <p>열린 네이버 원고·게시글·예약 목록에서 이 글의 처리 결과를 먼저 확인해 주세요. 복구하면 임시보관으로 돌아갑니다. 재입력·발행은 자동으로 진행하지 않습니다.</p>
      <label className="mt-2 flex items-start gap-2"><input type="checkbox" checked={confirmed} onChange={event=>setConfirmed(event.target.checked)} />네이버 결과를 확인했고 임시보관으로 복구하겠습니다.</label>
      <button type="button" disabled={!confirmed || saving} onClick={recover} className="mt-2 rounded border border-neutral-300 px-3 py-1.5 disabled:opacity-40">{saving?"저장 중…":"확인 후 복구"}</button>
    </div>}
    {error && <p role="alert" className="mt-2 text-red-700">{error}</p>}
  </div>;
}
