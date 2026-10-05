"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { generatePromptsAction } from "@/lib/actions/svs";
import { savePromptSetAction } from "@/lib/actions/savedPrompts";
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
  CopyBox,
} from "@/components/studio/ui";

export function PromptsStep() {
  const router = useRouter();
  const params = useSearchParams();
  const { hydrated, data, update, model, saveProject, requireKey } = useStudio();
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autoRan = useRef(false);
  const [vault, setVault] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [vaultError, setVaultError] = useState<string | null>(null);

  // 프롬프트를 새로 만들면 다시 저장할 수 있게 상태를 초기화
  useEffect(() => {
    setVault("idle");
    setVaultError(null);
  }, [data.promptsResult]);

  async function saveToVault() {
    const result = data.promptsResult;
    if (!result || !data.selectedIdea) return;
    setVault("saving");
    setVaultError(null);
    const res = await savePromptSetAction({
      title: data.selectedIdea.title,
      ideaTitle: data.selectedIdea.title,
      hook: data.selectedIdea.hook,
      keyword: data.search.query,
      bgmPrompt: result.bgmPrompt,
      prompts: result.prompts,
    });
    if (res.success) {
      setVault("saved");
    } else {
      setVault("error");
      setVaultError(res.error ?? "보관함에 저장하지 못했습니다.");
    }
  }

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
        {result && (
          <GhostButton
            onClick={saveToVault}
            disabled={vault === "saving" || vault === "saved"}
            className="border-rose-300 text-rose-600"
          >
            {vault === "saving" ? "저장 중…" : vault === "saved" ? "✓ 보관함에 저장됨" : "💾 보관함에 저장"}
          </GhostButton>
        )}
        <GhostButton onClick={() => downloadMarkdown(data)}>📥 전체 프로젝트 .md 저장</GhostButton>
        <SaveStatus />
        {vault === "saved" && (
          <Link href="/vault" className="text-xs font-semibold text-rose-600 underline">
            📚 보관함 보기
          </Link>
        )}
      </div>
      {vault === "error" && <ErrorBanner message={vaultError} />}

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
