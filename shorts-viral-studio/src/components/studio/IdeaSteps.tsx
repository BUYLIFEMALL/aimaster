"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ideateAction } from "@/lib/actions/svs";
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

/** 3단계: 소재 6개 발굴 */
export function IdeateStep() {
  const router = useRouter();
  const params = useSearchParams();
  const { hydrated, data, update, model, saveProject, requireKey } = useStudio();
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autoRan = useRef(false);

  const analysis = data.analysis;

  const run = useCallback(async () => {
    if (!analysis) return;
    setError(null);
    setRunning(true);
    const res = await ideateAction(data.search.query, analysis, model);
    setRunning(false);
    if (!res.success || !res.data) {
      if (res.needApiKey) requireKey(res.missingProvider);
      setError(res.error ?? "소재 발굴에 실패했습니다.");
      return;
    }
    update({ ideas: res.data, selectedIdea: null, scenes: [], promptsResult: null });
    await saveProject();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysis, data.search.query, model.provider, model.model]);

  useEffect(() => {
    if (!hydrated || autoRan.current) return;
    if (params.get("run") === "1") {
      autoRan.current = true;
      router.replace("/ideate");
      if (analysis && data.ideas.length === 0) void run();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  if (!hydrated) return null;

  if (!analysis) {
    return (
      <div className="space-y-5">
        <StepHeader step={3} title="소재 발굴" desc="분석한 성공 공식으로 새로운 쇼츠 소재 6개를 제안합니다." />
        <NeedPrevious message="먼저 영상 분석을 진행해야 소재를 발굴할 수 있습니다." href="/analyze" label="← 바이럴 분석으로" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <StepHeader step={3} title="소재 발굴" desc="분석한 성공 공식을 응용해 새로운 쇼츠 소재 6개를 제안합니다." />
      <ModelPicker />

      <div className="flex flex-wrap items-center gap-3">
        <PrimaryButton onClick={run} disabled={running}>
          {running ? "발굴 중…" : data.ideas.length ? "소재 다시 발굴하기" : "소재 6개 발굴하기"}
        </PrimaryButton>
        <SaveStatus />
      </div>

      <ErrorBanner message={error} />
      {running && <LoadingCard title="새 소재 발굴 중…" desc="분석된 Content DNA를 바탕으로 6개의 아이디어를 만들고 있습니다." />}

      {!running && data.ideas.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.ideas.map((idea, i) => (
            <Card key={i} className="flex flex-col justify-between">
              <div>
                <div className="mb-2 flex flex-wrap items-center justify-between gap-1.5">
                  <span className="rounded bg-rose-50 px-2 py-0.5 text-[10px] font-extrabold text-rose-600">IDEA #{i + 1}</span>
                  <span className="text-[10px] text-neutral-500">
                    잠재점수 {idea.potentialScore}점 · 예상 완청 {idea.expectedRetention}
                  </span>
                </div>
                <h3 className="text-[15px] font-bold leading-snug text-neutral-900">{idea.title}</h3>
                <div className="mt-3 rounded-lg border-l-4 border-rose-500 bg-neutral-50 p-3">
                  <div className="text-[10px] font-bold text-rose-600">⚡ 1초 킬러 훅</div>
                  <div className="mt-0.5 text-[13px] font-semibold text-neutral-900">&ldquo;{idea.hook}&rdquo;</div>
                  <div className="mt-1 text-[11px] text-neutral-500">공식: {idea.hookFormula}</div>
                </div>
                <p className="mt-3 text-xs leading-relaxed text-neutral-600">
                  <strong>핵심 전략:</strong> {idea.strategy || idea.whyItWorks}
                </p>
              </div>
              <PrimaryButton
                className="mt-4 w-full"
                onClick={async () => {
                  update({ selectedIdea: idea, scenes: [], promptsResult: null });
                  await saveProject();
                  router.push("/select");
                }}
              >
                이 주제로 기획 확정 →
              </PrimaryButton>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/** 4단계: 주제 확정 + 추가 피드백 */
export function SelectStep() {
  const router = useRouter();
  const { hydrated, data, update, saveProject } = useStudio();
  const idea = data.selectedIdea;

  if (!hydrated) return null;

  if (!idea) {
    return (
      <div className="space-y-5">
        <StepHeader step={4} title="주제 확정" desc="선택한 소재의 전략을 확인하고 추가 요청을 남깁니다." />
        <NeedPrevious message="선택된 소재가 없습니다. 소재 6개 중 하나를 골라 주세요." href="/ideate" label="← 소재 발굴로" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <StepHeader step={4} title="주제 확정" desc="선택한 소재의 전략을 확인하고, 대본에 반영할 추가 요청을 남깁니다." />

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h2 className="text-xl font-bold text-neutral-900">{idea.title}</h2>
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
            잠재력 {idea.potentialScore}점 · 예상 완청 {idea.expectedRetention}
          </span>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border-l-4 border-rose-500 bg-neutral-50 p-3.5">
            <div className="text-[11px] font-bold text-rose-600">🔥 1초 킬러 훅</div>
            <div className="mt-1 text-base font-bold text-neutral-900">&ldquo;{idea.hook}&rdquo;</div>
            <div className="mt-1 text-xs text-neutral-500">적용 공식: {idea.hookFormula}</div>
          </div>
          <div className="rounded-xl bg-neutral-50 p-3.5">
            <div className="text-[11px] font-bold text-rose-600">🎯 전개 · 완청 전략</div>
            <div className="mt-1 text-sm leading-relaxed text-neutral-800">{idea.strategy}</div>
          </div>
          <div className="rounded-xl bg-neutral-50 p-3.5 md:col-span-2">
            <div className="text-[11px] font-bold text-rose-600">🧠 성공 요인 (시청자 심리)</div>
            <div className="mt-1 text-sm leading-relaxed text-neutral-800">{idea.whyItWorks}</div>
          </div>
        </div>

        {idea.storylineRoadmap.length > 0 && (
          <div className="mt-4 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
            <h3 className="text-sm font-bold text-rose-600">구간별 스토리 전개 로드맵</h3>
            <div className="mt-2 space-y-2">
              {idea.storylineRoadmap.map((r, i) => (
                <div key={i} className="rounded-lg border border-neutral-200 bg-white p-3">
                  <span className="rounded bg-rose-50 px-1.5 py-0.5 font-mono text-[10px] font-bold text-rose-600">{r.phase}</span>
                  <div className="mt-1 text-[13px] font-semibold text-neutral-900">{r.action}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-5">
          <h3 className="mb-2 text-sm font-bold text-neutral-900">✍️ 추가 기획 요청 (선택)</h3>
          <textarea
            value={data.topicFeedback}
            onChange={(e) => update({ topicFeedback: e.target.value })}
            maxLength={1000}
            placeholder="예: 2030 직장인이 공감할 톤으로, 첫 문장은 충격적인 질문으로, 40초 분량으로 핵심만"
            className="h-24 w-full rounded-xl border border-neutral-200 p-3 text-sm focus:border-rose-500 focus:outline-none"
          />
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
          <Link href="/ideate" className="text-sm text-neutral-500 underline">← 다른 소재 고르기</Link>
          <PrimaryButton
            onClick={async () => {
              await saveProject();
              router.push("/script");
            }}
            className="px-7 py-3"
          >
            이 전략으로 대본 만들기 ➔
          </PrimaryButton>
        </div>
      </Card>
    </div>
  );
}
