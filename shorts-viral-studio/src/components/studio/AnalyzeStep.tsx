"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { analyzeVideosAction } from "@/lib/actions/svs";
import { formatNumber } from "@/lib/youtube/metrics";
import { useStudio } from "@/components/studio/StudioProvider";
import { refHandoffHash } from "@/lib/reference";

// v1.13 대사를 넘길 AI 쇼츠 원스톱 주제 화면(원스톱 v1.32~가 주소 # 뒤 대사를 레퍼런스로 받음)
const ONESTOP_TOPIC_URL = "https://shorts-onestop-studio.buylife.xyz/topic";
import {
  Card,
  ErrorBanner,
  LoadingCard,
  PrimaryButton,
  StepHeader,
} from "@/components/studio/ui";

const VISUAL_LABELS: { key: keyof NonNullable<ReturnType<typeof useStudio>["data"]["analysis"]>["visualStyle"]; label: string; icon: string }[] = [
  { key: "lensAndFraming", label: "렌즈 · 화각", icon: "📷" },
  { key: "cameraMovement", label: "카메라 무빙", icon: "🎥" },
  { key: "lightingArchitecture", label: "조명 · 무드", icon: "💡" },
  { key: "colorGrading", label: "컬러 · 톤", icon: "🎨" },
  { key: "subjectComposition", label: "피사체 · 구도", icon: "📐" },
  { key: "textureAesthetic", label: "질감 · 렌더 룩", icon: "🖼️" },
  { key: "motionVFXPacing", label: "컷 전환 · VFX", icon: "⚡" },
  { key: "promptModifiers", label: "생성 AI 키워드", icon: "🏷️" },
];

