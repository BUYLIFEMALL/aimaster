"use client";

// 🔥 떡상 리메이크(v1.16): 레퍼런스(원문·주소·카드 화면 캡처) → AI 분석 → 7대 관점 TOP 3 선택 → 주제·장수 자동 입력
import { useState } from "react";
import { Flame, ImagePlus, Loader2, X } from "lucide-react";
import { useStudio } from "./ProjectProvider";
import { BTN_GHOST, BTN_PRIMARY, Card, ErrorNote, Field, INPUT } from "./ui";
import { VIRAL_ANGLES } from "@/lib/cardnews/ai/remakePrompts";
import { IMAGE_READ_FAIL_MESSAGE, splitReadableImages } from "@/lib/cardnews/imageFileCheck";
import type { AngleId, RemakeState } from "@/lib/cardnews/types";

const MAX_IMAGES = 6;

interface RefImage {
  name: string;
  mimeType: string;
  data: string;
  preview: string;
}

/** 긴 변 1024px JPEG(base64)로 줄인다 — 요청 크기 한도와 AI 비용을 함께 줄인다 */
async function shrink(file: File): Promise<RefImage> {
  const bmp = await createImageBitmap(file);
  const s = Math.min(1, 1024 / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(bmp.width * s));
  c.height = Math.max(1, Math.round(bmp.height * s));
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("이 브라우저에서 이미지를 처리할 수 없습니다.");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close();
  const url = c.toDataURL("image/jpeg", 0.82);
  return { name: file.name, mimeType: "image/jpeg", data: url.split(",")[1], preview: url };
}

