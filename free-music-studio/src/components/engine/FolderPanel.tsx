"use client";

import { useState } from "react";
import { FolderOpen, FolderCog, Folder, HardDrive, ArrowUp, Home, FolderPlus, CheckCircle2, AlertCircle, Loader2, X } from "lucide-react";
import {
  EngineError,
  browseFolders,
  hasFolderBrowse,
  hasFolderPicker,
  makeFolder,
  pickFolder,
  revealLibraryFolder,
  setLibraryFolder,
  type EngineStatus,
  type FolderListing,
} from "@/lib/engine";

type Msg = { type: "success" | "error"; text: string } | null;

/**
 * 노래 저장 폴더 — 기본은 PC 「음악\AI 무료음악」.
 * [폴더 바꾸기] → 사이트 안 한글 폴더 고르기(엔진 0.1.3+, PC 표시 언어와 상관없이 한글) → [이 폴더에 저장] 한 번으로 바뀜.
 * 엔진 0.1.2는 윈도우 기본 폴더 창으로 고른 뒤 바로 바꾼다.
 */
export function FolderPanel({ status, onChanged }: { status: EngineStatus | null; onChanged: () => void }) {
  const [listing, setListing] = useState<FolderListing | null>(null);
  const [move, setMove] = useState(true);
  const [busy, setBusy] = useState<"" | "load" | "apply" | "open" | "pick" | "mkdir">("");
  const [newName, setNewName] = useState<string | null>(null);
  const [message, setMessage] = useState<Msg>(null);

  if (!status?.libraryDir) return null;
  const canBrowse = hasFolderBrowse(status);
  const canPick = hasFolderPicker(status);

  const fail = (e: unknown, fallback: string) => setMessage({ type: "error", text: e instanceof EngineError ? e.message : fallback });

  const go = async (path: string) => {
    setBusy("load");
    setNewName(null);
    try {
      setListing(await browseFolders(path));
    } catch (e) {
      fail(e, "폴더를 열지 못했습니다.");
    } finally {
      setBusy("");
    }
  };

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
      setListing(null);
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
    if (canBrowse) {
      // 지금 저장 폴더에서 시작한다(없어졌으면 처음 화면).
      setBusy("load");
      try {
        setListing(await browseFolders(status.libraryDir!).catch(() => browseFolders("")));
      } catch (e) {
        fail(e, "폴더를 열지 못했습니다.");
      } finally {
        setBusy("");
      }
      return;
    }
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

  const createFolder = async () => {
    if (!listing?.path || !newName?.trim()) return;
    setBusy("mkdir");
    try {
      const made = await makeFolder(listing.path, newName.trim());
      setNewName(null);
      await go(made);
    } catch (e) {
      fail(e, "새 폴더를 만들지 못했습니다.");
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
  const row = "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-slate-200 hover:bg-slate-800/70 disabled:opacity-40";
  const atRoot = listing && !listing.path;

  return (
    <section className="space-y-3 rounded-2xl border border-slate-800 bg-[#0a0f1d] p-5">
      <h2 className="flex items-center gap-2 text-sm font-bold text-slate-100">
        <FolderCog className="h-4 w-4 text-emerald-300" /> 노래 저장 폴더
      </h2>
      <p className="break-all rounded-xl border border-slate-700/60 bg-slate-950/80 px-3.5 py-2.5 font-mono text-xs text-slate-200">{status.libraryDir}</p>
      <p className="text-[11px] text-slate-500">만든 노래는 이 폴더에 「곡 제목.mp3」로 저장됩니다. 처음에는 PC 「음악」 폴더 안 「AI 무료음악」입니다.</p>

      {!listing && (
        <div className="flex flex-wrap items-center gap-2">
          {canBrowse || canPick ? (
            <>
              <button type="button" onClick={start} disabled={!!busy} className={`${btn} bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:brightness-110`}>
                {busy === "load" || busy === "pick" || busy === "apply" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FolderCog className="h-4 w-4" />} 폴더 바꾸기
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

      {/* 사이트 안 한글 폴더 고르기 */}
      {listing && (
        <div className="space-y-2 rounded-xl border border-emerald-500/30 bg-slate-950/70 p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-bold text-emerald-200">📁 저장할 폴더 고르기</p>
            <button type="button" onClick={() => setListing(null)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-800" aria-label="닫기">
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="break-all rounded-lg bg-slate-900 px-3 py-2 font-mono text-[11px] text-slate-200">
            {atRoot ? "어디에 저장할까요? 아래에서 폴더를 눌러 들어가세요." : listing.path}
          </p>
          <div className="flex flex-wrap gap-1.5">
            <button type="button" onClick={() => go("")} disabled={!!busy} className={`${btn} border border-slate-700 px-3 py-1.5 text-slate-300 hover:bg-slate-900`}>
              <Home className="h-3.5 w-3.5" /> 처음으로
            </button>
            {listing.parent && (
              <button type="button" onClick={() => go(listing.parent!)} disabled={!!busy} className={`${btn} border border-slate-700 px-3 py-1.5 text-slate-300 hover:bg-slate-900`}>
                <ArrowUp className="h-3.5 w-3.5" /> 위 폴더로
              </button>
            )}
            {!atRoot && (
              <button type="button" onClick={() => setNewName("")} disabled={!!busy} className={`${btn} border border-slate-700 px-3 py-1.5 text-slate-300 hover:bg-slate-900`}>
                <FolderPlus className="h-3.5 w-3.5" /> 새 폴더
              </button>
            )}
          </div>
          {newName !== null && (
            <div className="flex flex-wrap items-center gap-2">
              <input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && createFolder()}
                placeholder="새 폴더 이름"
                maxLength={60}
                className="w-56 rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:border-emerald-400 focus:outline-hidden"
              />
              <button type="button" onClick={createFolder} disabled={!newName.trim() || !!busy} className={`${btn} bg-emerald-700 px-3 py-1.5 text-white`}>
                만들기
              </button>
              <button type="button" onClick={() => setNewName(null)} className="text-[11px] text-slate-400 underline">
                취소
              </button>
            </div>
          )}

          <div className="max-h-72 overflow-y-auto rounded-lg border border-slate-800 p-1">
            {busy === "load" ? (
              <p className="flex items-center gap-2 p-3 text-xs text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin" /> 불러오는 중…
              </p>
            ) : atRoot ? (
              <>
                <p className="px-3 pb-1 pt-2 text-[10px] font-semibold text-slate-500">자주 쓰는 폴더</p>
                {listing.quick?.map((f) => (
                  <button key={f.path} type="button" onClick={() => go(f.path)} className={row}>
                    <Folder className="h-4 w-4 text-amber-300" /> {f.name}
                  </button>
                ))}
                <p className="px-3 pb-1 pt-3 text-[10px] font-semibold text-slate-500">드라이브</p>
                {listing.drives?.map((f) => (
                  <button key={f.path} type="button" onClick={() => go(f.path)} className={row}>
                    <HardDrive className="h-4 w-4 text-sky-300" /> {f.name} <span className="font-mono text-slate-500">{f.path}</span>
                  </button>
                ))}
              </>
            ) : listing.dirs.length === 0 ? (
              <p className="p-3 text-xs text-slate-500">하위 폴더가 없습니다. 이 폴더에 저장하거나 [새 폴더]를 만들어 보세요.</p>
            ) : (
              listing.dirs.map((f) => (
                <button key={f.path} type="button" onClick={() => go(f.path)} className={row}>
                  <Folder className="h-4 w-4 text-amber-300" /> {f.name}
                </button>
              ))
            )}
          </div>

          <label className="flex items-center gap-2 text-xs text-slate-300">
            <input type="checkbox" checked={move} onChange={(e) => setMove(e.target.checked)} className="accent-emerald-500" />
            지금까지 만든 노래도 새 폴더로 옮기기
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => apply(listing.path)}
              disabled={!!busy || atRoot || listing.path === status.libraryDir}
              className={`${btn} bg-emerald-600 text-white hover:brightness-110`}
            >
              {busy === "apply" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} 이 폴더에 저장
            </button>
            <button type="button" onClick={() => setListing(null)} disabled={busy === "apply"} className={`${btn} border border-slate-700 text-slate-400 hover:bg-slate-900`}>
              닫기
            </button>
          </div>
          {listing.path === status.libraryDir && <p className="text-[11px] text-slate-500">지금 저장 폴더입니다. 다른 폴더로 들어가 고르세요.</p>}
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
