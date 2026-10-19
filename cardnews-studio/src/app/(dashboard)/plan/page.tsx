"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, Sparkles } from "lucide-react";
import { CATEGORIES, CUSTOM_CATEGORY, PAGE_COUNTS, RATIOS, TONES, type ToneId } from "@/lib/cardnews/presets";
import { useStudio } from "@/components/studio/ProjectProvider";
import { RemakePanel } from "@/components/studio/RemakePanel";
import { BTN_PRIMARY, Card, EnginePicker, ErrorNote, Field, INPUT, SELECT, StepHeader } from "@/components/studio/ui";

export default function PlanPage() {
  const { project, update, keys } = useStudio();
  const { plan } = project;
  const isCustom = !CATEGORIES.some((c) => c.value === plan.category);
  const [topics, setTopics] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ message: string; needKey?: boolean } | null>(null);

  const patchPlan = (patch: Partial<typeof plan>) => update((d) => ({ ...d, plan: { ...d.plan, ...patch } }));

  const suggest = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/cardnews/topics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: plan.category, engine: project.engine }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError({ message: data.error || "주제를 추천받지 못했습니다.", needKey: data.needApiKey });
        return;
      }
      setTopics(data.topics);
    } catch {
      setError({ message: "네트워크 오류로 추천받지 못했습니다. 잠시 뒤 다시 시도해주세요." });
    } finally {
      setLoading(false);
    }
  };

  const engineReady = keys ? keys[project.engine.provider] : true;
  const remakeMode = project.startMode === "remake";

  return (
    <div className="space-y-6">
      <StepHeader
        step={1}
        title="기획"
        desc="인스타그램 타겟 분야와 핵심 주제, 문구 어조, 피드 규격 비율(4:5 세로형 / 1:1 정방형)을 정합니다."
      />

      <div className="grid grid-cols-2 gap-2 rounded-2xl border border-[#262c3d] bg-[#161922] p-1.5" role="group" aria-label="시작 방식">
        {([
          ["topic", "✍️ 주제로 시작", "분야와 주제만 정하면 AI가 문구를 씁니다"],
          ["remake", "🔥 떡상 리메이크", "반응 좋았던 레퍼런스를 분석해 더 나은 카드로"],
        ] as const).map(([v, label, hint]) => (
          <button
            key={v}
            type="button"
            aria-pressed={(remakeMode ? "remake" : "topic") === v}
            onClick={() => update((d) => ({ ...d, startMode: v }))}
            className={`rounded-xl px-3 py-2.5 text-left transition-colors ${(remakeMode ? "remake" : "topic") === v ? "bg-gradient-to-r from-pink-500/25 via-purple-500/25 to-amber-500/25 ring-1 ring-purple-400" : "hover:bg-[#1e2230]"}`}
          >
            <span className="block text-sm font-bold text-slate-100">{label}</span>
            <span className="block text-[11px] text-slate-400">{hint}</span>
          </button>
        ))}
      </div>

      <Card className="space-y-4">
        <Field label="프로젝트 이름">
          <input className={INPUT} value={project.title} maxLength={80} onChange={(e) => update((d) => ({ ...d, title: e.target.value }))} />
        </Field>

        <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
          <Field label="분야(카테고리)">
            <select
              className={SELECT}
              value={isCustom ? CUSTOM_CATEGORY : plan.category}
              onChange={(e) => patchPlan({ category: e.target.value === CUSTOM_CATEGORY ? "" : e.target.value })}
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
              <option value={CUSTOM_CATEGORY}>직접 입력…</option>
            </select>
          </Field>
          <div className="flex items-end">
            <button type="button" onClick={() => void suggest()} disabled={loading || !plan.category.trim() || !engineReady} className={`${BTN_PRIMARY} w-full sm:w-auto`} title="선택한 분야로 핵심 주제 5개를 추천받습니다">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} 주제 추천
            </button>
          </div>
        </div>
        {isCustom && (
          <Field label="직접 입력한 분야">
            <input className={INPUT} value={plan.category} maxLength={40} placeholder="예: 육아, 여행, 반려동물" onChange={(e) => patchPlan({ category: e.target.value })} />
          </Field>
        )}

        {error && <ErrorNote message={error.message} needKey={error.needKey} />}
        {topics.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {topics.map((t) => (
              <button key={t} type="button" onClick={() => patchPlan({ topic: t })} className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-medium text-violet-800 hover:bg-violet-100">
                {t}
              </button>
            ))}
          </div>
        )}

        {remakeMode && <RemakePanel />}

        <Field label="핵심 주제" hint={remakeMode ? "떡상 분석에서 관점을 고르면 자동으로 채워집니다. 직접 고쳐도 됩니다." : "카드 전체를 관통하는 한 줄 주제입니다. 위 추천 주제를 누르면 채워집니다."}>
          <textarea className={`${INPUT} min-h-20`} value={plan.topic} maxLength={200} placeholder="예: 매일 1시간 독서의 기적" onChange={(e) => patchPlan({ topic: e.target.value })} />
        </Field>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="문구 어조(Tone)">
            <select className={SELECT} value={plan.tone} onChange={(e) => patchPlan({ tone: e.target.value as ToneId })}>
              {TONES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="페이지 수">
            <div className="flex rounded-xl border border-gray-200 bg-white p-1">
              {PAGE_COUNTS.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => patchPlan({ pageCount: n })}
                  className={`flex-1 rounded-lg py-1.5 text-sm font-bold ${plan.pageCount === n ? "bg-violet-600 text-white" : "text-gray-600 hover:bg-gray-50"}`}
                >
                  {n}
                </button>
              ))}
            </div>
          </Field>
          <Field label="비율">
            <select className={SELECT} value={plan.ratio} onChange={(e) => patchPlan({ ratio: e.target.value as typeof plan.ratio })}>
              {RATIOS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
        {plan.tone === "pride" && <p className="text-[11px] text-gray-500">국뽕 어조는 열정적으로 쓰되, 사실이 아닌 수치·주장과 다른 나라를 깎아내리는 표현은 쓰지 않도록 AI에게 지시합니다.</p>}
      </Card>

      <Card>
        <h2 className="mb-3 text-sm font-bold text-gray-900">문구를 쓸 AI</h2>
        <EnginePicker />
      </Card>

      <div className="flex justify-end">
        <Link href="/copy" aria-disabled={!plan.topic.trim()} className={`${BTN_PRIMARY} ${!plan.topic.trim() ? "pointer-events-none opacity-50" : ""}`}>
          다음: 문구 기획 →
        </Link>
      </div>
    </div>
  );
}