export function RemakePanel() {
  const { project, update, keys } = useStudio();
  const remake: RemakeState = project.remake ?? { sourceText: "", sourceUrl: "" };
  const [images, setImages] = useState<RefImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ message: string; needKey?: boolean } | null>(null);
  const analysis = remake.analysis;
  const engineReady = keys ? keys[project.engine.provider] : true;

  const patch = (p: Partial<RemakeState>) => update((d) => ({ ...d, remake: { ...(d.remake ?? { sourceText: "", sourceUrl: "" }), ...p } }));

  async function addImages(list: FileList | null) {
    const picked = Array.from(list ?? []).filter((f) => f.type.startsWith("image/")).slice(0, MAX_IMAGES - images.length);
    if (!picked.length) return;
    const { readable, failed } = await splitReadableImages(picked);
    setError(failed.length ? { message: `${IMAGE_READ_FAIL_MESSAGE} (${failed.map((f) => f.name).join(", ")})` } : null);
    try {
      const made = await Promise.all(readable.map(shrink));
      setImages((cur) => [...cur, ...made].slice(0, MAX_IMAGES));
    } catch (e) {
      setError({ message: e instanceof Error ? e.message : "이미지를 준비하지 못했습니다." });
    }
  }

  async function analyze() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/cardnews/remake/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: project.plan.category,
          text: remake.sourceText,
          url: remake.sourceUrl,
          images: images.map(({ mimeType, data }) => ({ mimeType, data })),
          engine: project.engine,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError({ message: data.error || "분석하지 못했습니다.", needKey: data.needApiKey });
        return;
      }
      patch({ analysis: data.analysis, angleId: undefined });
    } catch {
      setError({ message: "네트워크 오류로 분석하지 못했습니다. 잠시 뒤 다시 시도해주세요." });
    } finally {
      setLoading(false);
    }
  }

  function chooseAngle(id: AngleId) {
    if (!analysis) return;
    const angle = analysis.angles.find((a) => a.id === id);
    const topic = (analysis.suggestedTopic || angle?.hook || "").slice(0, 200);
    update((d) => ({
      ...d,
      title: d.title === "새 카드뉴스" && topic ? topic.slice(0, 80) : d.title,
      remake: { ...(d.remake ?? { sourceText: "", sourceUrl: "" }), angleId: id },
      plan: { ...d.plan, topic: topic || d.plan.topic, pageCount: analysis.recommendedPages as typeof d.plan.pageCount },
    }));
  }

  const hasInput = !!remake.sourceText.trim() || !!remake.sourceUrl.trim() || images.length > 0;

  return (
    <Card className="space-y-4">
      <div>
        <h2 className="flex items-center gap-2 text-sm font-bold text-slate-100"><Flame className="h-4 w-4 text-orange-400" /> 떡상 레퍼런스</h2>
        <p className="mt-1 text-[11px] text-slate-400">반응이 좋았던 카드뉴스·릴스·기사를 넣으면 AI가 왜 터졌는지 분석하고, 더 나은 카드뉴스로 다시 만들 관점을 추천합니다. 원본 문장·이미지는 그대로 쓰지 않고 새로 재구성합니다.</p>
      </div>

      <Field label="원문 붙여넣기 (캡션·대본·기사 본문)">
        <textarea className={`${INPUT} min-h-28`} value={remake.sourceText} maxLength={12000} placeholder="떡상 게시물의 캡션, 릴스 대본, 기사 본문 등을 붙여넣으세요." onChange={(e) => patch({ sourceText: e.target.value })} />
      </Field>
      <Field label="주소 (기사 또는 유튜브)" hint="기사는 본문을 가져와 분석하고, 유튜브는 Gemini가 영상을 직접 봅니다. 인스타그램 주소는 로그인이 필요해 가져올 수 없으니 화면을 캡처해 올려 주세요.">
        <input className={INPUT} value={remake.sourceUrl} maxLength={1000} placeholder="https://" inputMode="url" onChange={(e) => patch({ sourceUrl: e.target.value })} />
      </Field>

      <div>
        <span className="mb-1.5 block text-xs font-bold text-slate-300">카드 화면 캡처 (최대 {MAX_IMAGES}장, 이 브라우저 안에서 줄인 뒤 분석에만 사용·저장 안 함)</span>
        <div className="flex flex-wrap gap-2">
          {images.map((img, i) => (
            <div key={`${img.name}-${i}`} className="relative h-20 w-16 overflow-hidden rounded-lg border border-[#262c3d]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.preview} alt={img.name} className="h-full w-full object-cover" />
              <button type="button" aria-label={`${img.name} 빼기`} onClick={() => setImages((cur) => cur.filter((_, k) => k !== i))} className="absolute right-0.5 top-0.5 rounded-full bg-black/70 p-0.5 text-white"><X className="h-3 w-3" /></button>
            </div>
          ))}
          {images.length < MAX_IMAGES && (
            <label className="flex h-20 w-16 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-[#262c3d] text-slate-400 hover:border-purple-500">
              <ImagePlus className="h-5 w-5" />
              <span className="text-[10px]">추가</span>
              <input type="file" accept="image/png,image/jpeg,image/webp" multiple hidden onChange={(e) => { void addImages(e.target.files); e.target.value = ""; }} />
            </label>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => void analyze()} disabled={loading || !hasInput || !project.plan.category.trim() || !engineReady} className={BTN_PRIMARY}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Flame className="h-4 w-4" />} {analysis ? "다시 분석" : "떡상 분석"}
        </button>
        {loading && <span className="text-xs text-slate-400">AI가 레퍼런스를 분석하는 중입니다(이미지·영상이 있으면 조금 더 걸려요)…</span>}
      </div>
      {error && <ErrorNote message={error.message} needKey={error.needKey} />}

      {analysis && (
        <div className="space-y-4 border-t border-[#262c3d] pt-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-[#262c3d] bg-[#0d0f17] p-3">
              <p className="text-xs font-bold text-slate-300">① 원문 핵심</p>
              <p className="mt-1 text-xs text-slate-300">{analysis.summary}</p>
              {analysis.keyFacts.length > 0 && (
                <details className="mt-2 text-[11px] text-slate-400">
                  <summary className="cursor-pointer">핵심 사실·목록 {analysis.keyFacts.length}개 보기</summary>
                  <ol className="mt-1 list-decimal space-y-0.5 pl-4">{analysis.keyFacts.map((f, i) => <li key={i}>{f}</li>)}</ol>
                </details>
              )}
            </div>
            <div className="rounded-xl border border-[#262c3d] bg-[#0d0f17] p-3">
              <p className="text-xs font-bold text-slate-300">② 떡상 이유 {analysis.trigger && <span className="ml-1 rounded-full bg-orange-500/15 px-2 py-0.5 text-[10px] text-orange-300">{analysis.trigger}</span>}</p>
              <p className="mt-1 text-xs text-slate-300">{analysis.viralReason}</p>
            </div>
            <div className="rounded-xl border border-[#262c3d] bg-[#0d0f17] p-3 md:col-span-2">
              <p className="text-xs font-bold text-slate-300">③ 차별화 전략</p>
              {analysis.weakness && <p className="mt-1 text-[11px] text-slate-400">원본의 아쉬운 점: {analysis.weakness}</p>}
              <p className="mt-1 text-xs text-slate-300">{analysis.strategy}</p>
              <p className="mt-2 text-[11px] text-slate-400">원본 목록 항목 {analysis.itemCount}개 → 빠짐없이 담으려면 <b className="text-slate-200">{analysis.recommendedPages}장</b> 추천</p>
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-bold text-slate-300">④ 추천 관점 TOP {analysis.angles.length} — 하나를 고르면 주제·장수가 채워집니다</p>
            <div className="grid gap-3 lg:grid-cols-3">
              {analysis.angles.map((a, i) => {
                const meta = VIRAL_ANGLES.find((v) => v.id === a.id);
                const on = remake.angleId === a.id;
                return (
                  <div key={a.id} className={`flex flex-col rounded-xl border p-3 ${on ? "border-orange-400 bg-orange-500/10" : "border-[#262c3d] bg-[#0d0f17]"}`}>
                    <p className="text-[11px] font-bold text-orange-300">{i + 1}위 · {meta?.emoji} {meta?.label}</p>
                    <p className="mt-1 text-sm font-bold text-slate-100">“{a.hook}”</p>
                    <p className="mt-1 text-[11px] text-slate-400">{a.reason}</p>
                    {a.storyline.length > 0 && (
                      <details className="mt-1 text-[11px] text-slate-400">
                        <summary className="cursor-pointer">장별 줄거리</summary>
                        <ul className="mt-1 space-y-0.5">{a.storyline.map((s, k) => <li key={k}>{s}</li>)}</ul>
                      </details>
                    )}
                    <button type="button" onClick={() => chooseAngle(a.id)} className={`mt-auto pt-2 ${on ? BTN_PRIMARY : BTN_GHOST}`} aria-pressed={on}>
                      {on ? "선택됨" : "이 관점으로 만들기"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
