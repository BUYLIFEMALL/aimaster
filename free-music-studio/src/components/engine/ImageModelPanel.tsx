"use client";

// 내 PC 앨범 그림 모델(엔진 0.7.0, 원본 boks-music 「앨범아트 이미지」 설정) — 이 PC 사양에 맞는 판 추천, 받아 둔 판·기본 판·지우기.
// 받기는 곡 만들기 화면에서 처음 그릴 때 자동으로 한다(Stem과 같은 방식).
import { useCallback, useEffect, useState } from "react";
import { FolderCog, ImageIcon, Loader2, RefreshCw, Star, Trash2 } from "lucide-react";
import { EngineError, getImageModels, hasLocalArt, moveImageModelsFolder, removeImageModel, setDefaultImageModel, type EngineStatus, type ImageModelState } from "@/lib/engine";
import { FolderBrowser } from "./FolderBrowser";
import { StageProgress } from "./StageProgress";

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

  // 그림 모델 폴더 바꾸기(엔진 0.7.1+) — 옮기는 동안 2초마다 진행 상황을 읽는다
  const [browsing, setBrowsing] = useState(false);
  const [mode, setMode] = useState<"move" | "fresh">("move");
  const [applying, setApplying] = useState(false);
  const canMove = state?.dir !== undefined;
  const moving = !!state?.moving;
  useEffect(() => {
    if (!moving) return;
    const t = setInterval(async () => {
      try {
        const s = await getImageModels();
        setState(s);
        if (!s.moving) setMessage(s.moveError ? { ok: false, text: s.moveError } : { ok: true, text: `그림 모델 폴더를 바꿨습니다: ${s.dir}` });
      } catch {
        // 다음에
      }
    }, 2000);
    return () => clearInterval(t);
  }, [moving]);
  const applyFolder = async (path: string) => {
    setApplying(true);
    setMessage(null);
    try {
      await moveImageModelsFolder(path, mode);
      setBrowsing(false);
      await load();
    } catch (e) {
      setMessage({ ok: false, text: e instanceof EngineError ? e.message : "폴더를 바꾸지 못했습니다." });
    } finally {
      setApplying(false);
    }
  };

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
          {/* 저장 폴더 — 그림 모델은 판 하나에 5~20GB라 남은 공간이 넉넉한 드라이브에 따로 둘 수 있다(0.7.1+) */}
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/50 px-3 py-2.5 text-xs">
            <span className="text-slate-400">저장 폴더</span>
            <code className="min-w-0 flex-1 break-all font-mono text-[11px] text-slate-200">{state.dir ?? "모델 저장 폴더 안(엔진 0.7.1부터 독립 폴더)"}</code>
            {state.isDefault && <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-300">예전 자리(모델 저장 폴더 안)</span>}
            {canMove && (
              <button
                type="button"
                disabled={moving || !!busy}
                onClick={() => setBrowsing((v) => !v)}
                className="inline-flex items-center gap-1 rounded-lg border border-fuchsia-500/40 px-2.5 py-1 text-[11px] font-semibold text-fuchsia-200 hover:bg-fuchsia-950/40 disabled:opacity-40"
              >
                <FolderCog className="h-3.5 w-3.5" /> 다른 폴더로 바꾸기
              </button>
            )}
          </div>
          {moving && state.moving && (
            <StageProgress stage={`그림 모델 폴더 옮기는 중 · ${gbText(state.moving.done)} / ${gbText(state.moving.total)}`} />
          )}
          {browsing && (
            <FolderBrowser
              start={state.dir ?? ""}
              current={state.dir}
              title="📁 그림 모델을 둘 폴더 고르기 — 고른 폴더 안에 「AIMaster-ImageModels」 폴더를 만들어 그 안에만 둡니다"
              confirmLabel="이 폴더로 바꾸기"
              busy={applying}
              onConfirm={applyFolder}
              onClose={() => setBrowsing(false)}
              onError={(text) => setMessage({ ok: false, text })}
            >
              <div className="space-y-1.5 rounded-lg border border-slate-800 p-2.5 text-xs text-slate-300">
                <label className="flex items-start gap-2">
                  <input type="radio" name="fms-image-move-mode" checked={mode === "move"} onChange={() => setMode("move")} className="mt-0.5 accent-fuchsia-500" />
                  <span>
                    <b className="text-slate-100">받은 그림 모델 옮기기(추천)</b> — 지금까지 받은 엔진·모델을 새 폴더로 복사한 뒤 예전 것을 지웁니다. 다시 받지 않습니다.
                  </span>
                </label>
                <label className="flex items-start gap-2">
                  <input type="radio" name="fms-image-move-mode" checked={mode === "fresh"} onChange={() => setMode("fresh")} className="mt-0.5 accent-fuchsia-500" />
                  <span>
                    <b className="text-slate-100">새로 받기</b> — 예전 폴더의 그림 모델을 지우고, 다음에 그릴 때 새 폴더로 처음부터 받습니다.
                  </span>
                </label>
                <p className="text-[11px] text-slate-500">음악 모델은 그대로 「모델 저장 공간」의 폴더에 남습니다. 옮기는 동안에는 내 PC 그림을 그릴 수 없습니다.</p>
              </div>
            </FolderBrowser>
          )}
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
