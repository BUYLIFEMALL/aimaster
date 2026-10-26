"use client";

import { useState } from "react";
import { Download, Sparkles } from "lucide-react";
import { PageHeader, Notice } from "@/components/ui/PageHeader";
import { Dropzone } from "@/components/ui/Dropzone";
import { Bars, Stat } from "@/components/report/Widgets";
import { ACCEPT_SHEETS, readSheetBytes, sampleWorkbook } from "@/lib/sheet";
import { averageRating, complaints, ratingDistribution, reviewColumns, toReviews, topWords, type Review } from "@/lib/report/reviews";
import { SAMPLE_REVIEWS, SAMPLE_REVIEW_HEADERS } from "@/lib/sample";
import { saveBlob } from "@/lib/download";

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [name, setName] = useState("");
  const [product, setProduct] = useState("all");
  const [error, setError] = useState<string | null>(null);
  const [ai, setAi] = useState<{ busy: boolean; text?: string; error?: string }>({ busy: false });

  async function onFiles(files: File[]) {
    setError(null);
    setAi({ busy: false });
    const file = files[0];
    try {
      const sheet = readSheetBytes(new Uint8Array(await file.arrayBuffer()), file.name);
      const cols = reviewColumns(sheet.headers);
      if (!cols.text) throw new Error(`리뷰 글이 든 열을 찾지 못했습니다(열 이름: ${sheet.headers.join(", ")}). 열 이름을 「리뷰내용」으로 바꿔 다시 올려 주세요.`);
      const rs = toReviews(sheet, cols);
      setReviews(rs);
      setName(`${file.name} · ${rs.length}개`);
      setProduct("all");
    } catch (e) {
      setError(e instanceof Error ? e.message : "파일을 읽지 못했습니다.");
    }
  }

  const products = [...new Set(reviews.map((r) => r.product).filter(Boolean))];
  const scoped = product === "all" ? reviews : reviews.filter((r) => r.product === product);
  const avg = averageRating(scoped);
  const dist = ratingDistribution(scoped);
  const words = topWords(scoped, 15);
  const bad = complaints(scoped, 20);

  async function summarize() {
    setAi({ busy: true });
    try {
      const res = await fetch("/api/reviews/summary", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reviews: scoped.map((r) => ({ rating: r.rating, text: r.text })) }) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) setAi({ busy: false, error: json.error ?? "요약에 실패했습니다." });
      else setAi({ busy: false, text: json.summary });
    } catch {
      setAi({ busy: false, error: "요약 요청을 보내지 못했습니다." });
    }
  }

  return (
    <div>
      <PageHeader emoji="⭐" title="리뷰 분석" description="판매자센터에서 내려받은 내 상품 리뷰 파일을 올리세요. 별점·자주 나온 말·불만 리뷰는 무료로 이 PC에서 계산합니다." />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <div className="space-y-4">
          <section className="slw-card space-y-3 p-4">
            <Dropzone accept={ACCEPT_SHEETS} multiple={false} label="리뷰 파일(엑셀·CSV) 올리기" hint="열 이름 예: 상품명 · 별점 · 리뷰내용" onFiles={(f) => void onFiles(f)} />
            <button type="button" className="slw-btn w-full" onClick={() => saveBlob("예시_리뷰.xlsx", sampleWorkbook(SAMPLE_REVIEW_HEADERS, SAMPLE_REVIEWS))}><Download size={14} /> 예시 리뷰 파일 받기</button>
            {name && <p className="text-[12px] text-slate-600">지금 파일: {name}</p>}
            {products.length > 1 && (
              <select className="slw-field" value={product} onChange={(e) => { setProduct(e.target.value); setAi({ busy: false }); }} aria-label="상품">
                <option value="all">모든 상품</option>
                {products.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            )}
            {error && <Notice tone="warn">{error}</Notice>}
          </section>
          <Notice>ℹ 내 상품 리뷰만 다룹니다. 리뷰 파일은 서버에 저장하지 않습니다(AI 요약을 누를 때만 그 글이 회원 본인 Gemini 키로 전달됩니다).</Notice>
          {/* E5-3(2026-10-26): 후기·송장 사진을 공유하기 전 얼굴·번호 가리기 — 바나나 캔버스 무료 이미지 도구(키·비용 없음) */}
          <a href="https://banana-canvas.buylife.xyz/tools?tab=face" target="_blank" rel="noopener noreferrer" className="slw-card flex items-center gap-2 p-3 text-[13px] font-bold text-slate-800 hover:border-teal-400">
            <span aria-hidden>🙈</span>후기·송장 사진 속 얼굴·전화번호 가리기 ↗
          </a>
        </div>

        {reviews.length === 0 ? (
          <div className="slw-card p-8 text-center text-sm text-slate-600">리뷰 파일을 올리면 여기에 결과가 나옵니다.</div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
              <Stat label="리뷰 수" value={`${scoped.length}개`} />
              <Stat label="평균 별점" value={avg == null ? "—" : `${avg} / 5`} tone={avg != null && avg < 4 ? "bad" : "good"} />
              <Stat label="불만 리뷰" value={`${bad.length}개`} tone={bad.length ? "bad" : "plain"} sub="별점 2 이하 또는 불만 단어" />
            </div>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <section className="slw-card p-4">
                <h2 className="mb-2 text-sm font-extrabold text-slate-900">별점 분포</h2>
                <Bars rows={dist.map((d) => ({ label: `${"★".repeat(d.star)}`, value: d.count, color: d.star <= 2 ? "#e11d48" : "#0f766e" }))} format={(n) => `${n}개`} />
              </section>
              <section className="slw-card p-4">
                <h2 className="mb-2 text-sm font-extrabold text-slate-900">자주 나온 말</h2>
                <div className="flex flex-wrap gap-1.5">
                  {words.map((w) => (
                    <span key={w.word} className="rounded-full bg-teal-50 px-2.5 py-1 text-[12px] font-bold text-teal-900">{w.word} <span className="font-mono text-teal-700">{w.count}</span></span>
                  ))}
                </div>
              </section>
            </div>
            <section className="slw-card p-4">
              <h2 className="mb-2 text-sm font-extrabold text-slate-900">불만 리뷰(낮은 별점 먼저)</h2>
              {bad.length === 0 ? (
                <p className="text-[13px] text-slate-600">불만 리뷰가 없습니다.</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {bad.map((r, i) => (
                    <li key={i} className="py-2 text-[13px] text-slate-800">
                      <span className="mr-2 font-mono text-rose-700">{r.rating != null ? `★${r.rating}` : "—"}</span>
                      {r.product && <span className="mr-2 text-[12px] text-slate-500">{r.product}</span>}
                      {r.text}
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <section className="slw-card space-y-2 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-extrabold text-slate-900">AI 개선점 요약(선택)</h2>
                <button type="button" className="slw-primary" disabled={ai.busy} onClick={() => void summarize()}><Sparkles size={14} /> {ai.busy ? "요약 중…" : "내 Gemini 키로 요약"}</button>
              </div>
              <p className="text-[12px] text-slate-600">회원 본인 Gemini 키로 가장 저렴한 모델을 1번 부릅니다(리뷰 최대 400개). 키가 없으면 메인 사이트에서 등록해 주세요.</p>
              {ai.error && <Notice tone="warn">{ai.error}</Notice>}
              {ai.text && <div className="whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-[13px] leading-relaxed text-slate-800">{ai.text}</div>}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
