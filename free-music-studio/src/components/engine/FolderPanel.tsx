"use client";

import { useState } from "react";
import { FolderOpen, FolderCog, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { EngineError, hasFolderPicker, pickFolder, revealLibraryFolder, setLibraryFolder, type EngineStatus } from "@/lib/engine";

type Msg = { type: "success" | "error"; text: string } | null;

/**
 * 노래 저장 폴더 — 기본은 PC 「음악\AI 무료음악」. [폴더 바꾸기]를 누르면 회원 PC에 폴더 고르기 창이 뜨고,
 * 고른 폴더를 확인한 뒤 바꾼다(기존 노래 옮기기 선택). 브라우저는 실제 경로를 알 수 없어 엔진이 창을 띄운다.
 */
export function FolderPanel({ status, onChanged }: { status: EngineStatus | null; onChanged: () => void }) {
  const [picked, setPicked] = useState<string | null>(null);
  const [move, setMove] = useState(true);
  const [busy, setBusy] = useState<"" | "pick" | "apply" | "open">("");
  const [message, setMessage] = useState<Msg>(null);

  if (!status?.libraryDir) return null;
  const canPick = hasFolderPicker(status);

  const fail = (e: unknown, fallback: string) => setMessage({ type: "error", text: e instanceof EngineError ? e.message : fallback });

  const pick = async () => {
    setBusy("pick");
    setMessage({ type: "success", text: "PC 화면에 「폴더 고르기」 창을 띄웠습니다. 창에서 폴더를 골라 [확인]을 눌러 주세요." });
    try {
      const p = await pickFolder();
      setMessage(null);
      if (p && p !== status.libraryDir) setPicked(p);
      else if (!p) setMessage({ type: "error", text: "폴더 고르기를 취소했습니다." });
    } catch (e) {
      fail(e, "폴더 고르기 창을 띄우지 못했습니다.");
    } finally {
      setBusy("");
    }
  };

  const apply = async () => {
    if (!picked) return;
    setBusy("apply");
    setMessage(null);
    try {
      // 옛 엔진(0.1.1)으로 만든 번호 이름 파일은 곡 제목으로 바꿔 옮기도록 제목 목록을 함께 보낸다.
      const titles: Record<string, string> = {};
      if (move) {
        const data = await fetch("/api/tracks").then((r) => (r.ok ? r.json() : { tracks: [] }));
        for (const t of data.tracks ?? []) titles[t.id] = t.title;
      }
      const r = await setLibraryFolder(picked, move, titles);
      setPicked(null);
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
      <p className="text-[11px] text-slate-500">만든 노래는 이 폴더에 「곡 제목.mp3」로 저장됩니다. 처음에는 PC 「음악」 폴더 안 「AI 무료음악」입니다.</p>

      <div className="flex flex-wrap items-center gap-2">
        {canPick ? (
          <button type="button" onClick={pick} disabled={!!busy} className={`${btn} bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:brightness-110`}>
            {busy === "pick" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FolderCog className="h-4 w-4" />} 폴더 바꾸기
          </button>
        ) : (
          <span className="text-[11px] text-amber-300/80">폴더를 바꾸려면 엔진을 새 버전으로 받아 실행해 주세요.</span>
        )}
        {canPick && (
          <button type="button" onClick={open} disabled={!!busy} className={`${btn} border border-slate-700 text-slate-300 hover:bg-slate-900`}>
            <FolderOpen className="h-4 w-4" /> 폴더 열기
          </button>
        )}
      </div>

      {picked && (
        <div className="space-y-2 rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-3 text-xs text-slate-200">
          <p>
            새 저장 폴더: <span className="break-all font-mono">{picked}</span>
          </p>
          <label className="flex items-center gap-2 text-slate-300">
            <input type="checkbox" checked={move} onChange={(e) => setMove(e.target.checked)} className="accent-emerald-500" />
            지금까지 만든 노래도 새 폴더로 옮기기
          </label>
          <div className="flex gap-2">
            <button type="button" onClick={apply} disabled={!!busy} className={`${btn} bg-emerald-600 text-white hover:brightness-110`}>
              {busy === "apply" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} 이 폴더로 바꾸기
            </button>
            <button type="button" onClick={() => setPicked(null)} disabled={!!busy} className={`${btn} border border-slate-700 text-slate-400 hover:bg-slate-900`}>
              취소
            </button>
          </div>
        </div>
      )}

      {message && (
        <p className={`flex items-center gap-2 text-xs font-semibold ${message.type === "success" ? "text-emerald-300" : "text-rose-300"}`}>
          {message.type === "success" ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />} {message.text}
        </p>
      )}
    </section>
  );
}
