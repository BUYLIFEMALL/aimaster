"use client";

import { RANGES, fmt, type MasteringParams } from "@/lib/mastering/params";

interface SliderProps {
  label: string;
  value: number;
  range: readonly [number, number, number];
  unit: string;
  onChange: (v: number) => void;
  disabled?: boolean;
}

function Slider({ label, value, range, unit, onChange, disabled }: SliderProps) {
  const [min, max, step] = range;
  return (
    <label className="block">
      <span className="flex items-center justify-between text-[11px] font-medium text-neutral-500">
        <span>{label}</span>
        <span className="font-mono text-neutral-800">{fmt(value, step)}{unit}</span>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} disabled={disabled} onChange={(e) => onChange(parseFloat(e.target.value))} className="mt-1 w-full accent-indigo-600 disabled:opacity-50" />
    </label>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3 rounded-xl border border-neutral-200 bg-white p-4">
      <h4 className="text-xs font-bold tracking-wide text-neutral-800">{title}</h4>
      {children}
    </div>
  );
}

/** 정밀 마스터링 랙: EQ · 새추레이션 · 컴프레서 · 스테레오 이미저 · 리미터 */
export function Rack({ params, onChange, disabled }: { params: MasteringParams; onChange: (p: MasteringParams) => void; disabled?: boolean }) {
  const R = RANGES;
  const set = <G extends keyof MasteringParams>(g: G, patch: Partial<MasteringParams[G]>) => onChange({ ...params, [g]: { ...params[g], ...patch } });
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <Section title="이퀄라이저 (EQ)">
        <Slider label="저음 (100Hz 쉘프)" value={params.eq.low} range={R.eq.low} unit="dB" onChange={(v) => set("eq", { low: v })} disabled={disabled} />
        <Slider label="중음 (1.5kHz)" value={params.eq.mid} range={R.eq.mid} unit="dB" onChange={(v) => set("eq", { mid: v })} disabled={disabled} />
        <Slider label="중음 대역폭 (Q)" value={params.eq.q} range={R.eq.q} unit="" onChange={(v) => set("eq", { q: v })} disabled={disabled} />
        <Slider label="고음 (8kHz 쉘프)" value={params.eq.high} range={R.eq.high} unit="dB" onChange={(v) => set("eq", { high: v })} disabled={disabled} />
      </Section>
      <Section title="아날로그 새추레이션">
        <Slider label="드라이브" value={params.saturation.drive} range={R.saturation.drive} unit="" onChange={(v) => set("saturation", { drive: v })} disabled={disabled} />
        <Slider label="배음 혼합" value={params.saturation.harmonics} range={R.saturation.harmonics} unit="%" onChange={(v) => set("saturation", { harmonics: v })} disabled={disabled} />
      </Section>
      <Section title="컴프레서">
        <Slider label="임계값" value={params.compressor.threshold} range={R.compressor.threshold} unit="dB" onChange={(v) => set("compressor", { threshold: v })} disabled={disabled} />
        <Slider label="비율" value={params.compressor.ratio} range={R.compressor.ratio} unit=":1" onChange={(v) => set("compressor", { ratio: v })} disabled={disabled} />
        <Slider label="어택" value={params.compressor.attack} range={R.compressor.attack} unit="ms" onChange={(v) => set("compressor", { attack: v })} disabled={disabled} />
        <Slider label="릴리즈" value={params.compressor.release} range={R.compressor.release} unit="ms" onChange={(v) => set("compressor", { release: v })} disabled={disabled} />
      </Section>
      <Section title="스테레오 이미저">
        <Slider label="너비 (100% = 원본)" value={params.stereo.width} range={R.stereo.width} unit="%" onChange={(v) => set("stereo", { width: v })} disabled={disabled} />
      </Section>
      <Section title="최종 리미터">
        <Slider label="입력 게인" value={params.limiter.gain} range={R.limiter.gain} unit="dB" onChange={(v) => set("limiter", { gain: v })} disabled={disabled} />
        <Slider label="실링 (최대 레벨)" value={params.limiter.ceiling} range={R.limiter.ceiling} unit="dBFS" onChange={(v) => set("limiter", { ceiling: v })} disabled={disabled} />
        <Slider label="릴리즈" value={params.limiter.release} range={R.limiter.release} unit="ms" onChange={(v) => set("limiter", { release: v })} disabled={disabled} />
      </Section>
    </div>
  );
}
