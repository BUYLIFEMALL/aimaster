"use client";

import React from "react";
import { Lightbulb, Zap } from "lucide-react";
import { BLOG_PERSONAS, type BlogPersona } from "@/lib/blog/personas";
import { clampTargetLength } from "@/lib/blog/pipeline";
import { WRITING_STYLES, WRITING_TONES, getWritingStyleExample, type WritingStyle, type WritingTone } from "@/lib/blog/styles";

export interface GenerationValues {
  personaId: string | null;
  targetLength: number;
  keywords: string;
  purpose: string;
  tone: WritingTone;
  style: WritingStyle;
}

interface Props {
  values: GenerationValues;
  onChange: (patch: Partial<GenerationValues>) => void;
  /** [페르소나 불러오기]: 주제·키워드·발행 목적·말끝을 이 페르소나의 기본값으로 채운다(부모가 주제도 채운다) */
  onLoadPersona: (p: BlogPersona) => void;
  /** [즉시 생성 →]: 불러온 뒤 바로 생성 */
  onInstant?: (p: BlogPersona) => void;
  /** 특정 주제 입력칸(수집·선택한 주제). 맛집 탭처럼 주제가 따로 없는 화면은 생략 */
  topic?: string;
  setTopic?: (t: string) => void;
  disabled?: boolean;
  /** 키워드·발행 목적 입력칸을 숨긴다(맛집 탭은 자체 키워드·방문 정보 입력을 쓴다) */
  hideDetails?: boolean;
  /** 기획 세부 조건에서 검색 키워드 칸만 숨긴다(맛집 탭은 SEO 키워드 영역이 따로 있다) */
  hideKeywords?: boolean;
  /** 말끝·문체 아래에 이어 붙이는 화면 전용 영역(맛집 탭: 작성자 페르소나·인간화·방문 경험) */
  extra?: React.ReactNode;
  /** 특정 주제 칸 문구(기본: 아이디어·키워드 탭 문구) */
  topicLabel?: string;
  topicPlaceholder?: string;
}

const QUICK_LENGTHS = [1000, 1800, 2000, 2500, 3500, 4000];

