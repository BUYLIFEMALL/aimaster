"use client";

import { useState } from "react";
import Link from "next/link";
import { Sliders, FlaskConical, ExternalLink, Sparkles } from "lucide-react";
import type { AnalysisRecord, Fact, PaletteColor } from "@/lib/dna/types";
import { Card, CopyButton } from "./ui";

const CAMERA_LABELS: [keyof AnalysisRecord["result"]["camera"], string][] = [
  ["angle", "앵글"],
  ["shotType", "샷 타입"],
  ["lens", "렌즈"],
  ["focusDistance", "초점 거리"],
  ["depthOfField", "피사계 심도"],
];
const LIGHT_LABELS: [keyof AnalysisRecord["result"]["lighting"], string][] = [
  ["timeOfDay", "시간대"],
  ["direction", "조명 방향"],
  ["altitude", "고도"],
  ["contrast", "대비"],
  ["shadows", "그림자"],
];

function Rows({ title, rows }: { title: string; rows: [string, string][] }) {
  return (
    <Card>
      <h2 className="mb-3 text-sm font-bold text-slate-900">{title}</h2>
      <dl className="divide-y divide-slate-100">
        {rows.map(([k, v]) => (
          <div key={k} className="py-2 flex items-center justify-between gap-2">
            <dt className="text-[11px] font-bold text-slate-500 shrink-0">{k}</dt>
            <dd className="text-xs font-semibold text-slate-900 text-right truncate" title={v}>
              {v || "—"}
            </dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

/** 팔레트 도넛 차트(SVG) + 색상 목록. 비중은 실제 픽셀에서 계산한 값이다. */
export function PaletteCard({ palette }: { palette: PaletteColor[] }) {
  const R = 40;
  const C = 2 * Math.PI * R;
  const segments = palette.reduce<Array<PaletteColor & { len: number; offset: number }>>((acc, c) => {
    const prev = acc[acc.length - 1];
    const offset = prev ? prev.offset + prev.len : 0;
    const len = (c.percent / 100) * C;
    acc.push({ ...c, len, offset });
    return acc;
  }, []);

  return (
    <Card>
      <h2 className="mb-3 text-sm font-bold text-slate-900">미학적 색상 팔레트</h2>
      <div className="flex justify-center">
        <svg viewBox="0 0 100 100" className="h-36 w-36 -rotate-90" role="img" aria-label="색상 팔레트 비중">
          {segments.map((s) => (
            <circle
              key={s.hex}
              cx="50"
              cy="50"
              r={R}
              fill="none"
              stroke={s.hex}
              strokeWidth="16"
              strokeDasharray={`${s.len} ${C - s.len}`}
              strokeDashoffset={-s.offset}
            />
          ))}
        </svg>
      </div>
      <div className="mt-3 flex h-6 overflow-hidden rounded-md border border-slate-200 shadow-2xs">
        {palette.map((c) => (
          <div key={c.hex} style={{ background: c.hex, width: `${c.percent}%` }} title={`${c.hex} ${c.percent}%`} />
        ))}
      </div>
      <ul className="mt-3 space-y-1.5">
        {palette.map((c) => (
          <li key={c.hex} className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-2 font-mono text-slate-700">
              <span className="h-3 w-3 rounded-full border border-slate-200" style={{ background: c.hex }} />
              {c.hex}
            </span>
            <span className="font-bold text-slate-900">{c.percent}%</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function RichSection({ title, html, fallbackItems }: { title: string; html?: string; fallbackItems: Fact[] }) {
  if (html) {
    return (
      <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 space-y-2">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">{title}</h3>
        <div
          className="text-xs leading-relaxed text-slate-700 space-y-1 [&_ul]:space-y-1.5 [&_li]:flex [&_li]:items-start [&_li]:gap-1.5 [&_strong]:text-slate-900 [&_strong]:font-bold"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    );
  }

  if (!fallbackItems.length) return null;
  return (
    <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 space-y-2">
      <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">{title}</h3>
      <ul className="space-y-1.5 text-xs text-slate-700">
        {fallbackItems.map((f, i) => (
          <li key={i} className="leading-relaxed">
            {f.label && <b className="text-slate-900">{f.label}: </b>}
            {f.text}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function PromptBox({ label, text }: { label: string; text: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/70">
      <div className="flex items-center justify-between border-b border-slate-200 px-3.5 py-2">
        <span className="text-xs font-bold text-violet-800">{label}</span>
        <CopyButton text={text} />
      </div>
      <p className="whitespace-pre-wrap p-3.5 text-xs font-mono leading-relaxed text-slate-800 selection:bg-violet-100">
        {text}
      </p>
    </div>
  );
}

interface ResultViewProps {
  record: AnalysisRecord;
  onMutateQuick?: (newLevel: number) => void;
}

/** 분석 결과 전체 화면 */
export function ResultView({ record, onMutateQuick }: ResultViewProps) {
  const r = record.result;
  const [quickLevel, setQuickLevel] = useState(record.mutationLevel ?? 50);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        {/* 좌측 주요 결과 */}
        <div className="space-y-4">
          <Card className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-[minmax(0,260px)_1fr]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={record.imageUrl}
                alt={r.titleKo || "분석한 이미지"}
                className="max-h-96 w-full rounded-xl border border-slate-200 bg-slate-100 object-contain shadow-xs"
              />
              <div className="min-w-0 flex flex-col justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="rounded-full bg-violet-100 text-violet-800 px-2.5 py-0.5 text-[11px] font-extrabold">
                      {record.mode === "mutate" ? "유전자 변이" : "유전자 복제"}
                    </span>
                    <span className="rounded-full bg-slate-100 text-slate-700 px-2.5 py-0.5 text-[11px] font-bold">
                      {record.aspectRatio || "1:1"} 비율
                    </span>
                    {record.includeImageTag && (
                      <span className="rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 text-[10.5px] font-bold">
                        [첨부 이미지] 앵커
                      </span>
                    )}
                  </div>

                  <h2 className="mt-2 text-xl font-black leading-snug text-slate-900 tracking-tight">{r.titleEn}</h2>
                  <p className="text-sm font-bold text-slate-600 mt-0.5">{r.titleKo}</p>

                  {r.keywords.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {r.keywords.map((k) => (
                        <span
                          key={k}
                          className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[10.5px] font-bold uppercase text-slate-700"
                        >
                          {k}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-4 rounded-xl border border-violet-100 bg-violet-50/70 p-3.5 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-violet-800">아이덴티티 일치 확률 (AI 추정 재현도)</span>
                    <span className="text-2xl font-black text-violet-900">{r.matchRate}%</span>
                  </div>
                  <p className="text-[10.5px] text-violet-700/80 leading-tight">
                    AI가 분석한 스타일 DNA 일치 추정치입니다. 실제 색감 일치율은 3단계 결과 테스트에서 실측됩니다.
                  </p>
                </div>
              </div>
            </div>

            {/* 구조 청사진 / 스타일 분석 / 활용 팁 (리치 HTML) */}
            <div className="grid gap-3 pt-2">
              <RichSection
                title="구조적 청사진 (Structural Blueprint)"
                html={r.structuralBlueprintHtml}
                fallbackItems={r.structure}
              />
              <RichSection
                title="스타일 분석 (Style Analysis)"
                html={r.styleAnalysisHtml}
                fallbackItems={r.style}
              />
              <RichSection
                title="프로의 활용 팁 (Pro Usage Tips)"
                html={r.usageTipsHtml}
                fallbackItems={r.tips}
              />
            </div>
          </Card>

          {/* 카메라 & 조명 그리드 */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Rows title="카메라 & 렌즈" rows={CAMERA_LABELS.map(([k, label]) => [label, r.camera[k]])} />
            <Rows title="조명 & 분위기" rows={LIGHT_LABELS.map(([k, label]) => [label, r.lighting[k]])} />
          </div>

          {/* 마스터 프롬프트 카드 */}
          <Card className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-violet-600" />
                마스터 프롬프트 (Subject-Agnostic Master Prompts)
              </h2>
              <Link
                href="/test"
                className="inline-flex items-center gap-1 text-xs font-bold text-violet-600 hover:text-violet-800 transition"
              >
                <span>3단계 결과 테스트로 이동</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </div>
            <PromptBox label="마스터 프롬프트 (EN)" text={r.masterPromptEn} />
            <PromptBox label="마스터 프롬프트 (KO)" text={r.masterPromptKo} />
          </Card>
        </div>

        {/* 우측 사이드 패널: 색상 팔레트 & 스타일 DNA 막대 & 변이 즉시 적용 */}
        <div className="space-y-4">
          <PaletteCard palette={record.palette} />

          <Card>
            <h2 className="mb-3 text-sm font-bold text-slate-900">스타일 DNA 지표</h2>
            <ul className="space-y-3">
              {r.dna.map((d) => (
                <li key={d.label}>
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                    <span className="uppercase tracking-tight">{d.label}</span>
                    <span className="font-mono">{d.score}%</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-violet-600 transition-all" style={{ width: `${d.score}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          {/* 빠른 변이 재시퀀싱 위젯 */}
          {onMutateQuick && (
            <Card className="space-y-3 border-purple-200/80 bg-purple-50/40">
              <div className="flex items-center justify-between text-xs font-bold text-purple-900">
                <span className="flex items-center gap-1.5">
                  <FlaskConical className="h-4 w-4 text-purple-600" />
                  돌연변이 레벨 즉시 조절
                </span>
                <span className="font-mono font-black text-purple-700">{quickLevel}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={quickLevel}
                onChange={(e) => setQuickLevel(parseInt(e.target.value))}
                className="w-full h-1.5 bg-purple-200 rounded-full appearance-none cursor-pointer accent-purple-600"
              />
              <button
                type="button"
                onClick={() => onMutateQuick(quickLevel)}
                className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center justify-center gap-1.5"
              >
                <Sliders className="h-3.5 w-3.5" />
                <span>변이 강도 {quickLevel}% 즉시 적용</span>
              </button>
            </Card>
          )}

          {/* 결과 테스트 바로가기 카드 */}
          <Card className="bg-gradient-to-tr from-violet-600 to-indigo-600 text-white space-y-2.5">
            <h3 className="text-sm font-black tracking-tight">결과 테스트 및 이미지 합성</h3>
            <p className="text-xs text-violet-100 leading-relaxed">
              피사체를 넣어 실제로 생성해보고 원본과의 색감 일치율을 정밀 측정해보세요.
            </p>
            <Link
              href="/test"
              className="inline-flex w-full items-center justify-center gap-1.5 py-2.5 bg-white text-violet-700 hover:bg-violet-50 rounded-xl text-xs font-black transition shadow-xs"
            >
              <span>결과 테스트 시작하기</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
}
