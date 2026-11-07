"use client";

import { useState } from "react";
import { Library, FolderClosed, ListMusic, Plus, Trash2 } from "lucide-react";
import type { Collection, CollectionKind } from "@/lib/collections";
import { CollectionOrderList } from "@/components/library/CollectionOrderList";

export type View = { type: "all" } | { type: "trash" } | { type: "project" | "playlist"; id: string };

/** 「모든 음악」 왼쪽 — 모든 음악 / 프로젝트 / 플레이리스트 목록과 새로 만들기(원본 앱 PROJECTS·PLAYLISTS). */
export function CollectionsNav({
  total,
  trashCount = 0,
  projects,
  playlists,
  view,
  onView,
  onCreate,
}: {
  total: number;
  trashCount?: number;
  projects: Collection[];
  playlists: Collection[];
  view: View;
  onView: (v: View) => void;
  onCreate: (kind: CollectionKind, name: string) => Promise<boolean>;
}) {
  const [adding, setAdding] = useState<CollectionKind | null>(null);
  const [name, setName] = useState("");

  const submit = async () => {
    if (!adding || !name.trim()) return;
    if (await onCreate(adding, name)) {
      setAdding(null);
      setName("");
    }
  };

  const item = (active: boolean) =>
    `flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs transition-colors ${
      active ? "bg-emerald-950/60 font-semibold text-emerald-200" : "text-slate-300 hover:bg-slate-900"
    }`;

  const group = (kind: CollectionKind, title: string, list: Collection[]) => (
    <div className="space-y-1">
      <div className="flex items-center justify-between px-1 pt-3">
        <p className="text-[10px] font-bold tracking-wider text-slate-500">{title}</p>
        <button
          type="button"
          onClick={() => {
            setAdding(adding === kind ? null : kind);
            setName("");
          }}
          className="rounded-md p-1 text-slate-400 hover:bg-slate-800 hover:text-emerald-300"
          aria-label={`${title} 만들기`}
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
      {adding === kind && (
        <div className="flex gap-1">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.nativeEvent.isComposing && submit()}
            maxLength={40}
            placeholder={kind === "project" ? "새 프로젝트 이름" : "새 플레이리스트 이름"}
            className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:border-emerald-400 focus:outline-hidden"
          />
          <button type="button" onClick={submit} disabled={!name.trim()} className="rounded-lg bg-emerald-700 px-2.5 text-xs font-semibold text-white disabled:opacity-40">
            만들기
          </button>
        </div>
      )}
      {list.length === 0 && adding !== kind && <p className="px-3 text-[11px] text-slate-600">아직 없습니다. + 로 만드세요.</p>}
      {/* ⠿ 손잡이로 순서 바꾸기(v1.31) — 저장하면 이 화면·좌측 메뉴가 함께 다시 읽는다 */}
      <CollectionOrderList kind={kind} list={list}>
        {(c) => {
          const Icon = kind === "project" ? FolderClosed : ListMusic;
          const active = view.type === kind && view.id === c.id;
          return (
            <button type="button" onClick={() => onView({ type: kind, id: c.id })} className={item(active)}>
              <Icon className={`h-3.5 w-3.5 shrink-0 ${kind === "project" ? "text-amber-300" : "text-sky-300"}`} />
              <span className="min-w-0 flex-1 truncate">{c.name}</span>
              <span className="text-[10px] text-slate-500">{c.count}</span>
            </button>
          );
        }}
      </CollectionOrderList>
    </div>
  );

  return (
    <nav className="space-y-1 rounded-2xl border border-slate-800 bg-[#0a0f1d] p-3 lg:sticky lg:top-4 lg:self-start">
      <button type="button" onClick={() => onView({ type: "all" })} className={item(view.type === "all")}>
        <Library className="h-3.5 w-3.5 shrink-0 text-emerald-300" />
        <span className="flex-1">모든 음악</span>
        <span className="text-[10px] text-slate-500">{total}</span>
      </button>
      {group("project", "프로젝트", projects)}
      {group("playlist", "플레이리스트", playlists)}
      <div className="border-t border-slate-800 pt-2">
        <button type="button" onClick={() => onView({ type: "trash" })} className={item(view.type === "trash")}>
          <Trash2 className="h-3.5 w-3.5 shrink-0 text-rose-300" />
          <span className="flex-1">휴지통</span>
          <span className="text-[10px] text-slate-500">{trashCount}</span>
        </button>
      </div>
    </nav>
  );
}
