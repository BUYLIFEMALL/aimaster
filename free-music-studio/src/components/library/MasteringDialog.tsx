"use client";

// 마스터링 설정 창 — 원본 boks-music `src/App.tsx`(MIT, © 2026 boksajang)의 마스터링 창(목표 음량·피크 상한·성격, 기본값 채움)을 옮김(2026-11-06).
// 2026-11-09 AI 마스터링 스튜디오와 합침(주인님 「가져와서 비교하고 중복되는 건 제외하고 더 나은 것을 선택해」「합쳐」「프리셋은 많을수록 좋아」):
// 프리셋 96종(분류·찾기) · AI 설정 제안(회원 본인 키) · 소리 색깔 직접 조절(EQ·포화·압축·폭). 음량 맞추기는 무료음악 엔진 방식 그대로.
// 실제 처리는 회원 PC 엔진(ffmpeg)이 대기열에서 하고, 결과는 「제목 (마스터링)」 새 곡으로 기록된다.
import { useEffect, useMemo, useState } from "react";
import { Loader2, Search, SlidersHorizontal, Sparkles, X } from "lucide-react";
import { MASTER_CHARACTER_LABEL, MASTER_LUFS_LABEL, type MasterOptions } from "@/lib/engine";
import { loadAiPrefs, modelLabel, type AiPrefs } from "@/lib/aiModelChoice";
import { LYRIC_PROVIDERS } from "@/lib/lyricModels";
import {
  DEFAULT_COMPRESSOR,
  FLAT_TONE,
  LUFS_CHOICES,
  MASTER_PRESET_GROUPS,
  OLD_LUFS,
  PEAK_CHOICES,
  TONE_RANGES,
  isFlatTone,
  masterPresetById,
  searchMasterPresets,
  type AiMasterSuggestion,
  type MasterLufs,
  type MasterPreset,
  type MasterTone,
} from "@/lib/masterPresets";

const LAST_KEY = "fms.masterPreset";
const CHAR_SHORT = { balanced: "균형", gentle: "부드럽게", punchy: "강하게" } as const;

type Props = {
  title: string;
  style?: string;
  instrumental?: boolean;
  /** 엔진 0.8.2+ — 소리 색깔·-16/-18 LUFS */
  toneOk: boolean;
  onClose: () => void;
  onStart: (o: MasterOptions) => Promise<void>;
};

function fromPreset(p: MasterPreset, toneOk: boolean): { o: MasterOptions; tone: MasterTone } {
  const lufs: MasterLufs = toneOk || OLD_LUFS.includes(p.targetLufs) ? p.targetLufs : -14;
  return { o: { targetLufs: lufs, truePeak: p.truePeak, character: p.character }, tone: p.tone ?? FLAT_TONE };
}

