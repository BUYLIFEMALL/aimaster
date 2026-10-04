"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { generateScriptAction } from "@/lib/actions/svs";
import { downloadMarkdown } from "@/lib/export";
import { useStudio } from "@/components/studio/StudioProvider";
import {
  Card,
  ErrorBanner,
  GhostButton,
  LoadingCard,
  ModelPicker,
  NeedPrevious,
  PrimaryButton,
  SaveStatus,
  StepHeader,
} from "@/components/studio/ui";

const TONES = [
  "몰입감 있고 긴박한 (Urgent & Suspenseful)",
  "도발적이고 충격적인 (Provocative & Shocking)",
  "친근하고 재치있는 (Friendly & Witty)",
  "전문적이고 신뢰감 있는 (Authoritative & Deep)",
  "감성적이고 서정적인 (Emotional & Storytelling)",
  "빠르고 에너지 넘치는 (High-energy & Hype)",
  "냉소적이고 현실적인 (Cynical & Raw)",
];

const inputCls =
  "rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-800 focus:border-rose-500 focus:outline-none";

export function ScriptStep() {
  const router = useRouter();
  const { hydrated, data, update, model, saveProject, requireKey } = useStudio();
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState("");
  const idea = data.selectedIdea;
  const cfg = data.scriptConfig;
  const isCustomTone = !TONES.includes(cfg.tone);

  async function generate(revisionFeedback?: string) {
    if (!idea) return;
    setError(null);
    setRunning(true);
    const res = await generateScriptAction({
      idea,
      topicFeedback: data.topicFeedback,
      visualStyle: data.analysis?.visualStyle ?? null,
      scriptConfig: cfg,
      revisionFeedback,
      previousScenes: revisionFeedback ? data.scenes : undefined,
      modelConfig: model,
    });
    setRunning(false);
    if (!res.success || !res.data) {
      if (res.needApiKey) requireKey(res.missingProvider);
      setError(res.error ?? "대본 생성에 실패했습니다.");
      return;
    }
    update({ scenes: res.data, promptsResult: null });
    if (revisionFeedback) setRevision("");
    await saveProject();
  }

  function editScene(index: number, field: "narration" | "caption" | "visual" | "sfx", value: string) {
    update((d) => ({ scenes: d.scenes.map((s, i) => (i === index ? { ...s, [field]: value } : s)) }));
  }

  if (!hydrated) return null;

  if (!idea) {
    return (
      <div className="space-y-5">
        <StepHeader step={5} title="대본 생성" desc="타임코드별 나레이션·연출·자막·효과음을 만듭니다." />
        <NeedPrevious message="확정된 주제가 없습니다. 소재를 선택하고 주제를 확정해 주세요." href="/ideate" label="← 소재 발굴로" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <StepHeader step={5} title="대본 생성" desc="씬마다 한 문장 나레이션 원칙으로, 연출·자막·효과음까지 한 번에 만듭니다." />
      <ModelPicker />

      <Card>
        <div className="mb-3 text-sm font-bold text-neutral-900">대본 옵션 · {idea.title}</div>
        <div className="flex flex-wrap items-end gap-4">
          <label className="text-xs font-semibold text-neutral-500">
            목표 길이(초)
            <input
              type="number"
              min={10}
              max={180}
              step={5}
              value={cfg.durationSec}
              onChange={(e) => update({ scriptConfig: { ...cfg, durationSec: Number(e.target.value) } })}
              className={`${inputCls} mt-1 block w-24 text-center font-semibold`}
            />
          </label>
          <label className="min-w-[220px] text-xs font-semibold text-neutral-500">
            나레이션 톤
            <select
              value={isCustomTone ? "custom" : cfg.tone}
              onChange={(e) =>
                update({ scriptConfig: { ...cfg, tone: e.target.value === "custom" ? "" : e.target.value } })
              }
              className={`${inputCls} mt-1 block w-full`}
            >
              {TONES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
              <option value="custom">✏️ 직접 입력</option>
            </select>
          </label>
          {isCustomTone && (
            <label className="min-w-[200px] flex-1 text-xs font-semibold text-rose-600">
              사용자 지정 톤
              <input
                value={cfg.tone}
                maxLength={100}
                onChange={(e) => update({ scriptConfig: { ...cfg, tone: e.target.value } })}
                placeholder="예: 시니컬한 뉴스 앵커 톤"
                className={`${inputCls} mt-1 block w-full`}
              />
            </label>
          )}
          <label className="min-w-[200px] flex-1 text-xs font-semibold text-neutral-500">
            타겟 시청자
            <input
              value={cfg.target}
              maxLength={100}
              onChange={(e) => update({ scriptConfig: { ...cfg, target: e.target.value } })}
              placeholder="예: 2030 직장인, 자취생"
              className={`${inputCls} mt-1 block w-full`}
            />
          </label>
          <PrimaryButton onClick={() => generate()} disabled={running || !cfg.tone.trim()}>
            {running ? "작성 중…" : data.scenes.length ? "대본 새로 만들기" : "대본 생성"}
          </PrimaryButton>
        </div>
      </Card>

      <ErrorBanner message={error} />
      {running && <LoadingCard title="대본 작성 중…" desc="씬별 한 문장 나레이션과 연출·자막·효과음을 만들고 있습니다." />}

      {!running && data.scenes.length > 0 && (
        <Card>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-bold text-neutral-900">🎬 생성된 대본 ({data.scenes.length}씬)</h2>
            <div className="flex items-center gap-3">
              <SaveStatus />
              <GhostButton onClick={() => downloadMarkdown(data)} className="py-2 text-xs">📥 .md 저장</GhostButton>
            </div>
          </div>
          <p className="mb-3 text-[11px] text-neutral-400">문구를 직접 눌러 고칠 수 있습니다. 고친 내용은 프로젝트 저장 시 함께 저장됩니다.</p>

          <div className="space-y-3">
            {data.scenes.map((s, i) => (
              <div key={i} className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                <div className="mb-2 flex items-center justify-between border-b border-neutral-200 pb-2">
                  <span className="rounded bg-rose-50 px-2 py-0.5 font-mono text-xs font-extrabold text-rose-600">SCENE {s.sceneNumber}</span>
                  <span className="font-mono text-xs text-neutral-500">⏱️ {s.time}</span>
                </div>
                <div className="grid gap-3 md:grid-cols-[1.2fr_1fr]">
                  <div className="rounded-lg border border-neutral-200 bg-white p-3">
                    <div className="text-[10px] font-extrabold text-rose-600">🎙️ 나레이션 (한 문장)</div>
                    <textarea
                      value={s.narration}
                      onChange={(e) => editScene(i, "narration", e.target.value)}
                      rows={2}
                      className="mt-1 w-full resize-none rounded-md border border-transparent bg-transparent text-sm font-bold leading-relaxed text-neutral-900 hover:border-neutral-200 focus:border-rose-400 focus:outline-none"
                    />
                    <div className="mt-1 text-[11px] text-neutral-500">
                      📝 자막:
                      <input
                        value={s.caption}
                        onChange={(e) => editScene(i, "caption", e.target.value)}
                        className="ml-1 w-[70%] rounded border border-transparent bg-transparent font-semibold text-neutral-800 hover:border-neutral-200 focus:border-rose-400 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="rounded-lg border border-neutral-200 bg-white p-3">
                    <div className="text-[10px] font-extrabold text-amber-600">🎬 화면 · 카메라</div>
                    <textarea
                      value={s.visual}
                      onChange={(e) => editScene(i, "visual", e.target.value)}
                      rows={3}
                      className="mt-1 w-full resize-none rounded-md border border-transparent bg-transparent text-xs leading-relaxed text-neutral-800 hover:border-neutral-200 focus:border-rose-400 focus:outline-none"
                    />
                    <div className="mt-1 text-[11px] font-semibold text-rose-600">
                      🎵 {s.sfx || "효과음 없음"}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 border-t border-neutral-200 pt-5">
            <h3 className="text-sm font-bold text-neutral-900">🔄 수정 요청 후 다시 쓰기</h3>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <textarea
                value={revision}
                onChange={(e) => setRevision(e.target.value)}
                maxLength={1000}
                placeholder="예: 2번 씬을 더 긴박하게, 마지막에 댓글 참여 유도 멘트 추가"
                className="h-16 flex-1 rounded-xl border border-neutral-200 p-3 text-sm focus:border-rose-500 focus:outline-none"
              />
              <GhostButton onClick={() => generate(revision.trim())} disabled={running || !revision.trim()} className="border-rose-300 text-rose-600">
                🔄 대본 재생성
              </GhostButton>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
            <Link href="/select" className="text-sm text-neutral-500 underline">← 주제 확정으로</Link>
            <PrimaryButton
              onClick={async () => {
                await saveProject();
                router.push("/prompts?run=1");
              }}
              className="px-7 py-3"
            >
              이미지·영상 프롬프트 만들기 ➔
            </PrimaryButton>
          </div>
        </Card>
      )}
    </div>
  );
}
