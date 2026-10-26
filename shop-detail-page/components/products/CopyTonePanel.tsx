"use client";

import { useState } from "react";
import { ApiKeyRequiredModal } from "@/components/settings/ApiKeyRequiredModal";
import { COPY_TONES, copyBundleText, type CopyResult, type CopyTone } from "@/lib/detailBlocks";

// v1.37(E3, 2026-10-26): 상품 문구 말투 5종 — 상품명 후보 3·한 줄 소개·짧은 본문·SNS 문구 2, 블록별 복사 + 묶음 복사.
// 회원 본인 Gemini 키 글 1회, 결과는 저장하지 않음. 가짜 판매량·후기·임상·재촉 문구는 만들지 않는다(서버에서 한 번 더 거름).

async function copy(text: string): Promise<boolean> {
  try { await navigator.clipboard.writeText(text); return true; } catch { return false; }
}

export function CopyTonePanel({ productId }: { productId: string }) {
  const [tone, setTone] = useState<CopyTone>("friendly");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CopyResult | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [needKey, setNeedKey] = useState(false);

  async function run() {
    setBusy(true); setError(null); setResult(null);
    try {
      const res = await fetch(`/api/products/${productId}/copy`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tone }) });
      const json = await res.json();
      if (json.needsApiKey) { setNeedKey(true); return; }
      if (!res.ok) throw new Error(json.error ?? "문구를 만들지 못했습니다.");
      setResult(json.result as CopyResult);
    } catch (e) { setError(e instanceof Error ? e.message : "문구를 만들지 못했습니다."); } finally { setBusy(false); }
  }

  async function doCopy(label: string, text: string) {
    setCopied((await copy(text)) ? `✅ ${label}을(를) 복사했습니다.` : "복사하지 못했습니다. 글을 직접 선택해 복사해 주세요.");
  }

  const Item = ({ label, text }: { label: string; text: string }) => (
    <div className="rounded-lg border border-slate-200 bg-white p-2.5">
      <div className="flex items-center justify-between gap-2"><span className="text-[11px] font-black text-slate-600">{label}</span>
        <button type="button" onClick={() => void doCopy(label, text)} className="text-[11px] font-bold text-blue-700 hover:text-blue-900">📋 복사</button></div>
      <p className="text-xs text-slate-800 mt-1 whitespace-pre-line">{text}</p>
    </div>
  );

  return (
    <div className="mt-6 rounded-2xl border border-slate-200/90 bg-slate-50 p-4 sm:p-5 space-y-3">
      {needKey && <ApiKeyRequiredModal missingLabels={["Google (Gemini / 나노바나나)"]} onClose={() => setNeedKey(false)} />}
      <div>
        <h3 className="text-sm font-black text-slate-900">✍️ 상품 문구 만들기 — 말투 5종</h3>
        <p className="text-xs text-slate-500 mt-1">분석해 둔 상품 정보로 상품명 후보·한 줄 소개·상세 본문·SNS 문구를 씁니다. Gemini 글 1회(회원 본인 키, 수 원)이며 저장되지 않습니다. 상품 정보에 없는 판매량·후기·인증·「한정/오늘만」 문구는 넣지 않습니다.</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {(Object.keys(COPY_TONES) as CopyTone[]).map((k) => (
          <button key={k} type="button" onClick={() => setTone(k)} className={`text-left rounded-xl border p-2.5 ${tone === k ? "border-blue-500 bg-white shadow-xs" : "border-slate-200 bg-white/60 hover:border-slate-300"}`}>
            <div className={`text-xs font-bold ${tone === k ? "text-blue-700" : "text-slate-800"}`}>{COPY_TONES[k].label}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">{COPY_TONES[k].hint}</div>
          </button>
        ))}
      </div>
      <button type="button" onClick={() => void run()} disabled={busy} className="w-full text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 rounded-xl py-3">
        {busy ? "문구 쓰는 중… (10~30초)" : `「${COPY_TONES[tone].label}」 말투로 문구 만들기`}
      </button>
      {error && <p className="text-xs font-semibold text-rose-700 bg-rose-50 rounded-lg p-3 border border-rose-200">{error}</p>}
      {result && (
        <div className="space-y-2">
          <button type="button" onClick={() => void doCopy("묶음", copyBundleText(result))} className="w-full text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl py-2.5">📋 묶음 복사(전체)</button>
          {copied && <p role="status" className="text-[11px] font-bold text-indigo-700 bg-indigo-50 rounded-lg px-2.5 py-1.5">{copied}</p>}
          {result.names.map((n, i) => <Item key={`n${i}`} label={`상품명 후보 ${i + 1}`} text={n} />)}
          {result.oneLine && <Item label="한 줄 소개" text={result.oneLine} />}
          {result.body && <Item label="상세 본문" text={result.body} />}
          {result.sns.map((s, i) => <Item key={`s${i}`} label={`SNS 문구 ${i + 1}`} text={s} />)}
          <p className="text-[11px] text-slate-500">AI가 쓴 문구입니다. 실제 상품과 다른 내용이 없는지 확인한 뒤 쓰세요.</p>
        </div>
      )}
    </div>
  );
}
