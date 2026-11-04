"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Folder, HardDrive, ArrowUp, Home, FolderPlus, CheckCircle2, Loader2, X } from "lucide-react";
import { EngineError, browseFolders, makeFolder, type FolderListing } from "@/lib/engine";

/**
 * 사이트 안 한글 폴더 고르기(엔진 0.1.3+ browse) — 노래 저장 폴더·모델 저장 폴더(0.5.0)가 함께 쓴다.
 * 처음엔 start 폴더(없어졌으면 처음 화면)에서 열고, [confirmLabel]을 누르면 onConfirm(고른 폴더).
 */
export function FolderBrowser({
  start,
  current,
  title,
  confirmLabel,
  busy,
  onConfirm,
  onClose,
  onError,
  children,
}: {
  start: string;
  current?: string;
  title: string;
  confirmLabel: string;
  busy: boolean;
  onConfirm: (path: string) => void;
  onClose: () => void;
  onError: (text: string) => void;
  children?: ReactNode;
}) {
  const [listing, setListing] = useState<FolderListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState<string | null>(null);
  const fail = (e: unknown, fallback: string) => onError(e instanceof EngineError ? e.message : fallback);

  const go = async (path: string) => {
    setLoading(true);
    setNewName(null);
    try {
      setListing(await browseFolders(path));
    } catch (e) {
      fail(e, "폴더를 열지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let alive = true;
    browseFolders(start)
      .catch(() => browseFolders(""))
      .then((l) => alive && setListing(l))
      .catch((e) => alive && fail(e, "폴더를 열지 못했습니다."))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
    // 처음 한 번만 연다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createFolder = async () => {
    if (!listing?.path || !newName?.trim()) return;
    setLoading(true);
    try {
      const made = await makeFolder(listing.path, newName.trim());
      setNewName(null);
      await go(made);
    } catch (e) {
      fail(e, "새 폴더를 만들지 못했습니다.");
      setLoading(false);
    }
  };

  const btn = "inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-semibold disabled:opacity-40";
  const row = "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-slate-200 hover:bg-slate-800/70 disabled:opacity-40";
  const atRoot = !!listing && !listing.path;
  const same = !!listing && !!current && listing.path === current;
  const disabled = loading || busy;

  return (
    <div className="space-y-2 rounded-xl border border-emerald-500/30 bg-slate-950/70 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold text-emerald-200">{title}</p>
        <button type="button" onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-800" aria-label="닫기">
          <X className="h-4 w-4" />
        </button>
      </div>
      <p className="break-all rounded-lg bg-slate-900 px-3 py-2 font-mono text-[11px] text-slate-200">
        {!listing || atRoot ? "어디에 둘까요? 아래에서 폴더를 눌러 들어가세요." : listing.path}
      </p>
      <div className="flex flex-wrap gap-1.5">
        <button type="button" onClick={() => go("")} disabled={disabled} className={`${btn} border border-slate-700 px-3 py-1.5 text-slate-300 hover:bg-slate-900`}>
          <Home className="h-3.5 w-3.5" /> 처음으로
        </button>
        {listing?.parent && (
          <button type="button" onClick={() => go(listing.parent!)} disabled={disabled} className={`${btn} border border-slate-700 px-3 py-1.5 text-slate-300 hover:bg-slate-900`}>
            <ArrowUp className="h-3.5 w-3.5" /> 위 폴더로
          </button>
        )}
        {listing && !atRoot && (
          <button type="button" onClick={() => setNewName("")} disabled={disabled} className={`${btn} border border-slate-700 px-3 py-1.5 text-slate-300 hover:bg-slate-900`}>
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
            onKeyDown={(e) => e.key === "Enter" && !e.nativeEvent.isComposing && createFolder()}
            placeholder="새 폴더 이름"
            maxLength={60}
            className="w-56 rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:border-emerald-400 focus:outline-hidden"
          />
          <button type="button" onClick={createFolder} disabled={!newName.trim() || disabled} className={`${btn} bg-emerald-700 px-3 py-1.5 text-white`}>
            만들기
          </button>
          <button type="button" onClick={() => setNewName(null)} className="text-[11px] text-slate-400 underline">
            취소
          </button>
        </div>
      )}

      <div className="max-h-72 overflow-y-auto rounded-lg border border-slate-800 p-1">
        {loading || !listing ? (
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
          <p className="p-3 text-xs text-slate-500">하위 폴더가 없습니다. 이 폴더를 고르거나 [새 폴더]를 만들어 보세요.</p>
        ) : (
          listing.dirs.map((f) => (
            <button key={f.path} type="button" onClick={() => go(f.path)} className={row}>
              <Folder className="h-4 w-4 text-amber-300" /> {f.name}
            </button>
          ))
        )}
      </div>

      {children}
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => listing && onConfirm(listing.path)} disabled={disabled || !listing || atRoot || same} className={`${btn} bg-emerald-600 text-white hover:brightness-110`}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} {confirmLabel}
        </button>
        <button type="button" onClick={onClose} disabled={busy} className={`${btn} border border-slate-700 text-slate-400 hover:bg-slate-900`}>
          닫기
        </button>
      </div>
      {same && <p className="text-[11px] text-slate-500">지금 쓰는 폴더입니다. 다른 폴더로 들어가 고르세요.</p>}
    </div>
  );
}
