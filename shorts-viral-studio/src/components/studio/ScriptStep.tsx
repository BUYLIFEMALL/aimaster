"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { generateScriptAction } from "@/lib/actions/svs";
import { downloadMarkdown } from "@/lib/export";
import { refHandoffHash } from "@/lib/reference";
import type { Scene } from "@/types/svs";

const THUMBNAIL_SEO_URL = "https://thumbnail-master.buylife.xyz/seo";
const ONESTOP_TOPIC_URL = "https://shorts-onestop-studio.buylife.xyz/topic";

/** 넘길 대본 글 — 주제 + 씬마다 자막·나레이션 */
const scriptPlain = (topic: string, scenes: Scene[]) =>
  [topic ? `주제: ${topic}` : "", ...scenes.map((s) => [s.caption, s.narration].map((t) => t?.trim()).filter(Boolean).join("\n"))]
    .filter(Boolean)
    .join("\n\n");

import { useStudio } from "@/components/studio/StudioProvider";
import {
  Card,
  ErrorBanner,
  GhostButton,
  LoadingCard,
  PrimaryButton,
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
  "rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-red-500 focus:ring-1 focus:ring-red-500 focus:outline-none";

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
        <Card className="text-center py-8">
          <p className="text-sm text-slate-500">확정된 주제가 없습니다. 소재를 선택하고 주제를 확정해 주세요.</p>
          <div className="mt-4">
            <Link href="/ideate" className="btn-3d-yt-red px-4 py-2 text-xs font-bold text-white">
              ← 소재 발굴로 돌아가기
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <StepHeader step={5} title="대본 생성" desc="씬마다 한 문장 나레이션 원칙으로, 연출·자막·효과음까지 한 번에 만듭니다." />

      <Card>
        <div className="mb-3 text-sm font-black text-slate-900 border-b border-slate-100 pb-2">
          대본 옵션 설정 · <span className="text-red-600">{idea.title}</span>
        </div>
        <div className="flex flex-wrap items-end gap-4">
          <label className="text-xs font-semibold text-slate-600">
            목표 길이(초)
            <input
              type="number"
              min={10}
              max={180}
              step={5}
              value={cfg.durationSec}
              onChange={(e) => update({ scriptConfig: { ...cfg, durationSec: Number(e.target.value) } })}
              className={`${inputCls} mt-1 block w-24 text-center font-bold`}
            />
          </label>
          <label className="min-w-[220px] text-xs font-semibold text-slate-600">
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
            <label className="min-w-[200px] flex-1 text-xs font-semibold text-red-600">
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
          <label className="min-w-[200px] flex-1 text-xs font-semibold text-slate-600">
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

      {error && <ErrorBanner message={error} />}
      {running && <LoadingCard title="대본 작성 중…" desc="씬별 한 문장 나레이션과 연출·자막·효과음을 만들고 있습니다." />}

      {!running && data.scenes.length > 0 && (
        <Card>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <h2 className="text-base font-black text-slate-900">🎬 생성된 씬별 대본 ({data.scenes.length}씬)</h2>
            <div className="flex flex-wrap items-center gap-2">
              <GhostButton onClick={() => downloadMarkdown(data)} className="py-2 text-xs">📥 .md 저장</GhostButton>
              <a
                href={`${ONESTOP_TOPIC_URL}${refHandoffHash(scriptPlain(data.selectedIdea?.title || data.search.query, data.scenes), "쇼츠 떡상 분석·대본 자동화")}`}
                target="_blank"
                rel="noopener noreferrer"
                title="AI 쇼츠 원스톱 제작으로 이 대본을 즉시 넘깁니다"
                className="btn-3d-yt-red px-3.5 py-2 text-xs font-bold text-white shadow-sm"
              >
                🎬 쇼츠 영상 제작하기 ➔
              </a>
              <a
                href={`${THUMBNAIL_SEO_URL}${refHandoffHash(scriptPlain(data.selectedIdea?.title || data.search.query, data.scenes), "쇼츠 떡상 분석·대본 자동화")}`}
                target="_blank"
                rel="noopener noreferrer"
                title="AI 썸네일·SEO 자동화가 새 탭으로 열립니다"
                className="btn-3d-slate px-3.5 py-2 text-xs font-bold text-slate-700"
              >
                📤 썸네일 만들기
              </a>
            </div>
          </div>
          <p className="mb-4 text-xs font-medium text-slate-500">문구를 직접 눌러 수정할 수 있습니다. 수정한 내용은 프로젝트 저장 시 함께 보존됩니다.</p>

          <div className="space-y-3.5">
            {data.scenes.map((s, i) => (
              <div key={i} className="rounded-xl border border-slate-200 bg-slate-50 p-4 shadow-2xs">
                <div className="mb-2 flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="rounded-md border border-red-200 bg-red-50 px-2 py-0.5 font-mono text-xs font-black text-red-600">SCENE {s.sceneNumber}</span>
                  <span className="font-mono text-xs font-bold text-slate-500">⏱️ {s.time}</span>
                </div>
                <div className="grid gap-3 md:grid-cols-[1.2fr_1fr]">
                  <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
                    <div className="text-[11px] font-black text-red-600">🎙️ 나레이션 (한 문장 원칙)</div>
                    <textarea
                      value={s.narration}
                      onChange={(e) => editScene(i, "narration", e.target.value)}
                      rows={2}
                      className="mt-1.5 w-full resize-none rounded-md border border-transparent bg-transparent text-sm font-bold leading-relaxed text-slate-900 hover:border-slate-300 focus:border-red-500 focus:outline-none"
                    />
                    <div className="mt-2 text-[11px] font-bold text-slate-500 border-t border-slate-100 pt-1.5">
                      📝 자막:
                      <input
                        value={s.caption}
                        onChange={(e) => editScene(i, "caption", e.target.value)}
                        className="ml-1 w-[75%] rounded border border-transparent bg-transparent font-semibold text-slate-800 hover:border-slate-300 focus:border-red-500 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
                    <div className="text-[11px] font-black text-amber-600">🎬 연출 · 카메라 앵글</div>
                    <textarea
                      value={s.visual}
                      onChange={(e) => editScene(i, "visual", e.target.value)}
                      rows={3}
                      className="mt-1.5 w-full resize-none rounded-md border border-transparent bg-transparent text-xs leading-relaxed text-slate-700 hover:border-slate-300 focus:border-red-500 focus:outline-none"
                    />
                    <div className="mt-1 text-[11px] font-bold text-red-600">
                      🎵 {s.sfx || "효과음 없음"}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 border-t border-slate-200 pt-5">
            <h3 className="text-sm font-black text-slate-900">🔄 수정 피드백 후 대본 다시 쓰기</h3>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <textarea
                value={revision}
                onChange={(e) => setRevision(e.target.value)}
                maxLength={1000}
                placeholder="예: 2번 씬을 더 긴박하게, 마지막에 댓글 참여 유도 멘트 추가"
                className="h-16 flex-1 rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-800 placeholder-slate-400 focus:border-red-500 focus:outline-none"
              />
              <GhostButton onClick={() => generate(revision.trim())} disabled={running || !revision.trim()} className="border-red-200 text-red-600 hover:bg-red-50">
                🔄 대본 재생성
              </GhostButton>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4">
            <Link href="/select" className="text-sm font-bold text-slate-500 underline hover:text-slate-800">← 주제 확정으로</Link>
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
