"use client";

// 내 PC 앨범 그림 모델(엔진 0.7.0, 원본 boks-music 「앨범아트 이미지」 설정) — 이 PC 사양에 맞는 판 추천, 받아 둔 판·기본 판·지우기.
// 받기는 곡 만들기 화면에서 처음 그릴 때 자동으로 한다(Stem과 같은 방식).
import { useCallback, useEffect, useState } from "react";
import { ImageIcon, Loader2, RefreshCw, Star, Trash2 } from "lucide-react";
import { EngineError, getImageModels, hasLocalArt, removeImageModel, setDefaultImageModel, type EngineStatus, type ImageModelState } from "@/lib/engine";

const gbText = (b: number) => `${(b / 1024 ** 3).toFixed(1)}GB`;

export function ImageModelPanel({ status }: { status: EngineStatus | null }) {
  const [state, setState] = useState<ImageModelState | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const supported = hasLocalArt(status);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setState(await getImageModels());
    } catch (e) {
      setMessage({ ok: false, text: e instanceof EngineError ? e.message : "그림 모델 목록을 읽지 못했습니다." });
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    if (supported && status?.paired) void load();
  }, [supported, status?.paired, load]);

  if (!status?.paired) return null;

  const act = async (id: string, fn: () => Promise<void>, done: string) => {
    setBusy(id);
    setMessage(null);
    try {
      await fn();
      setMessage({ ok: true, text: done });
      await load();
    } catch (e) {
      setMessage({ ok: false, text: e instanceof EngineError ? e.message : "처리하지 못했습니다." });
    } finally {
      setBusy("");
      setConfirm("");
    }
  };

  return (
    <section className="space-y-3 rounded-2xl border border-fuchsia-500/20 bg-gradient-to-b from-[#0a0f1d] to-[#070b14] p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-bold text-slate-100">
          <ImageIcon className="h-4 w-4 text-fuchsia-300" /> 내 PC 앨범 그림 모델 <span className="text-[11px] font-normal text-slate-400">(API 키 없이 무료 · Apache-2.0)</span>
        </h2>
        {supported && (
          <button type="button" onClick={load} disabled={loading} className="inline-flex items-center gap-1 rounded-lg border border-slate-700 px-2.5 py-1 text-[11px] text-slate-300 hover:bg-slate-900 disabled:opacity-40">
            <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} /> 다시 읽기
          </button>
        )}
      </div>
      {!supported ? (
        <p className="text-xs text-slate-400">엔진 0.7.0 이상에서 쓸 수 있습니다. 위 다운로드 센터에서 새 설치 파일을 받아 주세요.</p>
      ) : !state ? (
        <p className="text-xs text-slate-400">{loading ? "읽는 중…" : "목록이 없습니다."}</p>
      ) : (
        <>
          <p className="text-xs leading-relaxed text-slate-400">
            {state.build ? `실행 방식 ${state.build.label}` : state.reason} · 그래픽 메모리 {state.hardware.gpuGB}GB{state.hardware.unknownVram ? "(확인 불가, 4GB로 봄)" : ""} · 메모리 {state.hardware.ramGB}GB · 남은 공간 {state.hardware.diskGB}GB.
            곡 만들기 화면의 「앨범 그림 만들기」에서 <b className="text-slate-200">내 PC (무료)</b>를 고르면 처음 한 번 엔진·모델을 받고 그립니다. 추천 판은 이 PC 사양으로 고른 것입니다.
          </p>
          {state.families.map((f) => (
            <div key={f.id} className="space-y-1.5 rounded-xl border border-slate-800 bg-slate-950/50 p-3">
              <div className="text-xs font-bold text-slate-100">
                {f.name} <span className="font-normal text-slate-400">· {f.vendor} · {f.license} · {f.parameters} · {f.description}</span>
              </div>
              <ul className="space-y-1">
                {f.variants.map((v) => (
                  <li key={v.id} className={`flex flex-wrap items-center gap-2 text-[11px] ${v.status === "unavailable" ? "text-slate-600" : "text-slate-300"}`}>
                    <span className="w-12 font-mono font-bold">{v.quant}</span>
                    <span className="flex-1 min-w-[12rem]">
                      {v.note} · 권장 그래픽 메모리 {v.recVramGB}GB · {v.installed ? "받아 둠" : `받기 ${gbText(v.downloadBytes)}`}
                      {v.recommended && <span className="ml-1 rounded bg-emerald-900/60 px-1.5 py-0.5 text-[10px] font-bold text-emerald-200">추천</span>}
                      {state.defaultId === v.id && <span className="ml-1 rounded bg-fuchsia-900/60 px-1.5 py-0.5 text-[10px] font-bold text-fuchsia-200">기본</span>}
                      {v.status === "slow" && <span className="ml-1 text-amber-300/80">· 느림: {v.reason}</span>}
                      {v.status === "unavailable" && <span className="ml-1">· 못 씀: {v.reason}</span>}
                    </span>
                    {v.status !== "unavailable" && state.defaultId !== v.id && (
                      <button type="button" disabled={!!busy} onClick={() => act(v.id, () => setDefaultImageModel(v.id), `${f.name} ${v.quant}을(를) 기본 판으로 했습니다.`)} className="inline-flex items-center gap-1 rounded-lg border border-slate-700 px-2 py-1 text-[11px] hover:bg-slate-900 disabled:opacity-40">
                        <Star className="h-3 w-3" /> 기본으로
                      </button>
                    )}
                    {v.installed &&
                      (confirm === v.id ? (
                        <span className="inline-flex items-center gap-1">
                          <button type="button" disabled={busy === v.id} onClick={() => act(v.id, () => removeImageModel(v.id), `${f.name} ${v.quant}을(를) 지웠습니다.`)} className="rounded-lg bg-rose-700 px-2 py-1 text-[11px] font-bold text-white disabled:opacity-40">
                            {busy === v.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "지우기 확인"}
                          </button>
                          <button type="button" onClick={() => setConfirm("")} className="rounded-lg border border-slate-700 px-2 py-1 text-[11px]">
                            취소
                          </button>
                        </span>
                      ) : (
                        <button type="button" disabled={!!busy} onClick={() => setConfirm(v.id)} className="inline-flex items-center gap-1 rounded-lg border border-rose-500/30 px-2 py-1 text-[11px] text-rose-300 hover:bg-rose-950/40 disabled:opacity-40">
                          <Trash2 className="h-3 w-3" /> 지우기
                        </button>
                      ))}
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {message && <p className={`text-[11px] ${message.ok ? "text-emerald-300" : "text-rose-300"}`}>{message.text}</p>}
        </>
      )}
    </section>
  );
}