export function GenerationPanel({ values, onChange, onLoadPersona, onInstant, topic, setTopic, disabled, hideDetails, hideKeywords, topicLabel, topicPlaceholder, extra }: Props) {
  const example = getWritingStyleExample(values.tone, values.style);
  const input = "w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500";

  return (
    <div className="rounded-2xl border-2 border-violet-300 bg-violet-50/50 p-5 space-y-6">
      <div className="flex flex-wrap items-center gap-2 border-b border-violet-200 pb-3">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-600 text-white text-sm">📝</span>
        <h3 className="text-sm font-extrabold text-violet-950">글 생성 설정</h3>
        <span className="text-[11px] text-violet-700/80">페르소나 · 글자수 · 세부 조건 · 말끝·문체를 정하면 이 설정대로 최종 본문이 만들어집니다</span>
      </div>

      {/* 1. 글의 화자(페르소나) */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-sm font-bold text-slate-900">🎭 글의 화자(페르소나) 선택 <span className="text-[11px] font-normal text-slate-500">글을 쓰는 주인공·화자의 시각·말투·경험 캐릭터를 설정합니다</span></h4>
          {values.personaId && (
            <button type="button" onClick={() => onChange({ personaId: null })} className="text-[11px] font-bold text-slate-500 underline">선택 해제(기본 화자)</button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {BLOG_PERSONAS.map((p) => {
            const active = values.personaId === p.id;
            return (
              <div key={p.id} className={`rounded-xl border p-3.5 space-y-2 transition ${active ? "border-emerald-500 bg-emerald-50/60 ring-1 ring-emerald-400" : "border-slate-200 bg-white hover:border-slate-300"}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="text-xs font-extrabold text-slate-900">{p.emoji} {p.name}</div>
                  <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-amber-100 text-amber-800 shrink-0">{p.badge}</span>
                </div>
                <p className="text-[11px] text-slate-600">{p.tagline}</p>
                <p className="text-[11px] text-slate-500 line-clamp-2 border-t border-slate-100 pt-2">추천 주제: {p.defaultTopic}</p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                      onChange({ personaId: p.id });
                      onLoadPersona(p);
                    }}
                    className={`flex-1 basis-0 min-w-0 flex items-center justify-center px-2 py-1.5 text-[11px] font-bold rounded-lg ${active ? "bg-emerald-600 text-white" : "bg-blue-600 text-white hover:bg-blue-700"} disabled:opacity-50`}
                  >
                    {active ? "✓ 선택됨 · 다시 불러오기" : "페르소나 불러오기"}
                  </button>
                  {onInstant && (
                    <button type="button" disabled={disabled} onClick={() => onInstant(p)} className="flex-1 basis-0 min-w-0 flex items-center justify-center gap-1 px-2 py-1.5 text-[11px] font-bold rounded-lg bg-slate-900 text-white hover:bg-black disabled:opacity-50">
                      <Zap className="w-3 h-3" /> 즉시 생성
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-[11px] text-slate-500">페르소나는 글을 쓰는 관점·관심사를 정합니다. 말끝과 문체는 아래에서 따로 고르며 페르소나보다 우선 적용됩니다.</p>
      </div>

      {/* 2. 원하는 글자수 */}
      <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50/30 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h4 className="text-sm font-bold text-slate-900">✍️ 원하는 글자수 설정 <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold rounded bg-emerald-100 text-emerald-700">300~4,000자 범위 설정</span></h4>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500">목표 글자수:</span>
            <span className="px-2.5 py-1 font-extrabold rounded-lg bg-slate-900 text-white">{values.targetLength.toLocaleString()}자</span>
            <input
              type="number"
              min={300}
              max={4000}
              value={values.targetLength}
              onChange={(e) => onChange({ targetLength: clampTargetLength(e.target.value) })}
              disabled={disabled}
              className="w-20 px-2 py-1 text-xs border border-slate-300 rounded-lg bg-white"
              aria-label="목표 글자수 직접 입력"
            />
          </div>
        </div>
        <input
          type="range"
          min={300}
          max={4000}
          step={100}
          value={values.targetLength}
          onChange={(e) => onChange({ targetLength: clampTargetLength(e.target.value) })}
          disabled={disabled}
          className="w-full accent-emerald-600"
          aria-label="목표 글자수"
        />
        <div className="flex justify-between text-[10px] text-slate-400"><span>300자</span><span>1,000자</span><span>2,000자 (추천 표준)</span><span>3,000자</span><span>4,000자 (최대)</span></div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="flex items-center gap-1 text-[11px] text-slate-600"><Lightbulb className="w-3.5 h-3.5 text-amber-500" />네이버 블로그 표준: C-Rank / D.I.A+ 검색 상위 노출은 2,000자 안팎(소제목 3~4개)이 가장 안정적입니다.</p>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-slate-500">빠른 선택:</span>
            {QUICK_LENGTHS.map((n) => (
              <button key={n} type="button" disabled={disabled} onClick={() => onChange({ targetLength: n })} className={`px-2 py-1 text-[11px] font-bold rounded-lg border ${values.targetLength === n ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"}`}>
                {n.toLocaleString()}자
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3. 기획 세부 조건 */}
      {!hideDetails && <div className="space-y-3">
        <h4 className="text-sm font-bold text-slate-900">🎯 기획 세부 조건 조정 <span className="text-[11px] font-normal text-slate-500">페르소나 선택 시 자동 입력되며, 자유롭게 수정할 수 있습니다.</span></h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {setTopic && (
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">{topicLabel ?? "특정 주제 (비워두면 페르소나·트렌드로 자동 발굴)"}</label>
              <input type="text" value={topic ?? ""} onChange={(e) => setTopic(e.target.value)} disabled={disabled} className={input} placeholder={topicPlaceholder ?? "예: 2026년 최고의 AI 생산성 도구 5가지"} />
            </div>
          )}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">발행 목적 및 독자 타겟</label>
            <input type="text" value={values.purpose} onChange={(e) => onChange({ purpose: e.target.value.slice(0, 300) })} disabled={disabled} className={input} placeholder="예: 실제 입장에서 가성비를 꼼꼼하게 비교 분석하여 이웃들에게 추천" />
          </div>
          {!hideKeywords && <div className={setTopic ? "md:col-span-2" : ""}>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">검색 키워드 (쉼표 구분)</label>
            <input type="text" value={values.keywords} onChange={(e) => onChange({ keywords: e.target.value.slice(0, 300) })} disabled={disabled} className={input} placeholder="예: 가전제품 비교, 살림 꿀팁, 세탁 노하우" />
          </div>}
        </div>
      </div>}

      {/* 4. 원고 말끝·문체 */}
      <div className="rounded-2xl border border-slate-200 p-4 space-y-3">
        <h4 className="text-sm font-bold text-slate-900">🖊️ 원고 말끝·문체 설정</h4>
        <p className="text-[11px] text-slate-500">페르소나는 글의 화자입니다. 말끝과 문체는 별도로 선택하며, 페르소나·카테고리를 바꿔도 선택값이 유지됩니다.</p>
        <div>
          <p className="text-[11px] font-bold text-slate-700 mb-1.5">말끝 선택</p>
          <div className="flex flex-wrap gap-2">
            {WRITING_TONES.map((t) => (
              <button key={t.value} type="button" disabled={disabled} onClick={() => onChange({ tone: t.value })} title={t.description} className={`px-3 py-1.5 text-xs font-bold rounded-lg border ${values.tone === t.value ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"}`}>
                {t.value}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-[11px] font-bold text-slate-700 mb-1.5">문체 선택</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {WRITING_STYLES.map((s) => (
              <button key={s.value} type="button" disabled={disabled} onClick={() => onChange({ style: s.value })} className={`rounded-xl border p-2.5 text-left transition ${values.style === s.value ? "border-emerald-500 bg-emerald-50/70 ring-1 ring-emerald-400" : "border-slate-200 bg-white hover:border-slate-300"}`}>
                <div className="text-xs font-extrabold text-slate-900">{s.label}</div>
                <div className="text-[10px] text-slate-500">{s.description}</div>
              </button>
            ))}
          </div>
        </div>
        <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
          <p className="text-[11px] font-bold text-slate-700">표현 예시 · {values.tone} + {WRITING_STYLES.find((s) => s.value === values.style)?.label}</p>
          <p className="mt-1 text-xs text-slate-800">{example}</p>
          <p className="mt-1 text-[10px] text-slate-400">문체 차이를 보여 주는 예시입니다. 실제 원고는 입력한 주제로 작성하며 경험·후기·수치를 지어내지 않습니다.</p>
        </div>
      </div>
      {extra}
    </div>
  );
}
