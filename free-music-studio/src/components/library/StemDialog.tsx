"use client";

// Stem 분리 창 — 원본 boks-music `src/App.tsx` StemPopup(MIT, © 2026 boksajang)을 옮김(2026-11-06):
// 결과가 없으면 「어떻게 분리할까요?」(2트랙·6트랙), 있으면 방식별 최근 결과(트랙마다 듣기·내려받기, 여러 개 골라 내려받기), 다시 분리하기.
// 분리는 회원 PC 엔진이 대기열에서 하고, 결과 WAV는 노래 저장 폴더 「Stem」에만 둔다(서버로 보내지 않음).
import { useCallback, useEffect, useRef, useState } from "react";
import { Download, Layers, Loader2, Play, Trash2, X } from "lucide-react";
import { EngineError, STEM_MODE_LABEL, deleteStems, fetchStemFile, listStems, type StemBatch, type StemMode } from "@/lib/engine";

/** 내려받을 파일 이름(윈도우에서 못 쓰는 글자 제거) */
const safeName = (s: string) => s.replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_").trim().slice(0, 60) || "노래";
const size = (b: number) => `${Math.max(1, Math.round(b / 1024 ** 2))}MB`;

export function StemDialog({ track, onClose, onStart }: { track: { id: string; title: string }; onClose: () => void; onStart: (mode: StemMode) => Promise<void> }) {
  const [batches, setBatches] = useState<StemBatch[] | null>(null);
  const [choosing, setChoosing] = useState(false);
  const [mode, setMode] = useState<StemMode>("two");
  const [audio, setAudio] = useState<Record<string, string>>({});
  const [picked, setPicked] = useState<number[]>([]);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const urls = useRef<string[]>([]);
  useEffect(() => () => urls.current.forEach((u) => URL.revokeObjectURL(u)), []);

  const load = useCallback(async () => {
    try {
      const list = await listStems(track.id);
      setBatches(list);
      if (!list.length) setChoosing(true);
      else setMode(list[0].mode);
    } catch (e) {
      setError(e instanceof EngineError ? e.message : "분리 결과를 읽지 못했습니다.");
      setBatches([]);
      setChoosing(true);
    }
  }, [track.id]);
  useEffect(() => {
    void load();
  }, [load]);

  const batch = batches?.find((b) => b.mode === mode) ?? null; // 방식별 가장 최근 결과
  useEffect(() => setPicked(batch ? batch.files.map((_, i) => i).filter((i) => !batch.files[i].missing) : []), [batch?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const url = async (b: StemBatch, n: number) => {
    const key = `${b.id}:${n}`;
    if (audio[key]) return audio[key];
    const u = await fetchStemFile(track.id, b.id, n);
    urls.current.push(u);
    setAudio((a) => ({ ...a, [key]: u }));
    return u;
  };
  const act = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(e instanceof EngineError ? e.message : "처리하지 못했습니다.");
    } finally {
      setBusy("");
    }
  };
  const save = (u: string, label: string) => {
    const a = document.createElement("a");
    a.href = u;
    a.download = `${safeName(track.title)} - ${label}.wav`;
    a.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => !busy && onClose()}>
      <div role="dialog" aria-label="Stem 분리" onClick={(e) => e.stopPropagation()} className="max-h-[90vh] w-full max-w-lg space-y-4 overflow-y-auto rounded-2xl border border-slate-700 bg-[#0a0f1d] p-5 shadow-2xl">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-emerald-300" />
          <p className="min-w-0 flex-1 truncate text-sm font-bold text-slate-100">Stem 분리 — {track.title}</p>
          <button type="button" onClick={onClose} aria-label="닫기" className="rounded-full p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        {batches === null ? (
          <p className="text-xs text-slate-500">불러오는 중…</p>
        ) : choosing ? (
          <>
            <p className="text-xs font-semibold text-slate-300">어떻게 분리할까요?</p>
            <div className="space-y-2">
              {(["two", "multi"] as StemMode[]).map((m) => (
                <label key={m} className={`flex cursor-pointer items-start gap-2.5 rounded-xl border p-3 text-xs ${mode === m ? "border-emerald-400 bg-emerald-950/30" : "border-slate-800 hover:border-slate-600"}`}>
                  <input type="radio" name="stem-mode" checked={mode === m} onChange={() => setMode(m)} className="mt-0.5 accent-emerald-500" />
                  <span>
                    <span className="block font-bold text-slate-100">{STEM_MODE_LABEL[m]}</span>
                    <span className="mt-0.5 block text-[11px] text-slate-400">
                      {m === "two" ? "노래방 반주·보컬만 듣기에. BS-RoFormer(처음 한 번 약 640MB 받기)." : "악기별로 나눠 다시 섞기·연습용. BS-RoFormer SW 6트랙(처음 한 번 약 700MB 받기, 배포처에 이용 조건 표기 없음)."}
                    </span>
                  </span>
                </label>
              ))}
            </div>
            <p className="rounded-lg bg-slate-950/60 p-3 text-[11px] leading-relaxed text-slate-400">
              내 PC 엔진이 대기열에서 나눕니다. 처음에는 분리 프로그램(약 1.5~5.5GB)을 받습니다. NVIDIA 그래픽 메모리 4GB 이상이면 그래픽카드로 1분 안팎, 없으면 CPU로 곡 길이에 따라 몇 분 걸립니다. 결과는 노래 저장 폴더 「Stem」에 WAV로 저장됩니다.
            </p>
            <div className="flex justify-end gap-2">
              {!!batches.length && (
                <button type="button" onClick={() => setChoosing(false)} className="rounded-xl px-3 py-2 text-xs text-slate-400 hover:text-slate-200">
                  결과로 돌아가기
                </button>
              )}
              <button
                type="button"
                disabled={!!busy}
                onClick={() => act("start", () => onStart(mode))}
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2 text-xs font-bold text-white hover:brightness-110 disabled:opacity-40"
              >
                {busy === "start" && <Loader2 className="h-3.5 w-3.5 animate-spin" />} 대기열에 넣기
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex gap-1.5">
              {(["two", "multi"] as StemMode[]).map((m) => (
                <button key={m} type="button" disabled={!batches.some((b) => b.mode === m)} onClick={() => setMode(m)} className={`rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold disabled:opacity-30 ${mode === m ? "border-emerald-400 text-emerald-200" : "border-slate-700 text-slate-400"}`}>
                  {m === "two" ? "2트랙" : "6트랙"}
                </button>
              ))}
              <span className="ml-auto self-center text-[10px] text-slate-500">{batch ? `${new Date(batch.createdAt).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })} · ${batch.device === "cuda" ? "그래픽카드" : "CPU"}` : ""}</span>
            </div>
            {batch && (
              <ul className="space-y-2">
                {batch.files.map((f, n) => {
                  const key = `${batch.id}:${n}`;
                  return (
                    <li key={key} className="space-y-1.5 rounded-xl border border-slate-800 bg-slate-950/60 p-2.5 text-xs">
                      <div className="flex items-center gap-2">
                        <input type="checkbox" aria-label={`${f.label} 고르기`} disabled={f.missing} checked={picked.includes(n)} onChange={(e) => setPicked((p) => (e.target.checked ? [...p, n] : p.filter((x) => x !== n)))} className="accent-emerald-500" />
                        <span className="font-semibold text-slate-100">{f.label}</span>
                        <span className="text-[10px] text-slate-500">{f.missing ? "파일 없음(옮기거나 지움)" : size(f.size)}</span>
                        {!f.missing && (
                          <span className="ml-auto flex gap-1.5">
                            {!audio[key] && (
                              <button type="button" disabled={!!busy} onClick={() => act(key, async () => void (await url(batch, n)))} className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/40 px-2 py-1 text-[11px] text-emerald-300 hover:bg-emerald-950/40 disabled:opacity-40">
                                {busy === key ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />} 듣기
                              </button>
                            )}
                            <button type="button" disabled={!!busy} aria-label={`${f.label} 내려받기`} onClick={() => act(`d${key}`, async () => save(await url(batch, n), f.label))} className="rounded-lg border border-slate-700 p-1 text-slate-300 hover:bg-slate-900 disabled:opacity-40">
                              <Download className="h-3.5 w-3.5" />
                            </button>
                          </span>
                        )}
                      </div>
                      {audio[key] && <audio controls src={audio[key]} className="h-8 w-full" />}
                    </li>
                  );
                })}
              </ul>
            )}
            {batch && <p className="truncate text-[10px] text-slate-500" title={batch.dir}>저장 위치: {batch.dir}</p>}
            {error && <p className="text-[11px] font-semibold text-rose-300">{error}</p>}
            <div className="flex flex-wrap justify-end gap-2">
              {batch && (
                <button type="button" disabled={!!busy} onClick={() => act("del", async () => (await deleteStems(track.id, batch.id), await load()))} className="mr-auto inline-flex items-center gap-1 rounded-xl px-2.5 py-2 text-[11px] text-slate-500 hover:text-rose-300 disabled:opacity-40">
                  <Trash2 className="h-3.5 w-3.5" /> 이 결과 지우기
                </button>
              )}
              <button type="button" onClick={() => setChoosing(true)} className="rounded-xl border border-slate-700 px-3 py-2 text-xs text-slate-300 hover:bg-slate-900">
                다시 분리하기
              </button>
              {batch && (
                <button
                  type="button"
                  disabled={!!busy || !picked.length}
                  onClick={() => act("all", async () => { for (const n of picked) save(await url(batch, n), batch.files[n].label); })}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2 text-xs font-bold text-white hover:brightness-110 disabled:opacity-40"
                >
                  {busy === "all" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />} 고른 {picked.length}개 내려받기
                </button>
              )}
            </div>
          </>
        )}
        {choosing && error && <p className="text-[11px] font-semibold text-rose-300">{error}</p>}
      </div>
    </div>
  );
}