export function MasteringDialog({ title, style, instrumental, toneOk, onClose, onStart }: Props) {
  const [presetId, setPresetId] = useState<string>("basic");
  const [group, setGroup] = useState("");
  const [q, setQ] = useState("");
  const [o, setO] = useState<MasterOptions>(() => fromPreset(masterPresetById("basic")!, toneOk).o);
  const [tone, setTone] = useState<MasterTone>(FLAT_TONE);
  const [busy, setBusy] = useState(false);
  const [aiText, setAiText] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiNote, setAiNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [prefs, setPrefs] = useState<AiPrefs | null>(null);

  useEffect(() => {
    loadAiPrefs().then(setPrefs);
    try {
      const last = localStorage.getItem(LAST_KEY);
      const p = last ? masterPresetById(last) : null;
      if (p) pick(p);
    } catch {
      /* 저장 안 되는 창이면 기본값 */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const list = useMemo(() => searchMasterPresets(q, group || undefined), [q, group]);
  const current = presetId === "ai" || presetId === "custom" ? null : masterPresetById(presetId);

  function pick(p: MasterPreset) {
    const r = fromPreset(p, toneOk);
    setPresetId(p.id);
    setO(r.o);
    setTone(r.tone);
    setAiNote(null);
    try {
      localStorage.setItem(LAST_KEY, p.id);
    } catch {
      /* 무시 */
    }
  }

  function changeTone(next: MasterTone) {
    setTone(next);
    if (presetId !== "custom") setPresetId("custom");
  }

  async function askAi() {
    if (!prefs || aiText.trim().length < 2) return;
    setAiBusy(true);
    setAiNote(null);
    try {
      const res = await fetch("/api/master-preset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: aiText, provider: prefs.textProvider, model: prefs.models[prefs.textProvider], title, style, instrumental }),
      });
      const d = (await res.json().catch(() => ({}))) as Partial<AiMasterSuggestion> & { error?: string };
      if (!res.ok || !d.tone) throw new Error(d.error || "설정값을 만들지 못했습니다.");
      setTone(d.tone);
      setO({ targetLufs: toneOk || OLD_LUFS.includes(d.targetLufs!) ? d.targetLufs! : -14, truePeak: d.truePeak!, character: d.character! });
      setPresetId("ai");
      setAiNote({ ok: true, text: d.explanation || "AI가 설정값을 채웠습니다." });
    } catch (e) {
      setAiNote({ ok: false, text: (e as Error).message });
    } finally {
      setAiBusy(false);
    }
  }

  const sel = "w-full truncate rounded-xl border border-slate-700 bg-slate-950 py-2 pl-2.5 pr-7 text-[11px] text-slate-100 focus:border-emerald-400 focus:outline-hidden";
  const lufsList = toneOk ? LUFS_CHOICES : OLD_LUFS;
  const providerLabel = prefs ? LYRIC_PROVIDERS.find((p) => p.id === prefs.textProvider)?.label : "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div role="dialog" aria-label="마스터링" onClick={(e) => e.stopPropagation()} className="flex max-h-[92vh] w-full max-w-3xl flex-col rounded-2xl border border-slate-700 bg-[#0a0f1d] shadow-2xl">
        <div className="flex items-center gap-2 border-b border-slate-800 px-5 py-4">
          <SlidersHorizontal className="h-4 w-4 text-emerald-300" />
          <p className="min-w-0 flex-1 truncate text-sm font-bold text-slate-100">마스터링 — {title}</p>
          <button type="button" onClick={onClose} aria-label="닫기" className="rounded-full p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {!toneOk && (
            <p className="rounded-lg border border-amber-500/40 bg-amber-950/30 p-3 text-[11px] leading-relaxed text-amber-200">
              지금 엔진은 음량만 맞춥니다. 프리셋의 소리 색깔(EQ·포화·압축·폭)과 -16·-18 LUFS는 엔진 0.8.2 이상에서 적용됩니다 — 엔진 창에서 새 설치 파일을 받아 업데이트해 주세요.
            </p>
          )}

          {/* 프리셋 */}
          <section className="space-y-2">
            <div className="flex items-center gap-2">
              <p className="text-[11px] font-bold text-slate-200">프리셋 {list.length}개</p>
              <select value={group} onChange={(e) => setGroup(e.target.value)} aria-label="프리셋 분류" className="ml-auto rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] text-slate-200">
                <option value="">전체 분류</option>
                {MASTER_PRESET_GROUPS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
              <label className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1">
                <Search className="h-3 w-3 text-slate-500" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="찾기 (예: 발라드, 차량)" className="w-36 bg-transparent text-[11px] text-slate-100 outline-hidden placeholder:text-slate-600" />
              </label>
            </div>
            <div className="grid max-h-[min(22rem,40vh)] grid-cols-1 gap-1.5 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => pick(p)}
                  className={`rounded-lg border px-2.5 py-1.5 text-left transition ${presetId === p.id ? "border-emerald-400 bg-emerald-950/50" : "border-slate-800 bg-slate-950/60 hover:border-slate-600"}`}
                >
                  <span className="block truncate text-[11px] font-semibold text-slate-100">{p.name}</span>
                  <span className="block truncate text-[10px] text-slate-500">
                    {p.group} · {p.targetLufs} LUFS · {CHAR_SHORT[p.character]}
                    {p.tone ? "" : " · 소리 색깔 없음"}
                  </span>
                </button>
              ))}
              {list.length === 0 && <p className="col-span-full p-3 text-center text-[11px] text-slate-500">맞는 프리셋이 없습니다.</p>}
            </div>
            <p className="text-[11px] text-slate-400">
              {current ? `「${current.name}」 ${current.description}` : presetId === "ai" ? "AI 제안 설정을 쓰는 중입니다." : "직접 조절한 설정을 쓰는 중입니다."}
            </p>
          </section>

          {/* AI 설정 제안 */}
          <section className="space-y-2 rounded-xl border border-slate-800 bg-slate-950/50 p-3">
            <p className="flex items-center gap-1.5 text-[11px] font-bold text-slate-200">
              <Sparkles className="h-3.5 w-3.5 text-violet-300" /> AI 설정 제안
              <span className="ml-auto text-[10px] font-normal text-slate-500">{prefs ? `${providerLabel} · ${modelLabel(prefs.textProvider, prefs.models[prefs.textProvider])} (회원님 키, 1번 호출)` : "불러오는 중…"}</span>
            </p>
            <div className="flex gap-2">
              <input
                value={aiText}
                onChange={(e) => setAiText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && askAi()}
                maxLength={400}
                placeholder="원하는 소리 — 예: 피아노가 맑고 보컬이 가까운 잔잔한 발라드"
                className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100 outline-hidden placeholder:text-slate-600 focus:border-violet-400"
              />
              <button type="button" disabled={aiBusy || !prefs || aiText.trim().length < 2} onClick={askAi} className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-violet-600 px-3 py-2 text-xs font-bold text-white hover:brightness-110 disabled:opacity-40">
                {aiBusy && <Loader2 className="h-3.5 w-3.5 animate-spin" />} 설정 만들기
              </button>
            </div>
            {aiNote && <p className={`text-[11px] ${aiNote.ok ? "text-violet-200" : "text-rose-300"}`}>{aiNote.text}</p>}
          </section>

          {/* 음량·피크·성격 */}
          <section className="grid gap-3 sm:grid-cols-3">
            <label className="block space-y-1 text-[11px] font-semibold text-slate-300">
              목표 음량
              <select value={o.targetLufs} onChange={(e) => setO({ ...o, targetLufs: Number(e.target.value) as MasterLufs })} className={sel}>
                {lufsList.map((v) => (
                  <option key={v} value={v}>
                    {MASTER_LUFS_LABEL[v]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1 text-[11px] font-semibold text-slate-300">
              최대 피크(True Peak)
              <select value={o.truePeak} onChange={(e) => setO({ ...o, truePeak: Number(e.target.value) as MasterOptions["truePeak"] })} className={sel}>
                {PEAK_CHOICES.map((v) => (
                  <option key={v} value={v}>
                    {v} dBTP{v === -1 ? " · 기본(사이트 권장)" : ""}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1 text-[11px] font-semibold text-slate-300">
              소리 성격(자동 압축)
              <select value={o.character} onChange={(e) => setO({ ...o, character: e.target.value as MasterOptions["character"] })} className={sel}>
                {(Object.keys(MASTER_CHARACTER_LABEL) as MasterOptions["character"][]).map((v) => (
                  <option key={v} value={v}>
                    {MASTER_CHARACTER_LABEL[v]}
                  </option>
                ))}
              </select>
            </label>
          </section>

          {/* 소리 색깔 직접 조절 */}
          <details className="rounded-xl border border-slate-800 bg-slate-950/40 p-3" open={presetId === "custom"}>
            <summary className="cursor-pointer text-[11px] font-bold text-slate-200">
              소리 색깔 직접 조절 {isFlatTone(tone) ? "· 지금은 없음" : "· 적용 중"}
            </summary>
            <div className="mt-3 space-y-3">
              <ToneGroup label="EQ (저음 100Hz · 중음 1.5kHz · 고음 8kHz)">
                <Slider label="저음" unit="dB" v={tone.eq.low} r={TONE_RANGES.eq.low} on={(x) => changeTone({ ...tone, eq: { ...tone.eq, low: x } })} />
                <Slider label="중음" unit="dB" v={tone.eq.mid} r={TONE_RANGES.eq.mid} on={(x) => changeTone({ ...tone, eq: { ...tone.eq, mid: x } })} />
                <Slider label="고음" unit="dB" v={tone.eq.high} r={TONE_RANGES.eq.high} on={(x) => changeTone({ ...tone, eq: { ...tone.eq, high: x } })} />
                <Slider label="중음 폭(Q)" unit="" v={tone.eq.q} r={TONE_RANGES.eq.q} on={(x) => changeTone({ ...tone, eq: { ...tone.eq, q: x } })} />
              </ToneGroup>
              <ToneGroup label="아날로그 포화">
                <Slider label="세기" unit="" v={tone.saturation.drive} r={TONE_RANGES.saturation.drive} on={(x) => changeTone({ ...tone, saturation: { ...tone.saturation, drive: x } })} />
                <Slider label="섞는 양" unit="%" v={tone.saturation.harmonics} r={TONE_RANGES.saturation.harmonics} on={(x) => changeTone({ ...tone, saturation: { ...tone.saturation, harmonics: x } })} />
              </ToneGroup>
              <ToneGroup
                label="압축"
                extra={
                  <label className="flex items-center gap-1 text-[10px] text-slate-400">
                    <input type="checkbox" checked={!!tone.compressor} onChange={(e) => changeTone({ ...tone, compressor: e.target.checked ? { ...DEFAULT_COMPRESSOR } : null })} /> 직접 압축(끄면 위 「소리 성격」 자동 압축)
                  </label>
                }
              >
                {tone.compressor && (
                  <>
                    <Slider label="기준" unit="dB" v={tone.compressor.threshold} r={TONE_RANGES.compressor.threshold} on={(x) => changeTone({ ...tone, compressor: { ...tone.compressor!, threshold: x } })} />
                    <Slider label="비율" unit=":1" v={tone.compressor.ratio} r={TONE_RANGES.compressor.ratio} on={(x) => changeTone({ ...tone, compressor: { ...tone.compressor!, ratio: x } })} />
                    <Slider label="어택" unit="ms" v={tone.compressor.attack} r={TONE_RANGES.compressor.attack} on={(x) => changeTone({ ...tone, compressor: { ...tone.compressor!, attack: x } })} />
                    <Slider label="릴리스" unit="ms" v={tone.compressor.release} r={TONE_RANGES.compressor.release} on={(x) => changeTone({ ...tone, compressor: { ...tone.compressor!, release: x } })} />
                  </>
                )}
              </ToneGroup>
              <ToneGroup label="스테레오 폭">
                <Slider label="폭" unit="%" v={tone.width} r={TONE_RANGES.width} on={(x) => changeTone({ ...tone, width: x })} />
              </ToneGroup>
              <button type="button" onClick={() => changeTone(FLAT_TONE)} className="rounded-lg border border-slate-700 px-2.5 py-1 text-[10px] text-slate-300 hover:border-slate-500">
                소리 색깔 끄기(음량만)
              </button>
            </div>
          </details>

          <p className="rounded-lg bg-slate-950/60 p-3 text-[11px] leading-relaxed text-slate-400">
            내 PC 엔진이 소리 색깔을 입힌 뒤 음량을 두 번 재서 목표에 맞추고, 피크가 상한을 넘지 않는지 다시 확인해 24bit WAV 새 곡으로 저장합니다. 원곡은 그대로 두며, 그래픽카드를 쓰지 않아 곡 길이에 따라 1~2분 걸립니다.
          </p>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-800 px-5 py-3">
          <button type="button" onClick={onClose} className="rounded-xl px-3 py-2 text-xs text-slate-400 hover:text-slate-200">
            취소
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await onStart(toneOk && !isFlatTone(tone) ? { ...o, tone } : o);
              } finally {
                setBusy(false);
              }
            }}
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2 text-xs font-bold text-white hover:brightness-110 disabled:opacity-40"
          >
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />} 대기열에 넣기
          </button>
        </div>
      </div>
    </div>
  );
}

function ToneGroup({ label, extra, children }: { label: string; extra?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <p className="text-[10px] font-bold text-slate-400">{label}</p>
        {extra && <div className="ml-auto">{extra}</div>}
      </div>
      <div className="grid gap-x-4 gap-y-1.5 sm:grid-cols-2">{children}</div>
    </div>
  );
}

function Slider({ label, unit, v, r, on }: { label: string; unit: string; v: number; r: readonly number[]; on: (x: number) => void }) {
  return (
    <label className="flex items-center gap-2 text-[10px] text-slate-300">
      <span className="w-16 shrink-0">{label}</span>
      <input type="range" min={r[0]} max={r[1]} step={r[2]} value={v} onChange={(e) => on(Number(e.target.value))} className="min-w-0 flex-1 accent-emerald-400" />
      <span className="w-14 shrink-0 text-right tabular-nums text-slate-400">
        {r[2] < 1 ? v.toFixed(1) : Math.round(v)}
        {unit}
      </span>
    </label>
  );
}
