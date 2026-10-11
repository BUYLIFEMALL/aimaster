"use client";

import { useState } from "react";
import Link from "next/link";
import { COMPOSITIONS, DISPLAY_STYLES, FONTS, MOODS, PLACEMENTS, THEME_COLORS, VISUAL_STYLES, type MoodId } from "@/lib/cardnews/presets";
import type { CardStyle, TextStyle } from "@/lib/cardnews/types";
import { CardCanvas } from "@/components/studio/CardCanvas";
import { useStudio } from "@/components/studio/ProjectProvider";
import { TemplateBox } from "@/components/studio/TemplateBox";
import { BTN_PRIMARY, Card, Field, NeedPlan, SELECT, StepHeader } from "@/components/studio/ui";

function Slider({ label, value, min, max, step = 1, unit = "", onChange }: { label: string; value: number; min: number; max: number; step?: number; unit?: string; onChange: (n: number) => void }) {
  return (
    <label className="block">
      <span className="flex justify-between text-xs font-bold text-gray-700">
        {label}
        <span className="font-mono font-normal text-gray-500">
          {value}
          {unit}
        </span>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="mt-1 w-full accent-violet-600" />
    </label>
  );
}

function TextControls({ title, value, sizeMin, sizeMax, onChange }: { title: string; value: TextStyle; sizeMin: number; sizeMax: number; onChange: (patch: Partial<TextStyle>) => void }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[11px] font-extrabold tracking-wide text-gray-600">{title}</span>
        <label className="flex items-center gap-1.5 text-xs text-gray-600">
          색상
          <input type="color" value={value.color} onChange={(e) => onChange({ color: e.target.value })} className="h-6 w-8 cursor-pointer rounded border border-gray-300" />
        </label>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
        <Slider label="크기" value={value.size} min={sizeMin} max={sizeMax} unit="px" onChange={(size) => onChange({ size })} />
        <Slider label="굵기" value={value.weight} min={100} max={900} step={100} onChange={(weight) => onChange({ weight })} />
        <Slider label="좌우" value={value.dx} min={-300} max={300} unit="px" onChange={(dx) => onChange({ dx })} />
        <Slider label="상하" value={value.dy} min={-300} max={300} unit="px" onChange={(dy) => onChange({ dy })} />
      </div>
    </div>
  );
}

export default function DesignPage() {
  const { project, update } = useStudio();
  const { style, plan, pages } = project;
  const [index, setIndex] = useState(0);

  if (!plan.topic.trim()) return <NeedPlan>먼저 1단계에서 분야와 핵심 주제를 입력해주세요.</NeedPlan>;

  const patchStyle = (patch: Partial<CardStyle>) => update((d) => ({ ...d, style: { ...d.style, ...patch } }));
  const applyMood = (mood: MoodId) => {
    const m = MOODS.find((x) => x.value === mood)!;
    patchStyle({ mood, placement: m.defaults.placement, bgOpacity: m.defaults.bgOpacity, displayStyle: m.defaults.displayStyle });
  };

  const safeIndex = Math.min(index, Math.max(0, pages.length - 1));
  const page = pages[safeIndex] ?? { headline: "제목 미리보기", sub: "보조 문구가 이렇게 표시됩니다.", imageUrl: undefined };

  return (
    <div className="space-y-6">
      <StepHeader step={3} title="디자인" desc="화풍과 글자 모양을 정하면 오른쪽 미리보기에 바로 반영됩니다." />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-4">
          <TemplateBox />
          <Card className="space-y-4">
            <h2 className="text-sm font-bold text-gray-900">스타일 (배경 이미지에 반영)</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="디자인 무드" hint="고르면 글자 배치·막 진하기·효과의 추천값이 함께 바뀝니다.">
                <select className={SELECT} value={style.mood} onChange={(e) => applyMood(e.target.value as MoodId)}>
                  {MOODS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="비주얼 스타일(AI 화풍)">
                <select className={SELECT} value={style.visualStyle} onChange={(e) => patchStyle({ visualStyle: e.target.value as CardStyle["visualStyle"] })}>
                  {VISUAL_STYLES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="비주얼 구성">
                <select className={SELECT} value={style.composition} onChange={(e) => patchStyle({ composition: e.target.value as CardStyle["composition"] })}>
                  {COMPOSITIONS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="테마 컬러">
                <select className={SELECT} value={style.themeColor} onChange={(e) => patchStyle({ themeColor: e.target.value as CardStyle["themeColor"] })}>
                  {THEME_COLORS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <p className="text-[11px] text-gray-500">스타일·구성·테마 컬러는 다음 단계에서 배경을 만들 때 반영됩니다. 이미 만든 배경은 바뀌지 않습니다.</p>
          </Card>

          <Card className="space-y-4">
            <h2 className="text-sm font-bold text-gray-900">레이아웃 및 표시</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="텍스트 배치">
                <select className={SELECT} value={style.placement} onChange={(e) => patchStyle({ placement: e.target.value as CardStyle["placement"] })}>
                  {PLACEMENTS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="표시 스타일">
                <select className={SELECT} value={style.displayStyle} onChange={(e) => patchStyle({ displayStyle: e.target.value as CardStyle["displayStyle"] })}>
                  {DISPLAY_STYLES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Slider label="배경 불투명도(글자 뒤 막)" value={style.bgOpacity} min={0} max={90} unit="%" onChange={(bgOpacity) => patchStyle({ bgOpacity })} />
          </Card>

          <Card className="space-y-4">
            <h2 className="text-sm font-bold text-gray-900">타이포그래피</h2>
            <Field label="폰트(무료 공개 글꼴)" hint={FONTS.find((f) => f.value === style.font)?.note}>
              <select className={SELECT} value={style.font} onChange={(e) => patchStyle({ font: e.target.value as CardStyle["font"] })}>
                {FONTS.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </Field>
            <TextControls title="HEADLINE (메인)" value={style.headline} sizeMin={30} sizeMax={160} onChange={(patch) => patchStyle({ headline: { ...style.headline, ...patch } })} />
            <TextControls title="SUB-TEXT (서브)" value={style.sub} sizeMin={18} sizeMax={90} onChange={(patch) => patchStyle({ sub: { ...style.sub, ...patch } })} />
          </Card>
        </div>

        <div className="lg:sticky lg:top-6 lg:self-start">
          <Card className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-900">미리보기</h2>
              {pages.length > 1 && (
                <div className="flex items-center gap-1">
                  <button type="button" disabled={safeIndex === 0} onClick={() => setIndex(safeIndex - 1)} className="rounded-lg border border-gray-200 px-2 py-1 text-xs disabled:opacity-40">
                    ◀
                  </button>
                  <span className="px-1 text-xs text-gray-600">
                    {safeIndex + 1} / {pages.length}
                  </span>
                  <button type="button" disabled={safeIndex >= pages.length - 1} onClick={() => setIndex(safeIndex + 1)} className="rounded-lg border border-gray-200 px-2 py-1 text-xs disabled:opacity-40">
                    ▶
                  </button>
                </div>
              )}
            </div>
            <CardCanvas page={page} style={style} ratio={plan.ratio} />
            {pages.length === 0 && <p className="text-[11px] text-gray-500">문구를 만들면 실제 문구로 미리볼 수 있습니다. 배경은 4단계에서 생성합니다.</p>}
          </Card>
        </div>
      </div>

      <div className="flex justify-end">
        <Link href="/background" className={BTN_PRIMARY}>
          다음: 배경 생성 →
        </Link>
      </div>
    </div>
  );
}
