"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, Wand2 } from "lucide-react";
import { newPageId } from "@/lib/cardnews/defaults";
import { DEFAULT_ICON_BY_CATEGORY, ICON_OPTIONS } from "@/lib/cardnews/presets";
import { useStudio } from "@/components/cardnews/studio/ProjectProvider";
import { VIRAL_ANGLES } from "@/lib/cardnews/ai/remakePrompts";
import { LayoutEditor } from "@/components/cardnews/studio/LayoutEditor";
import type { CardPage } from "@/lib/cardnews/types";
import { copiedPhrases } from "@/lib/cardnews/referenceCopy";
import { pageTexts, remakeGuardText } from "@/lib/cardnews/collect";
import { BTN_GHOST, BTN_PRIMARY, Card, EnginePicker, ErrorNote, INPUT, NeedPlan, StepHeader } from "@/components/cardnews/studio/ui";

export default function CopyPage() {
  const { project, update, keys } = useStudio();
  const { plan, pages } = project;
  const [loading, setLoading] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<{ message: string; needKey?: boolean } | null>(null);
  // v1.57 리메이크 원문과 그대로 겹치는 구절이 남았을 때 안내
  const [copyNote, setCopyNote] = useState<string[]>([]);
  // v1.60 「⚠ 겹침」을 눌러 겹친 구절을 펼친 장(휴대폰에서도 보이게)
  const [openCopy, setOpenCopy] = useState<string[]>([]);

  if (!plan.topic.trim()) return <NeedPlan>먼저 1단계에서 분야와 핵심 주제를 입력해주세요.</NeedPlan>;

  const engineReady = keys ? keys[project.engine.provider] : true;
  // 리메이크는 원본 항목을 담느라 글자 수 기준이 넉넉하다(remakePrompts.ts 규칙과 같게)
  const remakeOn = project.startMode === "remake" && !!project.remake?.angleId;
  const headMax = remakeOn ? 22 : 18;
  const subMax = remakeOn ? 120 : 70;
  // v1.58 장마다 원문과 그대로 겹치는지 브라우저에서 다시 검사(고치면 바로 사라짐) — 문구 API와 같은 검사 대상
  const guardRef = remakeOn ? remakeGuardText(project.remake?.sourceText ?? "") : "";
  const pageCopied = (p: CardPage): string[] =>
    guardRef ? copiedPhrases(pageTexts([{ headline: p.headline, sub: p.sub, points: p.points, number: p.number }]), guardRef) : [];

  const generate = async () => {
    setConfirm(false);
    setLoading(true);
    setError(null);
    setCopyNote([]);
    try {
      const res = await fetch("/api/cardnews/copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan,
          engine: project.engine,
          // 🔥 떡상 리메이크(v1.16): 고른 관점·분석 결과를 함께 보내 원본 항목을 빠짐없이 담게 한다
          ...(project.startMode === "remake" && project.remake?.analysis && project.remake.angleId
            ? { remake: { analysis: project.remake.analysis, angleId: project.remake.angleId, sourceText: project.remake.sourceText ?? "" } }
            : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError({ message: data.error || "문구를 만들지 못했습니다.", needKey: data.needApiKey });
        return;
      }
      const made = data.pages as Pick<CardPage, "headline" | "sub" | "icon" | "layout" | "points" | "number">[];
      setCopyNote(Array.isArray(data.copied) ? (data.copied as string[]) : []);
      update((d) => ({
        ...d,
        // 장 수가 같으면 이미 만든 배경 이미지는 그대로 둔다(장 번호 기준).
        pages: made.map((p, i) => ({
          id: newPageId(),
          headline: p.headline,
          sub: p.sub,
          icon: p.icon ?? DEFAULT_ICON_BY_CATEGORY[plan.category] ?? "sparkles",
          // 떡상 리메이크(v1.17)는 장마다 레이아웃·항목·숫자를 함께 받는다
          ...(p.layout && p.layout !== "background" ? { layout: p.layout, points: p.points, number: p.number } : {}),
          imageUrl: d.pages.length === made.length ? d.pages[i]?.imageUrl : undefined,
          imageUrls: d.pages.length === made.length ? d.pages[i]?.imageUrls : undefined,
        })),
      }));
    } catch {
      setError({ message: "네트워크 오류로 문구를 만들지 못했습니다. 잠시 뒤 다시 시도해주세요." });
    } finally {
      setLoading(false);
    }
  };

  const setPage = (i: number, patch: Partial<Pick<CardPage, "headline" | "sub" | "icon" | "layout" | "points" | "number">>) =>
    update((d) => ({ ...d, pages: d.pages.map((p, idx) => (idx === i ? { ...p, ...patch } : p)) }));

  return (
    <div className="space-y-6">
      <StepHeader step={2} title="문구" desc={`"${plan.topic}" 주제로 ${plan.pageCount}장의 문구를 AI가 쓰고, 직접 다듬습니다.`} />
      {project.startMode === "remake" && (
        <p className="rounded-xl border border-orange-400/30 bg-orange-500/10 px-3 py-2 text-xs text-orange-200">
          {project.remake?.angleId
            ? `🔥 떡상 리메이크: 「${VIRAL_ANGLES.find((a) => a.id === project.remake?.angleId)?.label ?? ""}」 관점과 분석한 핵심 사실 ${project.remake?.analysis?.keyFacts.length ?? 0}개를 반영해 씁니다.`
            : "🔥 떡상 리메이크: 1단계에서 떡상 분석 후 관점을 고르면 그 관점으로 문구를 씁니다(지금은 일반 문구로 씁니다)."}
        </p>
      )}

      <Card className="space-y-4">
        <EnginePicker />
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={loading || !engineReady}
            onClick={() => (pages.length > 0 ? setConfirm(true) : void generate())}
            className={BTN_PRIMARY}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
            {pages.length > 0 ? "문구 다시 기획" : "문구 기획"}
          </button>
          {loading && <span className="text-xs text-gray-500">AI가 문구를 쓰는 중입니다. 잠시만 기다려주세요…</span>}
        </div>
        {confirm && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <p>지금 쓴 문구가 새 문구로 바뀝니다. 직접 고친 내용은 사라집니다. 계속할까요?</p>
            <div className="mt-2 flex gap-2">
              <button type="button" onClick={() => void generate()} className={BTN_PRIMARY}>
                다시 기획
              </button>
              <button type="button" onClick={() => setConfirm(false)} className={BTN_GHOST}>
                취소
              </button>
            </div>
          </div>
        )}
        {error && <ErrorNote message={error.message} needKey={error.needKey} />}
        {copyNote.length > 0 && (
          <p className="rounded-lg border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">⚠ 원본 게시물 문장과 그대로 겹치는 구절이 {copyNote.length}개 남았습니다. 아래 노란 테두리 장을 다른 표현으로 고쳐 주세요: 「{copyNote.slice(0, 3).join("」, 「")}」</p>
        )}
      </Card>

      {pages.length > 0 && (
        <div className="space-y-3">
          {pages.map((p, i) => {
            const phrases = pageCopied(p);
            const copied = phrases.length > 0;
            return (
            <Card key={p.id} className={copied ? "outline outline-2 outline-offset-2 outline-amber-400" : undefined}>
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-bold text-violet-700">
                  {i + 1} / {pages.length}
                  {i === 0 ? " · 표지" : i === pages.length - 1 ? " · 마무리" : ""}
                </span>
                {copied && (
                  <button
                    type="button"
                    aria-expanded={openCopy.includes(p.id)}
                    onClick={() => setOpenCopy((cur) => (cur.includes(p.id) ? cur.filter((x) => x !== p.id) : [...cur, p.id]))}
                    className="whitespace-nowrap rounded-full bg-amber-500/20 px-2.5 py-0.5 text-xs font-bold text-amber-300"
                    title={`원본 게시물 문장과 그대로 겹치는 구절(다른 표현으로 고쳐 주세요):\n${phrases.slice(0, 3).map((x) => `「${x}」`).join("\n")}`}
                  >
                    ⚠ 겹침 {phrases.length} {openCopy.includes(p.id) ? "▲" : "▼"}
                  </button>
                )}
              </div>
              {copied && openCopy.includes(p.id) && (
                <ul className="mb-3 space-y-1 rounded-lg border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                  <li className="font-bold">원본 게시물 문장과 그대로 겹치는 구절 — 다른 표현으로 고쳐 주세요</li>
                  {phrases.map((x) => (
                    <li key={x}>「{x}」</li>
                  ))}
                </ul>
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 flex justify-between text-xs font-bold text-gray-700">
                    제목(헤드라인) <span className={p.headline.length > headMax ? "text-amber-600" : "text-gray-400"}>{p.headline.length}/{headMax}자 권장</span>
                  </label>
                  <textarea className={`${INPUT} min-h-20`} value={p.headline} maxLength={60} onChange={(e) => setPage(i, { headline: e.target.value })} />
                </div>
                <div>
                  <label className="mb-1 flex justify-between text-xs font-bold text-gray-700">
                    보조 문구 <span className={p.sub.length > subMax ? "text-amber-600" : "text-gray-400"}>{p.sub.length}/{subMax}자 권장</span>
                  </label>
                  <textarea className={`${INPUT} min-h-20`} value={p.sub} maxLength={160} onChange={(e) => setPage(i, { sub: e.target.value })} />
                </div>
              </div>
              <LayoutEditor page={p} onChange={(patch) => setPage(i, patch)} />
              <div className="mt-3 flex items-center gap-2">
                <label className="text-xs font-bold text-gray-700" htmlFor={`icon-${p.id}`}>
                  카드 아이콘
                </label>
                <select id={`icon-${p.id}`} className={`${INPUT} max-w-48`} value={p.icon ?? ""} onChange={(e) => setPage(i, { icon: e.target.value || undefined })}>
                  <option value="">없음</option>
                  {ICON_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </Card>
            );
          })}
          <div className="flex justify-end">
            <Link href="/cardnews/design" className={BTN_PRIMARY}>
              다음: 디자인 →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
