"use client";

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
      <h2 className="mb-3 text-sm font-bold text-gray-900">{title}</h2>
      <dl className="divide-y divide-gray-100">
        {rows.map(([k, v]) => (
          <div key={k} className="py-2">
            <dt className="text-[11px] font-bold text-gray-500">{k}</dt>
            <dd className="mt-0.5 text-sm font-medium text-gray-900">{v || "—"}</dd>
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
  let offset = 0;
  return (
    <Card>
      <h2 className="mb-3 text-sm font-bold text-gray-900">색상 팔레트</h2>
      <div className="flex justify-center">
        <svg viewBox="0 0 100 100" className="h-36 w-36 -rotate-90" role="img" aria-label="색상 팔레트 비중">
          {palette.map((c) => {
            const len = (c.percent / 100) * C;
            const el = <circle key={c.hex} cx="50" cy="50" r={R} fill="none" stroke={c.hex} strokeWidth="16" strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-offset} />;
            offset += len;
            return el;
          })}
        </svg>
      </div>
      <div className="mt-3 flex h-6 overflow-hidden rounded-md border border-gray-200">
        {palette.map((c) => (
          <div key={c.hex} style={{ background: c.hex, width: `${c.percent}%` }} title={`${c.hex} ${c.percent}%`} />
        ))}
      </div>
      <ul className="mt-3 space-y-1.5">
        {palette.map((c) => (
          <li key={c.hex} className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-2 font-mono text-gray-700">
              <span className="h-3 w-3 rounded-full border border-gray-200" style={{ background: c.hex }} />
              {c.hex}
            </span>
            <span className="font-bold text-gray-900">{c.percent}%</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function FactList({ title, items }: { title: string; items: Fact[] }) {
  if (!items.length) return null;
  return (
    <div>
      <h3 className="mb-1.5 text-sm font-bold text-gray-900">{title}</h3>
      <ul className="space-y-1.5 text-sm text-gray-700">
        {items.map((f, i) => (
          <li key={i} className="leading-relaxed">
            {f.label && <b className="text-gray-900">{f.label}: </b>}
            {f.text}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function PromptBox({ label, text }: { label: string; text: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50">
      <div className="flex items-center justify-between border-b border-gray-200 px-3 py-2">
        <span className="text-xs font-bold text-cyan-800">{label}</span>
        <CopyButton text={text} />
      </div>
      <p className="whitespace-pre-wrap p-3 text-sm leading-relaxed text-gray-800">{text}</p>
    </div>
  );
}

/** 분석 결과 전체 화면 */
export function ResultView({ record }: { record: AnalysisRecord }) {
  const r = record.result;
  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <Card className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-[minmax(0,260px)_1fr]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={record.imageUrl} alt={r.titleKo || "분석한 이미지"} className="max-h-96 w-full rounded-xl border border-gray-200 bg-gray-100 object-contain" />
              <div className="min-w-0">
                <p className="text-[11px] font-bold tracking-wide text-cyan-700">{record.mode === "mutate" ? "유전자 변이" : "유전자 복제"} · 비율 {record.aspectRatio}</p>
                <h2 className="mt-1 text-xl font-extrabold leading-snug text-gray-900">{r.titleEn}</h2>
                <p className="text-base font-bold text-gray-600">{r.titleKo}</p>
                {r.keywords.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {r.keywords.map((k) => (
                      <span key={k} className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-0.5 text-[11px] font-bold uppercase text-gray-700">
                        {k}
                      </span>
                    ))}
                  </div>
                )}
                <div className="mt-4 rounded-xl border border-cyan-100 bg-cyan-50 p-3">
                  <p className="text-[11px] font-bold text-cyan-800">AI 추정 재현도</p>
                  <p className="text-3xl font-extrabold text-cyan-900">{r.matchRate}%</p>
                  <p className="text-[11px] text-cyan-800/80">AI가 스스로 짐작한 값입니다. 실제 색감 일치율은 3단계 결과 테스트에서 측정합니다.</p>
                </div>
              </div>
            </div>
            <FactList title="구조적 청사진" items={r.structure} />
            <FactList title="스타일 분석" items={r.style} />
            <FactList title="프로의 활용 팁" items={r.tips} />
          </Card>

          <div className="grid gap-4 sm:grid-cols-2">
            <Rows title="카메라 & 렌즈" rows={CAMERA_LABELS.map(([k, label]) => [label, r.camera[k]])} />
            <Rows title="조명 & 분위기" rows={LIGHT_LABELS.map(([k, label]) => [label, r.lighting[k]])} />
          </div>

          <Card className="space-y-3">
            <h2 className="text-sm font-bold text-gray-900">마스터 프롬프트</h2>
            <PromptBox label="마스터 프롬프트 (EN)" text={r.masterPromptEn} />
            <PromptBox label="마스터 프롬프트 (KO)" text={r.masterPromptKo} />
          </Card>
        </div>

        <div className="space-y-4">
          <PaletteCard palette={record.palette} />
          <Card>
            <h2 className="mb-3 text-sm font-bold text-gray-900">스타일 DNA</h2>
            <ul className="space-y-3">
              {r.dna.map((d) => (
                <li key={d.label}>
                  <div className="flex items-center justify-between text-[11px] font-bold text-gray-700">
                    <span className="uppercase">{d.label}</span>
                    <span>{d.score}%</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-100">
                    <div className="h-full rounded-full bg-cyan-500" style={{ width: `${d.score}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
