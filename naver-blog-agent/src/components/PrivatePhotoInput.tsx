"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { ArrowDown, ArrowUp, Check, ImagePlus, Loader2, RefreshCw, Star, X } from "lucide-react";
import { PrivatePhotoInput as PhotoInput, type PhotoInputItem } from "@/lib/privatePhotoInput";
import { MAX_REVIEW_PHOTOS } from "@/lib/privatePhotoRules";
import PhotoReviewDraft, { type PhotoReviewOptions } from "./PhotoReviewDraft";

const stateText: Record<PhotoInputItem["status"], string> = {
  checking: "사진 확인 중", uploading: "비공개 저장 중", resolving: "보관 기간 확인 중",
  ready: "준비 완료", failed: "확인 필요", expired: "보관 기간 만료",
};
const busy = (item: PhotoInputItem) => ["checking", "uploading", "resolving"].includes(item.status);

export default function PrivatePhotoInput(options: PhotoReviewOptions) {
  const [input] = useState(() => new PhotoInput());
  const state = useSyncExternalStore(input.subscribe, input.getSnapshot, input.getSnapshot);
  const [dragging, setDragging] = useState(false);
  useEffect(() => {
    const timer = setInterval(input.expire, 60_000);
    return () => { clearInterval(timer); input.clear(); };
  }, [input]);
  const prepared = input.prepared();
  const add = (files: FileList | null) => { if (files?.length) input.add(Array.from(files)); };

  return (
    <details id="private-photo-input" className="group scroll-mt-20 rounded-2xl border border-emerald-200 bg-emerald-50/40">
      <summary className="flex cursor-pointer list-none items-center gap-3 rounded-2xl p-4 focus-visible:outline-2 focus-visible:outline-emerald-600">
        <ImagePlus className="h-5 w-5 shrink-0 text-emerald-700" aria-hidden="true" />
        <span className="flex-1 text-sm font-bold text-slate-900">내 사진 준비 <span className="ml-2 text-xs font-medium text-slate-500">선택 · 대표 · 순서 · 설명</span></span>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-emerald-800">{state.items.length}/{MAX_REVIEW_PHOTOS}장</span>
        <span className="text-xs text-slate-500 group-open:hidden">펼치기</span>
      </summary>
      <div className="space-y-4 border-t border-emerald-100 p-4 sm:p-5">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-950">
          <strong>사진을 준비하고 아래 ‘사진 후기 초안 만들기’로 이어가세요.</strong> 일반 글 생성 버튼에는 사진이 사용되지 않습니다.
          저장 전 사진 선택·설명·후기 초안은 이 화면에서만 유지됩니다. 초안을 만든 뒤 ‘원고로 저장·이어서 편집’을 눌러 보관함에 저장하세요.
        </div>
        <ol className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4" aria-label="사진 준비 순서">
          {["사진 선택", "대표·순서 정리", "사진 설명", "준비 상태 확인"].map((label, index) => (
            <li key={label} className="rounded-lg border border-emerald-100 bg-white p-3"><span className="mr-2 font-bold text-emerald-700">{index + 1}</span>{label}</li>
          ))}
        </ol>
        <div onDragOver={event => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)}
          onDrop={event => { event.preventDefault(); setDragging(false); add(event.dataTransfer.files); }}
          className={`rounded-xl border-2 border-dashed p-5 text-center ${dragging ? "border-emerald-600 bg-emerald-100" : "border-emerald-200 bg-white"}`}>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-emerald-700 px-4 py-3 text-sm font-bold text-white has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-emerald-600">
            <ImagePlus className="h-4 w-4" aria-hidden="true" />사진 선택
            <input type="file" className="sr-only" multiple accept="image/jpeg,image/png,image/webp" aria-label="준비할 사진 선택"
              onChange={event => { add(event.currentTarget.files); event.currentTarget.value = ""; }} />
          </label>
          <p className="mt-2 text-xs text-slate-600">사진을 끌어 놓아도 됩니다. JPEG · PNG · WebP, 장당 4MB 이하, 최대 6장</p>
          <p className="mt-1 text-xs text-slate-500">내 사진 6장과 AI 이미지 생성 장수 설정은 별개입니다.</p>
        </div>
        <p className="text-xs leading-relaxed text-slate-600">🔒 사진은 본인만 조회할 수 있도록 비공개로 보관하며, 원래 등록일 기준 30일 후 정리됩니다. ‘제거’와 ‘전체 취소’는 준비 목록에서만 제외합니다. 이미 전송된 파일의 보관 기간은 그대로 유지됩니다.</p>
        <div role="status" aria-live="polite" className="text-xs leading-relaxed text-slate-700">
          {state.notice || (state.items.length ? `${state.items.filter(item => item.status === "ready").length}/${state.items.length}장 준비 완료` : "아직 선택한 사진이 없습니다.")}
        </div>
        {state.items.length > 0 && <>
          <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-label="선택한 사진 목록">
            {state.items.map((item, index) => {
              const cover = item.id === state.coverId;
              return <li key={item.id} className={`min-w-0 overflow-hidden rounded-xl border bg-white ${cover ? "border-emerald-500 ring-1 ring-emerald-200" : "border-slate-200"}`}>
                <div className="relative flex aspect-[4/3] items-center justify-center bg-slate-100">
                  {item.localUrl ? /* eslint-disable-next-line @next/next/no-img-element -- 원본 로컬 Blob 미리보기, 외부 최적화 없음 */
                    <img src={item.localUrl} alt={`사진 ${index + 1}: ${item.caption || item.name}`} className="h-full w-full object-contain" />
                    : <ImagePlus className="h-8 w-8 text-slate-300" aria-hidden="true" />}
                  <span className="absolute left-2 top-2 rounded-md bg-white/95 px-2 py-1 text-xs font-bold text-slate-700">{index + 1}{cover ? " · 대표" : ""}</span>
                  <button type="button" aria-label={`사진 ${index + 1} ${busy(item) ? "업로드 취소" : "제거"}`} onClick={() => input.remove(item.id)} className="absolute right-2 top-2 rounded-full bg-white p-2 text-slate-600 hover:bg-rose-50 hover:text-rose-700 focus-visible:outline-2 focus-visible:outline-emerald-600"><X className="h-4 w-4" aria-hidden="true" /></button>
                </div>
                <div className="space-y-3 p-3">
                  <p className="truncate text-xs font-semibold text-slate-700" title={item.name}>{item.name}</p>
                  <div className={`flex items-center gap-1.5 text-xs ${item.status === "failed" || item.status === "expired" ? "text-rose-700" : "text-emerald-800"}`}>
                    {busy(item) ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : item.status === "ready" ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : null}
                    {stateText[item.status]}
                  </div>
                  {item.error && <p className="text-xs leading-relaxed text-rose-700">{item.error}{!item.asset && " 목록에서 제거한 뒤 사진을 다시 선택해 주세요."}</p>}
                  {item.metadata && <p className="text-[11px] text-slate-500">보관 만료: {new Date(item.metadata.expiresAt).toLocaleDateString("ko-KR")}</p>}
                  <label className="block text-xs font-medium text-slate-700">사진 {index + 1} 설명
                    <textarea aria-label={`사진 ${index + 1} 설명`} maxLength={500} rows={2} value={item.caption} onChange={event => input.caption(item.id, event.target.value)} placeholder="사진에 보이는 내용과 직접 경험한 사실을 적어 주세요." className="mt-1 w-full resize-y rounded-lg border border-slate-200 p-2 text-xs leading-relaxed focus:border-emerald-600 focus:outline-none" />
                    <span className="mt-1 block text-right text-[10px] text-slate-400">{item.caption.length}/500</span>
                  </label>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button type="button" aria-label={`사진 ${index + 1} 대표 선택`} aria-pressed={cover} disabled={item.status !== "ready"} onClick={() => input.cover(item.id)} className="inline-flex items-center gap-1 rounded-md border border-emerald-200 px-2 py-2 text-xs text-emerald-800 disabled:opacity-40"><Star className="h-3 w-3" aria-hidden="true" />{cover ? "대표 사진" : "대표로"}</button>
                    <button type="button" aria-label={`사진 ${index + 1} 앞으로 이동`} disabled={index === 0} onClick={() => input.move(item.id, -1)} className="rounded-md border border-slate-200 p-2 disabled:opacity-30"><ArrowUp className="h-3.5 w-3.5" aria-hidden="true" /></button>
                    <button type="button" aria-label={`사진 ${index + 1} 뒤로 이동`} disabled={index === state.items.length - 1} onClick={() => input.move(item.id, 1)} className="rounded-md border border-slate-200 p-2 disabled:opacity-30"><ArrowDown className="h-3.5 w-3.5" aria-hidden="true" /></button>
                    {item.asset && <button type="button" aria-label={`사진 ${index + 1} 상태 다시 확인`} disabled={busy(item)} onClick={() => { void input.refresh(item.id); }} className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-2 text-xs text-slate-600 disabled:opacity-30"><RefreshCw className="h-3 w-3" aria-hidden="true" />다시 확인</button>}
                  </div>
                </div>
              </li>;
            })}
          </ol>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white p-3">
            <p className={`text-xs font-semibold ${prepared ? "text-emerald-800" : "text-slate-600"}`}>{prepared ? `${prepared.photos.length}장 준비 완료 · 대표/순서/설명을 확인해 주세요.` : "모든 사진의 준비 상태를 확인해 주세요."}</p>
            <button type="button" onClick={input.clear} className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700">사진 준비 전체 취소</button>
          </div>
        </>}
        <PhotoReviewDraft {...options} prepared={prepared} />
      </div>
    </details>
  );
}
