"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { analyzeVideosAction } from "@/lib/actions/svs";
import { formatNumber } from "@/lib/youtube/metrics";
import { useStudio } from "@/components/studio/StudioProvider";
import {
  Card,
  ErrorBanner,
  LoadingCard,
  ModelPicker,
  NeedPrevious,
  PrimaryButton,
  SaveStatus,
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
        <NeedPrevious message="분석할 영상이 선택되지 않았습니다. 먼저 쇼츠를 검색하고 영상을 선택해 주세요." href="/search" label="← 쇼츠 검색으로" />
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

      <ModelPicker hint="Gemini를 선택하면 영상을 직접 보고 분석합니다(컷 전환·자막·소리까지). GPT·Claude는 영상을 볼 수 없어 제목·지표·댓글 기반으로 추정합니다." />

      <Card>
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-neutral-900">분석 대상 ({selected.length}개)</h2>
          <SaveStatus />
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {selected.map((v) => (
            <div key={v.id} className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={v.thumbnail} alt="" className="h-10 w-16 shrink-0 rounded-md object-cover" />
              <div className="min-w-0 text-xs">
                <div className="truncate font-semibold text-neutral-900" title={v.title}>{v.title}</div>
                <div className="mt-0.5 text-neutral-500">{v.channelName} · 조회수 {formatNumber(v.views)} · {v.grade}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <PrimaryButton onClick={run} disabled={running}>
            {running ? "분석 중…" : upToDate ? "다시 분석하기" : "분석 시작"}
          </PrimaryButton>
          <Link href="/search" className="text-xs text-neutral-500 underline">영상 다시 선택</Link>
        </div>
      </Card>

      <ErrorBanner message={error} />

      {running && (
        <LoadingCard
          title="영상 분석 중…"
          desc="댓글과 정보를 모으고 AI가 성공 공식을 해체하고 있습니다. 영상 직접 분석은 1~2분 걸릴 수 있습니다."
        />
      )}

      {!running && upToDate && analysis && (
        <>
          <Card className={analysis.evidence === "video" ? "border-emerald-200 bg-emerald-50/50" : "border-amber-200 bg-amber-50/60"}>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${analysis.evidence === "video" ? "bg-emerald-600 text-white" : "bg-amber-500 text-white"}`}>
                {analysis.evidence === "video" ? "영상 직접 분석" : "지표·댓글 기반 추정"}
              </span>
              <span className="text-xs text-neutral-600">분석 엔진: {analysis.modelLabel}</span>
            </div>
            {analysis.note && <p className="mt-2 text-xs leading-relaxed text-neutral-600">{analysis.note}</p>}
            {analysis.evidence === "metadata" && (
              <p className="mt-2 text-xs leading-relaxed text-amber-800">
                화면·소리에 관한 항목은 추정이며 실제 영상과 다를 수 있습니다. 정확한 연출 분석은 Gemini 엔진으로 다시 분석해 주세요.
              </p>
            )}
          </Card>

          <Card>
            <h2 className="text-base font-bold text-neutral-900">🎯 11대 바이럴 메커니즘</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {analysis.viralMechanisms.map((m) => (
                <div key={m.title} className="rounded-xl border border-neutral-200 bg-neutral-50 p-3.5">
                  <div className="flex items-center gap-2 text-sm font-bold text-neutral-900">
                    <span>{m.icon}</span>
                    {m.title}
                  </div>
                  <div className="mt-1.5 text-xs font-semibold text-rose-600">{m.tactic}</div>
                  <div className="mt-1.5 rounded-lg bg-white p-2 text-[11px] leading-relaxed text-neutral-600">{m.analysis}</div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <h2 className="text-base font-bold text-neutral-900">⏱️ 구간별 타임라인 전략</h2>
            <div className="mt-4 space-y-2.5">
              {analysis.timelineStrategies.map((t) => (
                <div key={t.range} className="rounded-xl border border-neutral-200 border-l-4 border-l-rose-500 bg-neutral-50 p-3.5">
                  <div className="font-mono text-[11px] font-bold text-rose-600">{t.range}</div>
                  <div className="mt-1 text-sm text-neutral-900">{t.tactic}</div>
                  <div className="mt-1 text-[11px] text-neutral-500">💡 심리 트리거: {t.psychologicalTrigger}</div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <h2 className="text-base font-bold text-neutral-900">🎨 시각 연출 DNA</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {VISUAL_LABELS.map((f) => (
                <div key={f.key} className="rounded-xl border border-neutral-200 bg-neutral-50 p-3.5">
                  <div className="text-[11px] font-bold text-rose-600">{f.icon} {f.label}</div>
                  <div className="mt-1 text-xs leading-relaxed text-neutral-800">{analysis.visualStyle[f.key] || "확인 불가"}</div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <h2 className="text-base font-bold text-neutral-900">💬 시청자 반응 · 결핍 니즈</h2>
            {analysis.commentInsights.length === 0 ? (
              <p className="mt-3 text-xs text-neutral-400">확인된 댓글 인사이트가 없습니다. (댓글이 막혀 있거나 YouTube 키가 없는 경우)</p>
            ) : (
              <div className="mt-3 divide-y divide-neutral-100">
                {analysis.commentInsights.map((c, i) => (
                  <div key={i} className="flex items-start gap-3 py-2.5">
                    <span className="w-16 shrink-0 rounded bg-neutral-100 px-2 py-0.5 text-center text-[10px] font-bold text-neutral-600">{c.category}</span>
                    <span className="text-xs leading-relaxed text-neutral-800">{c.insight}</span>
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
