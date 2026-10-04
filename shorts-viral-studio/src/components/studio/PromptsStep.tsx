"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { generatePromptsAction } from "@/lib/actions/svs";
import { downloadMarkdown } from "@/lib/export";
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
  GhostButton,
} from "@/components/studio/ui";

function CopyBox({ label, text, tone }: { label: string; text: string; tone: "dark" | "green" | "rose" }) {
  const [copied, setCopied] = useState(false);
  const badge =
    tone === "dark" ? "bg-neutral-900 text-white" : tone === "green" ? "bg-emerald-600 text-white" : "bg-rose-600 text-white";
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className={`rounded px-2 py-0.5 text-[11px] font-extrabold ${badge}`}>{label}</span>
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(text);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            } catch {
              // 클립보드 권한이 없으면 직접 선택해서 복사하도록 둡니다.
            }
          }}
          className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
            copied ? "border-emerald-500 text-emerald-600" : "border-neutral-200 text-neutral-600 hover:bg-neutral-100"
          }`}
        >
          {copied ? "복사됨!" : "복사"}
        </button>
      </div>
      <div className="whitespace-pre-wrap break-words rounded-lg border border-neutral-200 bg-white p-3 font-mono text-xs leading-relaxed text-neutral-800">
        {text}
      </div>
    </div>
  );
}

export function PromptsStep() {
  const router = useRouter();
  const params = useSearchParams();
  const { hydrated, data, update, model, saveProject, requireKey } = useStudio();
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autoRan = useRef(false);

  const run = useCallback(async () => {
    if (!data.selectedIdea || data.scenes.length === 0) return;
    setError(null);
    setRunning(true);
    const res = await generatePromptsAction({
      idea: data.selectedIdea,
      scenes: data.scenes,
      visualStyle: data.analysis?.visualStyle ?? null,
      modelConfig: model,
    });
    setRunning(false);
    if (!res.success || !res.data) {
      if (res.needApiKey) requireKey(res.missingProvider);
      setError(res.error ?? "프롬프트 생성에 실패했습니다.");
      return;
    }
    update({ promptsResult: res.data });
    await saveProject();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.selectedIdea, data.scenes, data.analysis, model.provider, model.model]);

  useEffect(() => {
    if (!hydrated || autoRan.current) return;
    if (params.get("run") === "1") {
      autoRan.current = true;
      router.replace("/prompts");
      if (!data.promptsResult && data.scenes.length > 0) void run();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  if (!hydrated) return null;

  if (data.scenes.length === 0) {
    return (
      <div className="space-y-5">
        <StepHeader step={6} title="이미지·영상 프롬프트" desc="씬별 이미지·영상 생성 프롬프트와 BGM 프롬프트를 만듭니다." />
        <NeedPrevious message="대본이 아직 없습니다. 먼저 대본을 생성해 주세요." href="/script" label="← 대본 생성으로" />
      </div>
    );
  }

  const result = data.promptsResult;

  return (
    <div className="space-y-5">
      <StepHeader step={6} title="이미지·영상 프롬프트" desc="씬별 이미지·영상 생성 프롬프트와 전체 BGM 프롬프트를 만듭니다." />
      <ModelPicker />

      <div className="flex flex-wrap items-center gap-3">
        <PrimaryButton onClick={run} disabled={running}>
          {running ? "생성 중…" : result ? "프롬프트 다시 만들기" : "프롬프트 생성"}
        </PrimaryButton>
        <GhostButton onClick={() => downloadMarkdown(data)}>📥 전체 프로젝트 .md 저장</GhostButton>
        <SaveStatus />
      </div>

      <ErrorBanner message={error} />
      {running && <LoadingCard title="프롬프트 생성 중…" desc="씬별 이미지·영상 프롬프트와 BGM 프롬프트를 작성하고 있습니다." />}

      {!running && result && (
        <>
          {result.bgmPrompt && (
            <Card className="border-rose-200">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-base font-bold text-neutral-900">🎵 {result.bgmPrompt.title}</h2>
                  <p className="mt-0.5 text-xs text-neutral-500">
                    {result.bgmPrompt.genreAndMood} · {result.bgmPrompt.bpm}
                  </p>
                </div>
                <span className="rounded bg-rose-50 px-2 py-0.5 font-mono text-[10px] font-bold text-rose-600">MASTER BGM</span>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg bg-neutral-50 p-3 text-xs text-neutral-800"><b className="text-rose-600">🥁 악기</b><br />{result.bgmPrompt.instrumentation}</div>
                <div className="rounded-lg bg-neutral-50 p-3 text-xs text-neutral-800"><b className="text-amber-600">📈 전개</b><br />{result.bgmPrompt.dynamicStructure}</div>
              </div>
              <div className="mt-3">
                <CopyBox label="SUNO / UDIO PROMPT" text={result.bgmPrompt.sunoPrompt} tone="dark" />
              </div>
              {result.bgmPrompt.audioMixingNotes && (
                <p className="mt-3 rounded-lg border-l-4 border-rose-500 bg-neutral-50 p-2.5 text-[11px] text-neutral-600">💡 믹싱 팁: {result.bgmPrompt.audioMixingNotes}</p>
              )}
            </Card>
          )}

          <div className="space-y-3">
            {result.prompts.map((p) => (
              <Card key={p.sceneNumber}>
                <div className="mb-3 flex items-center justify-between gap-2">
                  <span className="rounded bg-rose-50 px-2 py-0.5 font-mono text-xs font-extrabold text-rose-600">SCENE {p.sceneNumber}</span>
                  <span className="text-xs text-neutral-500">{p.sceneSummary}</span>
                </div>
                <div className="space-y-3">
                  <CopyBox label="🖼️ IMAGE PROMPT (9:16)" text={p.imagePrompt} tone="dark" />
                  <CopyBox label="🎥 VIDEO MOTION PROMPT" text={p.videoPrompt} tone="green" />
                </div>
              </Card>
            ))}
          </div>
          <p className="pb-6 text-[11px] text-neutral-400">
            이미지·영상 생성은 Midjourney, Kling, Runway 등 외부 서비스에서 각자 계정으로 진행합니다. 인물은 별도 지시가 없으면 한국인 외모로 작성됩니다.
          </p>
        </>
      )}
    </div>
  );
}