export function AnalyzeStep() {
  const router = useRouter();
  const params = useSearchParams();
  const { hydrated, data, update, model, saveProject, requireKey } = useStudio();
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autoRan = useRef(false);

  const selected = data.videos.filter((v) => data.selectedIds.includes(v.id));
  const analysis = data.analysis;
  const upToDate =
    analysis !== null &&
    selected.length > 0 &&
    analysis.videoIds.length === selected.length &&
    selected.every((v) => analysis.videoIds.includes(v.id));

  const run = useCallback(async () => {
    if (selected.length === 0) return;
    setError(null);
    setRunning(true);
    const res = await analyzeVideosAction(selected, model);
    setRunning(false);
    if (!res.success || !res.data) {
      if (res.needApiKey) requireKey(res.missingProvider);
      setError(res.error ?? "분석에 실패했습니다.");
      return;
    }
    update({ analysis: res.data, ideas: [], selectedIdea: null, scenes: [], promptsResult: null });
    await saveProject();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected.map((v) => v.id).join(","), model.provider, model.model]);

  // 검색 화면에서 넘어온 경우(?run=1) 한 번만 자동 실행
  useEffect(() => {
    if (!hydrated || autoRan.current) return;
    if (params.get("run") === "1") {
      autoRan.current = true;
      router.replace("/analyze");
      if (!upToDate && selected.length > 0) void run();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  if (!hydrated) return null;

  if (selected.length === 0) {
    return (
      <div className="space-y-5">
        <StepHeader step={2} title="바이럴 분석" desc="선택한 쇼츠의 성공 공식을 해체합니다." />
        <Card className="text-center py-8">
          <p className="text-sm text-slate-500">분석할 영상이 선택되지 않았습니다. 먼저 쇼츠를 검색하고 영상을 선택해 주세요.</p>
          <div className="mt-4">
            <Link href="/search" className="btn-3d-yt-red px-4 py-2 text-xs font-bold text-white">
              ← 쇼츠 검색으로 돌아가기
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <StepHeader
        step={2}
        title="바이럴 분석"
        desc="선택한 쇼츠가 왜 터졌는지 훅·전개·연출·시청자 반응을 해체합니다."
      />

      <Card>
        <div className="mb-3 flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
          <h2 className="text-sm font-black text-slate-900">분석 대상 영상 ({selected.length}개)</h2>
          <span className="text-xs text-slate-500 font-medium">자동 저장 활성</span>
        </div>
        <div className="grid gap-2.5 sm:grid-cols-2">
          {selected.map((v) => (
            <div key={v.id} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={v.thumbnail} alt="" className="h-10 w-16 shrink-0 rounded-md object-cover border border-slate-200 shadow-2xs" />
              <div className="min-w-0 text-xs">
                <div className="truncate font-bold text-slate-900" title={v.title}>{v.title}</div>
                <div className="mt-0.5 text-slate-500">{v.channelName} · 조회수 {formatNumber(v.views)} · {v.grade}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <PrimaryButton onClick={run} disabled={running}>
            {running ? "분석 중…" : upToDate ? "다시 분석하기" : "⚡ 바이럴 공식 해체 시작"}
          </PrimaryButton>
          <Link href="/search" className="text-xs font-bold text-slate-500 underline hover:text-red-600">
            영상 다시 선택
          </Link>
        </div>
      </Card>

      {error && <ErrorBanner message={error} />}

      {running && (
        <LoadingCard
          title="영상 분석 중…"
          desc="댓글과 정보를 모으고 AI가 성공 공식을 해체하고 있습니다. 영상 직접 분석은 1~2분 걸릴 수 있습니다."
        />
      )}

      {!running && upToDate && analysis && (
        <>
          <Card className={analysis.evidence === "video" ? "border-emerald-300 bg-emerald-50/60" : "border-amber-300 bg-amber-50/60"}>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-black ${analysis.evidence === "video" ? "bg-emerald-600 text-white" : "bg-amber-600 text-white"}`}>
                {analysis.evidence === "video" ? "영상 직접 분석" : "지표·댓글 기반 추정"}
              </span>
              <span className="text-xs font-bold text-slate-600">분석 엔진: {analysis.modelLabel}</span>
            </div>
            {analysis.note && <p className="mt-2 text-xs leading-relaxed text-slate-700 font-medium">{analysis.note}</p>}
            {analysis.evidence === "metadata" && (
              <p className="mt-2 text-xs leading-relaxed text-amber-800">
                화면·소리에 관한 항목은 추정이며 실제 영상과 다를 수 있습니다. 정확한 연출 분석은 Gemini 엔진으로 다시 분석해 주세요.
              </p>
            )}
          </Card>

          {/* v1.13 Gemini가 영상을 직접 본 경우 받아쓴 대사 → AI 쇼츠 원스톱 레퍼런스(대사는 주소 # 뒤라 서버로 가지 않음) */}
          {analysis.transcript && (
            <Card className="border-red-200 bg-gradient-to-br from-red-50/40 to-white">
              <details open>
                <summary className="cursor-pointer text-base font-black text-slate-900 flex items-center justify-between">
                  <span>🎙 영상 대사 (받아쓰기)</span>
                  <span className="text-xs font-bold text-red-600">클릭하여 펼치기/접기</span>
                </summary>
                <p className="mt-3 whitespace-pre-wrap rounded-xl border border-slate-200 bg-white p-3.5 text-xs leading-relaxed text-slate-700 shadow-2xs">
                  {analysis.transcript}
                </p>
              </details>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
                <span className="text-xs text-slate-600 font-medium">
                  분석된 대사를 기반으로 영상을 즉시 제작할 수 있습니다 (문장은 AI가 새로 씁니다).
                </span>
                <a
                  href={`${ONESTOP_TOPIC_URL}${refHandoffHash(analysis.transcript, "쇼츠 떡상 분석·대본 자동화")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-3d-yt-red px-4 py-2 text-xs font-bold text-white shadow-sm"
                >
                  🎬 이 대사로 쇼츠 만들기 (shorts-onestop 연계) ➔
                </a>
              </div>
            </Card>
          )}

          <Card>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-black text-slate-900">🎯 11대 바이럴 메커니즘</h2>
              <span className="text-xs font-bold text-red-600">성공 공식 해체 결과</span>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {analysis.viralMechanisms.map((m) => (
                <div key={m.title} className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 shadow-2xs">
                  <div className="flex items-center gap-2 text-sm font-black text-slate-900">
                    <span className="text-base">{m.icon}</span>
                    <span>{m.title}</span>
                  </div>
                  <div className="mt-1.5 text-xs font-bold text-red-600">{m.tactic}</div>
                  <div className="mt-2 rounded-lg border border-slate-200 bg-white p-2.5 text-[11px] leading-relaxed text-slate-600">
                    {m.analysis}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <h2 className="text-base font-black text-slate-900 border-b border-slate-100 pb-3">⏱️ 구간별 타임라인 전략</h2>
            <div className="mt-4 space-y-2.5">
              {analysis.timelineStrategies.map((t) => (
                <div key={t.range} className="rounded-xl border border-slate-200 border-l-4 border-l-red-600 bg-slate-50 p-3.5 shadow-2xs">
                  <div className="font-mono text-[11px] font-black text-red-600">{t.range}</div>
                  <div className="mt-1 text-sm font-bold text-slate-900">{t.tactic}</div>
                  <div className="mt-1 text-[11px] text-slate-500 font-medium">💡 심리 트리거: {t.psychologicalTrigger}</div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <h2 className="text-base font-black text-slate-900 border-b border-slate-100 pb-3">🎨 시각 연출 DNA</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {VISUAL_LABELS.map((f) => (
                <div key={f.key} className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 shadow-2xs">
                  <div className="text-[11px] font-black text-red-600">{f.icon} {f.label}</div>
                  <div className="mt-1 text-xs leading-relaxed text-slate-700">{analysis.visualStyle[f.key] || "확인 불가"}</div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <h2 className="text-base font-black text-slate-900 border-b border-slate-100 pb-3">💬 시청자 반응 · 결핍 니즈</h2>
            {analysis.commentInsights.length === 0 ? (
              <p className="mt-3 text-xs text-slate-500">확인된 댓글 인사이트가 없습니다. (댓글이 막혀 있거나 YouTube 키가 없는 경우)</p>
            ) : (
              <div className="mt-3 divide-y divide-slate-100">
                {analysis.commentInsights.map((c, i) => (
                  <div key={i} className="flex items-start gap-3 py-2.5">
                    <span className="w-16 shrink-0 rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 text-center text-[10px] font-black text-slate-600">
                      {c.category}
                    </span>
                    <span className="text-xs leading-relaxed text-slate-700">{c.insight}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <div className="flex justify-end pb-6">
            <PrimaryButton onClick={() => router.push("/ideate?run=1")} className="px-7 py-3">
              이 공식으로 소재 6개 발굴하기 ➔
            </PrimaryButton>
          </div>
        </>
      )}
    </div>
  );
}
