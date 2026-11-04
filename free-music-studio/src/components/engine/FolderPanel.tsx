"use client";

import { useState } from "react";
import { FolderOpen, FolderCog, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { EngineError, hasFolderBrowse, hasFolderPicker, pickFolder, revealLibraryFolder, setLibraryFolder, type EngineStatus } from "@/lib/engine";
import { FolderBrowser } from "./FolderBrowser";

type Msg = { type: "success" | "error"; text: string } | null;

/**
 * 노래 저장 폴더 — 기본은 PC 「음악\AI 무료음악」.
 * [폴더 바꾸기] → 사이트 안 한글 폴더 고르기(엔진 0.1.3+, PC 표시 언어와 상관없이 한글, FolderBrowser) → [이 폴더에 저장] 한 번으로 바뀜.
 * 엔진 0.1.2는 윈도우 기본 폴더 창으로 고른 뒤 바로 바꾼다.
 */
export function FolderPanel({ status, onChanged }: { status: EngineStatus | null; onChanged: () => void }) {
  const [browsing, setBrowsing] = useState(false);
  const [move, setMove] = useState(true);
  const [busy, setBusy] = useState<"" | "apply" | "open" | "pick">("");
  const [message, setMessage] = useState<Msg>(null);

  if (!status?.libraryDir) return null;
  const canBrowse = hasFolderBrowse(status);
  const canPick = hasFolderPicker(status);

  const fail = (e: unknown, fallback: string) => setMessage({ type: "error", text: e instanceof EngineError ? e.message : fallback });

  const apply = async (target: string) => {
    setBusy("apply");
    setMessage(null);
    try {
      // 옛 엔진(0.1.1)으로 만든 번호 이름 파일은 곡 제목으로 바꿔 옮기도록 제목 목록을 함께 보낸다.
      const titles: Record<string, string> = {};
      if (move) {
        const data = await fetch("/api/tracks").then((r) => (r.ok ? r.json() : { tracks: [] }));
        for (const t of data.tracks ?? []) titles[t.id] = t.title;
      }
      const r = await setLibraryFolder(target, move, titles);
      setBrowsing(false);
      setMessage({
        type: r.failed ? "error" : "success",
        text: `저장 폴더를 바꿨습니다.${move ? ` 기존 노래 ${r.moved}곡을 옮겼습니다.` : ""}${r.failed ? ` ${r.failed}곡은 옮기지 못해 원래 자리에 남았습니다.` : ""}`,
      });
      onChanged();
    } catch (e) {
      fail(e, "저장 폴더를 바꾸지 못했습니다.");
    } finally {
      setBusy("");
    }
  };

  const start = async () => {
    setMessage(null);
    if (canBrowse) return setBrowsing(true); // 지금 저장 폴더에서 시작한다(없어졌으면 처음 화면)
    // 엔진 0.1.2: 윈도우 기본 폴더 창 → 고르면 바로 바꾼다.
    setBusy("pick");
    setMessage({ type: "success", text: "PC 화면에 폴더 고르기 창을 띄웠습니다. 폴더를 고르면 바로 바뀝니다." });
    try {
      const p = await pickFolder();
      setBusy("");
      if (p && p !== status.libraryDir) await apply(p);
      else setMessage(p ? null : { type: "error", text: "폴더 고르기를 취소했습니다." });
    } catch (e) {
      setBusy("");
      fail(e, "폴더 고르기 창을 띄우지 못했습니다.");
    }
  };

  const open = async () => {
    setBusy("open");
    try {
      await revealLibraryFolder();
    } catch (e) {
      fail(e, "폴더를 열지 못했습니다.");
    } finally {
      setBusy("");
    }
  };

  const btn = "inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-semibold disabled:opacity-40";

  return (
    <section className="space-y-3 rounded-2xl border border-slate-800 bg-[#0a0f1d] p-5">
      <h2 className="flex items-center gap-2 text-sm font-bold text-slate-100">
        <FolderCog className="h-4 w-4 text-emerald-300" /> 노래 저장 폴더
      </h2>
      <p className="break-all rounded-xl border border-slate-700/60 bg-slate-950/80 px-3.5 py-2.5 font-mono text-xs text-slate-200">{status.libraryDir}</p>
      <p className="text-[11px] text-slate-500">
        만든 노래는 이 폴더에 「곡 제목.mp3」로 저장됩니다. 처음에는 PC 「음악」 폴더 안 「AI 무료음악」입니다. 여기서는 <b className="text-slate-300">노래 파일만</b> 옮깁니다 — 음악 엔진 모델(수십 GB)은 아래 「모델 저장 공간」에서 옮깁니다.
      </p>

      {!browsing && (
        <div className="flex flex-wrap items-center gap-2">
          {canBrowse || canPick ? (
            <>
              <button type="button" onClick={start} disabled={!!busy} className={`${btn} bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:brightness-110`}>
                {busy === "pick" || busy === "apply" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FolderCog className="h-4 w-4" />} 폴더 바꾸기
              </button>
              <button type="button" onClick={open} disabled={!!busy} className={`${btn} border border-slate-700 text-slate-300 hover:bg-slate-900`}>
                <FolderOpen className="h-4 w-4" /> 폴더 열기
              </button>
            </>
          ) : (
            <span className="text-[11px] text-amber-300/80">폴더를 바꾸려면 엔진을 새 버전으로 받아 실행해 주세요.</span>
          )}
        </div>
      )}

      {browsing && (
        <FolderBrowser
          start={status.libraryDir}
          current={status.libraryDir}
          title="📁 저장할 폴더 고르기"
          confirmLabel="이 폴더에 저장"
          busy={busy === "apply"}
          onConfirm={apply}
          onClose={() => setBrowsing(false)}
          onError={(text) => setMessage({ type: "error", text })}
        >
          <label className="flex items-center gap-2 text-xs text-slate-300">
            <input type="checkbox" checked={move} onChange={(e) => setMove(e.target.checked)} className="accent-emerald-500" />
            지금까지 만든 노래도 새 폴더로 옮기기
          </label>
        </FolderBrowser>
      )}

      {message && (
        <p className={`flex items-center gap-2 text-xs font-semibold ${message.type === "success" ? "text-emerald-300" : "text-rose-300"}`}>
          {message.type === "success" ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />} {message.text}
        </p>
      )}
    </section>
  );
}
