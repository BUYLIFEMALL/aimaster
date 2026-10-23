"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Copy, Loader2, NotebookPen } from "lucide-react";
import type { PreparedPhotoSet } from "@/lib/privatePhotoInput";
import { PhotoReviewClient } from "@/lib/photoReviewClient";
import { MAX_REVIEW_TOTAL_BYTES, photoReviewPlainText, photoReviewRevision, supportsPhotoReview, cleanVisitInfo, VISIT_KINDS, type PhotoReviewInput, type PhotoReviewResult } from "@/lib/photoReview";
import { ENGINES, type EngineProvider } from "@/lib/ai/contentModels";
import type { WritingTone } from "@/lib/ai/writingStyles";

export type PhotoReviewOptions = {
  engine: { provider: EngineProvider; model: string };
  onEngineChange: (engine: { provider: EngineProvider; model: string }) => void;
  onContinue: (review: PhotoReviewResult) => Promise<{ opened: boolean; saved: boolean }>;
  blocked: boolean;
  preferredTone: WritingTone; targetLength: number; configuredProviders: string[];
};

export default function PhotoReviewDraft({ prepared, engine, onEngineChange, onContinue, blocked, preferredTone, targetLength, configuredProviders }: PhotoReviewOptions & { prepared: PreparedPhotoSet | null }) {
  const [openedResult, setOpenedResult] = useState<PhotoReviewResult | null>(null);
  const [continuing, setContinuing] = useState(false);
  const [place, setPlace] = useState("");
  const [visitNotes, setVisitNotes] = useState("");
  // 병합 A-3: 방문 정보·근거 있는 FAQ(올인원 → 에이전트)
  const [visitRaw, setVisitRaw] = useState({ kind: "", region: "", visitDate: "", companion: "", oneLine: "" });
  const [includeFaq, setIncludeFaq] = useState(false);
  const visit = cleanVisitInfo(visitRaw);
  const setVisitField = (key: keyof typeof visitRaw) => (event: { target: { value: string } }) => setVisitRaw(prev => ({ ...prev, [key]: event.target.value }));
  const [copyNotice, setCopyNotice] = useState("");
  const [client] = useState(() => new PhotoReviewClient());
  const state = useSyncExternalStore(client.subscribe, client.getSnapshot, client.getSnapshot);
  const supported = supportsPhotoReview(engine.provider, engine.model);
  const keyReady = configuredProviders.includes(engine.provider);
  const tooLarge = Boolean(prepared && prepared.photos.reduce((total, photo) => total + photo.size, 0) > MAX_REVIEW_TOTAL_BYTES);
  const input: PhotoReviewInput | null = prepared && !tooLarge && place.trim() && supported && keyReady ? {
    ...prepared, photos: prepared.photos.map(({ id, storagePath, caption }) => ({ id, storagePath, caption })),
    place: place.trim(), visitNotes: visitNotes.trim(), ...(visit ? { visit } : {}), ...(includeFaq ? { includeFaq: true } : {}), engine, preferredTone, targetLength: Math.min(2500, Math.max(500, targetLength)),
  } : null;
  const revision = input ? photoReviewRevision(input) : "";
  useEffect(() => { client.update(input); }, [client, revision]); // eslint-disable-line react-hooks/exhaustive-deps -- 내용이 같은 입력은 같은 revision이다.
  useEffect(() => client.dispose, [client]);
  const current = state.revision === revision;
  const pending = current && state.pending;
  const result = current ? state.result : null;
  const options = ENGINES.flatMap(group => group.models.filter(model => supportsPhotoReview(group.provider, model.value)).map(model => ({ provider: group.provider, model: model.value, label: `${group.label} · ${model.value}` })));

  return <section aria-labelledby="photo-review-heading" className="space-y-4 rounded-xl border border-emerald-200 bg-white p-4">
    <h3 id="photo-review-heading" className="flex items-center gap-2 text-sm font-bold text-emerald-950"><NotebookPen className="h-4 w-4" aria-hidden="true" />사진과 방문 메모로 후기 초안</h3>
    <p className="text-xs leading-relaxed text-slate-600">사진에서 보이는 내용과 본인이 적은 경험을 나눠 초안을 만듭니다. 초안을 확인한 뒤 ‘원고로 저장·이어서 편집’으로 기존 편집·검수·확장 준비를 이어가세요. 저장 전 이동·새로고침하면 사진 선택·메모·초안이 사라집니다.</p>
    <label className="block text-xs font-semibold text-slate-700">장소 또는 후기 주제
      <input value={place} onChange={event => setPlace(event.target.value)} maxLength={120} placeholder="예: 직접 방문한 카페 이름" className="mt-1 w-full rounded-lg border border-slate-200 p-3 text-sm" />
    </label>
    <fieldset className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      <legend className="mb-1 text-xs font-semibold text-slate-700">방문 정보 <span className="font-normal text-slate-500">(선택 · 본인이 아는 사실만)</span></legend>
      <label className="block text-xs text-slate-700">분류
        <select value={visitRaw.kind} onChange={setVisitField("kind")} className="mt-1 w-full rounded-lg border border-slate-200 p-2 text-sm">
          <option value="">선택 안 함</option>{VISIT_KINDS.map(kind => <option key={kind} value={kind}>{kind}</option>)}
        </select>
      </label>
      <label className="block text-xs text-slate-700">지역<input value={visitRaw.region} onChange={setVisitField("region")} maxLength={60} placeholder="예: 서울 성수동" className="mt-1 w-full rounded-lg border border-slate-200 p-2 text-sm" /></label>
      <label className="block text-xs text-slate-700">방문일<input type="date" value={visitRaw.visitDate} onChange={setVisitField("visitDate")} className="mt-1 w-full rounded-lg border border-slate-200 p-2 text-sm" /></label>
      <label className="block text-xs text-slate-700">동행<input value={visitRaw.companion} onChange={setVisitField("companion")} maxLength={40} placeholder="예: 가족 4명" className="mt-1 w-full rounded-lg border border-slate-200 p-2 text-sm" /></label>
      <label className="block text-xs text-slate-700 sm:col-span-2">한 줄 소감<input value={visitRaw.oneLine} onChange={setVisitField("oneLine")} maxLength={120} placeholder="예: 창가 자리가 넓어 오래 머물기 좋았어요" className="mt-1 w-full rounded-lg border border-slate-200 p-2 text-sm" /></label>
      <label className="flex items-start gap-2 text-xs text-slate-700 sm:col-span-2">
        <input type="checkbox" checked={includeFaq} onChange={event => setIncludeFaq(event.target.checked)} className="mt-0.5" />
        <span><span className="font-semibold">마지막에 자주 묻는 질문(FAQ) 넣기</span> <span className="text-slate-500">— 메모·방문 정보·사진으로 답할 수 있는 질문만 씁니다. 주차·가격처럼 자료에 없는 것은 「확인할 내용」으로 알려 드립니다.</span></span>
      </label>
    </fieldset>
    <label className="block text-xs font-semibold text-slate-700">직접 경험한 내용 · 방문 메모
      <textarea value={visitNotes} onChange={event => setVisitNotes(event.target.value)} maxLength={4000} rows={4} placeholder="직접 확인한 메뉴·가격·방문일·맛·느낌만 적어 주세요. 비워 두면 사진 관찰 중심으로 작성합니다." className="mt-1 w-full rounded-lg border border-slate-200 p-3 text-sm leading-relaxed" />
      <span className="mt-1 block text-right font-normal text-slate-400">{visitNotes.length}/4,000</span>
    </label>
    <label className="block text-xs font-semibold text-slate-700">사진 후기 실행 모델
      <select value={`${engine.provider}:${engine.model}`} onChange={event => { const option = options.find(item => `${item.provider}:${item.model}` === event.target.value); if (option) onEngineChange({ provider: option.provider, model: option.model }); }} className="mt-1 w-full rounded-lg border border-slate-200 p-3 text-sm">
        {!supported && <option value={`${engine.provider}:${engine.model}`}>{engine.model} · 사진 입력 미확인</option>}
        {options.map(option => <option key={option.model} value={`${option.provider}:${option.model}`}>{option.label}</option>)}
      </select>
    </label>
    <p className="text-xs text-slate-500">아래 AI 글 생성 모델과 같은 선택값입니다. 말끝 {preferredTone} · 목표 약 {Math.min(2500, Math.max(500, targetLength))}자. 선택한 공급사로 사진이 전송되며 최대 2회 AI 호출 비용이 발생합니다. 사진 생성 비용은 없습니다.</p>
    {!supported && <p className="text-xs text-amber-800">선택한 모델의 사진 입력 지원을 확인하지 못했습니다. 위 목록에서 지원 모델을 직접 선택해 주세요. 자동 교체하지 않습니다.</p>}
    {!keyReady && <p className="text-xs text-amber-800">선택 공급사의 본인 키가 필요합니다. <Link href="/settings" className="font-semibold underline">API키등록·플랫폼연동</Link></p>}
    {!prepared && <p className="text-xs text-slate-600">위 사진을 모두 준비 완료로 만든 뒤 실행해 주세요. 사진은 장당 4MB·합계 12MB 이하입니다.</p>}
    {tooLarge && <p className="text-xs text-rose-700">사진 합계가 12MB를 넘었습니다. 작은 사진으로 바꾸거나 준비 목록에서 일부를 제외해 주세요.</p>}
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" disabled={!input || !current || pending || continuing || blocked} onClick={() => { setCopyNotice(""); void client.run(); }} className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-3 text-sm font-bold text-white disabled:opacity-40">{pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}{pending ? "사진 관찰·후기 작성 중" : "사진 후기 초안 만들기"}</button>
      {pending && <button type="button" onClick={client.cancel} className="rounded-lg border border-slate-200 px-3 py-3 text-xs">요청 중단</button>}
      <Link href="/guide#photo-review-guide-title" className="text-xs text-emerald-800 underline">사진 후기 사용법</Link>
    </div>
    <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-950">⚠️ 사진으로 맛·가격·실제 방문을 증명할 수 없습니다. AI가 추측할 수 있으므로 원본·본인 메모를 직접 대조해 주세요. 중단해도 이미 진행한 AI 호출은 비용이 발생할 수 있으며 자동 재시도하지 않습니다.</p>
    <div role="status" aria-live="polite" className="text-xs leading-relaxed text-rose-700">{current ? state.error : ""}</div>
    {result && <div className="space-y-4 border-t border-emerald-100 pt-4">
      <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-bold text-amber-800">직접 검수가 필요한 초안 · 아래 버튼으로 저장</p><button type="button" onClick={async () => { try { await navigator.clipboard.writeText(photoReviewPlainText(result)); setCopyNotice("초안과 확인할 내용을 복사했습니다."); } catch { setCopyNotice("복사하지 못했습니다. 아래 초안을 직접 선택해 주세요."); } }} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs"><Copy className="h-3 w-3" aria-hidden="true" />초안 복사</button></div>
      <button type="button" disabled={continuing || blocked || openedResult === result} onClick={async () => {
        setContinuing(true);
        try { const outcome = await onContinue(result); if (outcome.opened) setOpenedResult(result); setCopyNotice(outcome.saved ? "새 사진 원고를 저장했습니다. 아래 원고 영역에서 편집·직접 검수해 주세요." : outcome.opened ? "아래 원고의 보관함 저장으로 다시 확인해 주세요. 같은 원고 ID로 재시도하며 새 원고를 복제하지 않습니다." : "원고를 열지 않았습니다. 안내를 확인해 주세요."); }
        finally { setContinuing(false); }
      }} className="rounded-lg bg-emerald-700 px-4 py-3 text-sm font-bold text-white disabled:opacity-40">{continuing ? "원고 저장 중" : openedResult === result ? "아래 원고에서 편집·저장 이어가기" : "원고로 저장·이어서 편집"}</button>
      <p role="status" className="text-xs text-slate-600">{copyNotice}</p>
      <h4 className="text-base font-bold text-slate-900">{result.title}</h4>
      {result.paragraphs.map((paragraph, index) => <div key={index}><p className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-800">{paragraph.text}</p><p className="mt-1 text-[11px] text-slate-500">근거: {paragraph.evidence.map(id => id === "member-notes" ? "회원 메모·사진 설명" : `사진 ${result.photos.findIndex(photo => photo.id === id) + 1} 관찰`).join(" · ")}</p></div>)}
      <details className="rounded-lg bg-slate-50 p-3"><summary className="cursor-pointer text-xs font-bold text-slate-700">근거 대조 · 사진 관찰과 회원 메모</summary><p className="mt-3 whitespace-pre-wrap text-xs leading-relaxed">회원 메모: {result.visitNotes || "입력 없음"}</p>{result.visit && <p className="mt-1 text-xs leading-relaxed">방문 정보: {[result.visit.kind, result.visit.region, result.visit.visitDate, result.visit.companion && `동행 ${result.visit.companion}`, result.visit.oneLine && `「${result.visit.oneLine}」`].filter(Boolean).join(" · ")}</p>}{result.observations.map((observation, index) => <div key={observation.id} className="mt-3 space-y-1 text-xs leading-relaxed"><p className="font-semibold">사진 {index + 1}{observation.id === result.coverId ? " · 대표" : ""}</p><p>회원 설명: {result.photos[index].caption || "입력 없음"}</p><p>AI 관찰: {observation.visible}</p><p className="text-amber-800">알 수 없는 내용: {observation.uncertain.join(" · ") || "AI가 별도 표시하지 않았습니다. 직접 확인해 주세요."}</p></div>)}</details>
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-950"><p className="font-bold">확인할 내용</p><p className="mt-2">{result.warning}</p>{result.confirm.map((item, index) => <p key={index} className="mt-1">· {item}</p>)}</div>
    </div>}
  </section>;
}
