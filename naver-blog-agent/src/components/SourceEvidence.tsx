"use client";

import type { SourceBundle } from "@/lib/sourceBundle";
import { sourceUrl } from "@/lib/sourceBundle";

export default function SourceEvidence({source}: {source?: SourceBundle}) {
  if (!source) return null;
  return <details className="my-3 w-full rounded-xl border border-sky-200 bg-sky-50 p-3 text-left text-xs text-sky-950">
    <summary className="cursor-pointer font-bold">수집 원문·출처 확인</summary>
    <p className="mt-2 break-words">수집: {source.collectedAt} · 만료: {source.expiresAt}</p>
    <p className="mt-2">{source.kind === "perplexity" ? "AI 검색 보고서·제공된 참고 주소입니다. 원문에서 사실을 직접 확인해 주세요." : source.kind === "shorts" ? "영상 제목·설명·댓글 자료입니다. 영상 대사·실제 경험을 확인한 근거는 아닙니다." : "수집 당시 본문 일부입니다. 전체 원문과 최신 내용은 출처에서 직접 확인해 주세요."}</p>
    <ul className="mt-2 space-y-1">{source.urls.filter(url => sourceUrl(url)).map(url => <li key={url}><a href={url} target="_blank" rel="noopener noreferrer" className="break-all underline">{url}</a></li>)}</ul>
    {!source.urls.length && <p className="mt-2 font-semibold">확인 가능한 출처 주소가 없습니다.</p>}
    <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-white p-3 font-sans leading-relaxed">{source.text}</pre>
    <p className="mt-2">제목·요약·원고 편집은 이 원문과 원래 만료일을 바꾸지 않습니다. 수집 자료가 최종 본문의 모든 주장을 입증한다는 뜻은 아닙니다.</p>
  </details>;
}
