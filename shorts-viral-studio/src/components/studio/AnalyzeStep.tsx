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
          <h2 className="text-sm font-bold text-[#f0f6fc]">분석 대상 ({selected.length}개)</h2>
          <SaveStatus />
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {selected.map((v) => (
            <div key={v.id} className="flex items-center gap-3 rounded-xl border border-[#30363d] bg-[#0d1117] p-2.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={v.thumbnail} alt="" className="h-10 w-16 shrink-0 rounded-md object-cover border border-[#30363d]" />
              <div className="min-w-0 text-xs">
                <div className="truncate font-semibold text-[#f0f6fc]" title={v.title}>{v.title}</div>
                <div className="mt-0.5 text-[#8b949e]">{v.channelName} · 조회수 {formatNumber(v.views)} · {v.grade}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <PrimaryButton onClick={run} disabled={running}>
            {running ? "분석 중…" : upToDate ? "다시 분석하기" : "분석 시작"}
          </PrimaryButton>
          <Link href="/search" className="text-xs text-[#8b949e] underline hover:text-[#f0f6fc]">영상 다시 선택</Link>
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
          <Card className={analysis.evidence === "video" ? "border-emerald-500/40 bg-emerald-950/20" : "border-amber-500/40 bg-amber-950/20"}>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${analysis.evidence === "video" ? "bg-emerald-600 text-white" : "bg-amber-600 text-white"}`}>
                {analysis.evidence === "video" ? "영상 직접 분석" : "지표·댓글 기반 추정"}
              </span>
              <span className="text-xs text-[#8b949e]">분석 엔진: {analysis.modelLabel}</span>
            </div>
            {analysis.note && <p className="mt-2 text-xs leading-relaxed text-[#c9d1d9]">{analysis.note}</p>}
            {analysis.evidence === "metadata" && (
              <p className="mt-2 text-xs leading-relaxed text-amber-300">
                화면·소리에 관한 항목은 추정이며 실제 영상과 다를 수 있습니다. 정확한 연출 분석은 Gemini 엔진으로 다시 분석해 주세요.
              </p>
            )}
          </Card>

          {/* v1.13 Gemini가 영상을 직접 본 경우 받아쓴 대사 → AI 쇼츠 원스톱 레퍼런스(대사는 주소 # 뒤라 서버로 가지 않음) */}
          {analysis.transcript && (
            <Card>
              <details>
                <summary className="cursor-pointer text-base font-bold text-[#f0f6fc]">🎙 영상 대사(받아쓰기)</summary>
                <p className="mt-3 whitespace-pre-wrap rounded-lg border border-[#30363d] bg-[#0d1117] p-3 text-xs leading-relaxed text-[#c9d1d9]">{analysis.transcript}</p>
              </details>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[#8b949e]">
                <a
                  href={`${ONESTOP_TOPIC_URL}${refHandoffHash(analysis.transcript)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="whitespace-nowrap rounded-lg border border-[#30363d] bg-[#0d1117] px-3 py-1.5 font-bold text-[#f0f6fc] hover:border-rose-400/60"
                >
                  🎬 이 대사로 쇼츠 만들기
                </a>
                <span>AI 쇼츠 원스톱이 새 탭으로 열리고, 대사가 레퍼런스로 들어갑니다(흐름만 참고하고 문장은 새로 씁니다).</span>
              </div>
            </Card>
          )}

          <Card>
            <h2 className="text-base font-bold text-[#f0f6fc]">🎯 11대 바이럴 메커니즘</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {analysis.viralMechanisms.map((m) => (
                <div key={m.title} className="rounded-xl border border-[#30363d] bg-[#0d1117] p-3.5">
                  <div className="flex items-center gap-2 text-sm font-bold text-[#f0f6fc]">
                    <span>{m.icon}</span>
                    {m.title}
                  </div>
                  <div className="mt-1.5 text-xs font-semibold text-rose-400">{m.tactic}</div>
                  <div className="mt-1.5 rounded-lg border border-[#30363d] bg-[#161b22] p-2 text-[11px] leading-relaxed text-[#c9d1d9]">{m.analysis}</div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <h2 className="text-base font-bold text-[#f0f6fc]">⏱️ 구간별 타임라인 전략</h2>
            <div className="mt-4 space-y-2.5">
              {analysis.timelineStrategies.map((t) => (
                <div key={t.range} className="rounded-xl border border-[#30363d] border-l-4 border-l-rose-500 bg-[#0d1117] p-3.5">
                  <div className="font-mono text-[11px] font-bold text-rose-400">{t.range}</div>
                  <div className="mt-1 text-sm font-medium text-[#f0f6fc]">{t.tactic}</div>
                  <div className="mt-1 text-[11px] text-[#8b949e]">💡 심리 트리거: {t.psychologicalTrigger}</div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <h2 className="text-base font-bold text-[#f0f6fc]">🎨 시각 연출 DNA</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {VISUAL_LABELS.map((f) => (
                <div key={f.key} className="rounded-xl border border-[#30363d] bg-[#0d1117] p-3.5">
                  <div className="text-[11px] font-bold text-rose-400">{f.icon} {f.label}</div>
                  <div className="mt-1 text-xs leading-relaxed text-[#c9d1d9]">{analysis.visualStyle[f.key] || "확인 불가"}</div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <h2 className="text-base font-bold text-[#f0f6fc]">💬 시청자 반응 · 결핍 니즈</h2>
            {analysis.commentInsights.length === 0 ? (
              <p className="mt-3 text-xs text-[#8b949e]">확인된 댓글 인사이트가 없습니다. (댓글이 막혀 있거나 YouTube 키가 없는 경우)</p>
            ) : (
              <div className="mt-3 divide-y divide-[#30363d]">
                {analysis.commentInsights.map((c, i) => (
                  <div key={i} className="flex items-start gap-3 py-2.5">
                    <span className="w-16 shrink-0 rounded border border-[#30363d] bg-[#0d1117] px-2 py-0.5 text-center text-[10px] font-bold text-[#8b949e]">{c.category}</span>
                    <span className="text-xs leading-relaxed text-[#c9d1d9]">{c.insight}</span>
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
