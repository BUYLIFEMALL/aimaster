"use client";

// 좌측 메뉴의 프로젝트·플레이리스트 목록 — 원본 boks-music `src/App.tsx`(MIT, © 2026 boksajang)처럼 묶음별로 접고 펼치며 곡 수를 보여 준다(2026-11-06).
// 접힘 상태는 이 브라우저에만 기억한다. 화면을 옮길 때마다 목록을 다시 읽는다(곡 수가 바뀌므로).
import { useEffect, useState, type DragEvent } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, FolderClosed, ListMusic } from "lucide-react";
import { COLLECTIONS_CHANGED, TRACK_DRAG_TYPE, TRACKS_DROPPED, libraryHref, type Collection, type CollectionKind, type TracksDropped } from "@/lib/collections";
import { CollectionOrderList } from "@/components/library/CollectionOrderList";

const FOLD_KEY = "fms.sidebarFold";

export function SidebarCollections({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const [lists, setLists] = useState<{ project: Collection[]; playlist: Collection[] }>({ project: [], playlist: [] });
  const [fold, setFold] = useState<Record<CollectionKind, boolean>>({ project: false, playlist: false });

  useEffect(() => {
    try {
      const f = JSON.parse(localStorage.getItem(FOLD_KEY) ?? "{}");
      setFold({ project: !!f.project, playlist: !!f.playlist });
    } catch {}
  }, []);
  useEffect(() => {
    const load = () =>
      fetch("/api/collections")
        .then((r) => (r.ok ? r.json() : null))
        .then((d: { projects?: Collection[]; playlists?: Collection[] } | null) => d && setLists({ project: d.projects ?? [], playlist: d.playlists ?? [] }))
        .catch(() => {});
    load();
    // 다른 화면에서 순서·이름을 바꾸면 다시 읽는다(v1.31)
    window.addEventListener(COLLECTIONS_CHANGED, load);
    return () => window.removeEventListener(COLLECTIONS_CHANGED, load);
  }, [pathname]);

  // 「모든 음악」의 곡 줄을 여기에 놓으면 그 화면이 옮기기·담기를 한다(v1.35, 주인님 「안되는것 같아」 — 이 목록은 놓기를 받지 않았음)
  const [dropOn, setDropOn] = useState("");
  const dropProps = (kind: CollectionKind, id: string) => ({
    onDragOver: (e: DragEvent) => {
      if (!e.dataTransfer.types.includes(TRACK_DRAG_TYPE)) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = kind === "project" ? "move" : "copy";
      if (dropOn !== id) setDropOn(id);
    },
    onDragLeave: () => setDropOn((d) => (d === id ? "" : d)),
    onDrop: (e: DragEvent) => {
      setDropOn("");
      let ids: unknown;
      try {
        ids = JSON.parse(e.dataTransfer.getData(TRACK_DRAG_TYPE));
      } catch {
        return;
      }
      if (!Array.isArray(ids) || !ids.length) return;
      e.preventDefault();
      const detail: TracksDropped = { kind, id, ids: ids.filter((x): x is string => typeof x === "string") };
      window.dispatchEvent(new CustomEvent(TRACKS_DROPPED, { detail }));
    },
  });

  const toggle = (k: CollectionKind) =>
    setFold((f) => {
      const n = { ...f, [k]: !f[k] };
      try {
        localStorage.setItem(FOLD_KEY, JSON.stringify(n));
      } catch {}
      return n;
    });

  const group = (k: CollectionKind, title: string) => {
    const list = lists[k];
    const Icon = k === "project" ? FolderClosed : ListMusic;
    return (
      <div>
        <button type="button" onClick={() => toggle(k)} aria-expanded={!fold[k]} className="flex w-full items-center gap-1.5 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-200">
          <ChevronDown size={12} className={`transition-transform ${fold[k] ? "-rotate-90" : ""}`} />
          {title}
          <span className="ml-auto font-mono normal-case text-slate-500">{list.length}</span>
        </button>
        {!fold[k] && (
          <div className="pb-1">
            {list.length === 0 && <p className="px-3 py-1 text-[11px] text-slate-600">아직 없습니다</p>}
            <CollectionOrderList kind={k} list={list} onSaved={(next) => setLists((l) => ({ ...l, [k]: next }))}>
              {(c) => (
                <Link
                  href={libraryHref(k, c.id)}
                  onClick={onNavigate}
                  {...dropProps(k, c.id)}
                  className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-slate-300 hover:bg-[#0e1424] hover:text-white ${dropOn === c.id ? "bg-emerald-900/50 ring-2 ring-emerald-400" : ""}`}
                >
                  <Icon size={13} className={k === "project" ? "shrink-0 text-amber-300" : "shrink-0 text-sky-300"} />
                  <span className="min-w-0 flex-1 truncate">{c.name}</span>
                  <span className="font-mono text-[10px] text-slate-500">{c.count}</span>
                </Link>
              )}
            </CollectionOrderList>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="mt-4 space-y-1 border-t border-[#1e293b] pt-3">
      {group("project", "프로젝트")}
      {group("playlist", "플레이리스트")}
    </div>
  );
}
