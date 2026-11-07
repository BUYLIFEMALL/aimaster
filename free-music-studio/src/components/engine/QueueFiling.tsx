"use client";

// 작업 대기열 「끝난 작업」에서 바로 정리하기(v1.31, 주인님 「여기에서 바로 프로젝트로 이동 시키는 기능과 플레이리스트로 이동 시키는 기능을 넣어줘」).
// 프로젝트 고르기(곡 하나는 프로젝트 하나 — 「모든 음악」 곡 메뉴와 같은 PATCH) · 플레이리스트에 담기(이미 담겼으면 건너뜀, 뒤에 덧붙임).
import { FolderClosed, ListMusic } from "lucide-react";
import { COLLECTIONS_CHANGED, type Collection } from "@/lib/collections";
import { appendIds } from "@/lib/trackOrder";

const sel = "max-w-[11rem] truncate rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] text-slate-200 focus:border-emerald-400 focus:outline-hidden disabled:opacity-40";

export function QueueFiling({
  trackId,
  projectId,
  projects,
  playlists,
  busy,
  onProject,
  onNotice,
  onError,
}: {
  trackId: string;
  /** 지금 들어 있는 프로젝트(모르면 undefined — 아직 기록 전) */
  projectId: string | null | undefined;
  projects: Collection[];
  playlists: Collection[];
  busy: boolean;
  onProject: (projectId: string | null) => void;
  onNotice: (text: string) => void;
  onError: (text: string) => void;
}) {
  const moveProject = async (value: string) => {
    const next = value || null;
    const res = await fetch(`/api/tracks/${trackId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ project_id: next }) }).catch(() => null);
    if (!res?.ok) return onError((await res?.json().catch(() => ({})))?.error || "프로젝트를 바꾸지 못했습니다.");
    onProject(next);
    window.dispatchEvent(new Event(COLLECTIONS_CHANGED));
    const name = projects.find((p) => p.id === next)?.name;
    onNotice(name ? `「${name}」 프로젝트로 옮겼습니다.` : "프로젝트에서 뺐습니다.");
  };

  const addToPlaylist = async (playlistId: string) => {
    if (!playlistId) return;
    const name = playlists.find((p) => p.id === playlistId)?.name ?? "플레이리스트";
    const cur = await fetch(`/api/collections/${playlistId}/items`).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    if (!cur) return onError("플레이리스트를 읽지 못했습니다.");
    const ids: string[] = cur.track_ids ?? [];
    const next = appendIds(ids, [trackId]);
    if (next.length === ids.length) return onNotice(`「${name}」에 이미 담긴 곡입니다.`);
    const res = await fetch(`/api/collections/${playlistId}/items`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ track_ids: next }) }).catch(() => null);
    if (!res?.ok) return onError((await res?.json().catch(() => ({})))?.error || "플레이리스트에 담지 못했습니다.");
    window.dispatchEvent(new Event(COLLECTIONS_CHANGED));
    onNotice(`「${name}」에 담았습니다.`);
  };

  const off = busy || projectId === undefined;
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <label className="inline-flex items-center gap-1 text-slate-400" title="이 곡을 넣을 프로젝트(곡 하나는 프로젝트 하나)">
        <FolderClosed className="h-3 w-3 text-amber-300" />
        <select aria-label="프로젝트로 옮기기" value={projectId ?? ""} disabled={off} onChange={(e) => void moveProject(e.target.value)} className={sel}>
          <option value="">프로젝트 없음</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
      <label className="inline-flex items-center gap-1 text-slate-400" title="플레이리스트 뒤에 덧붙입니다(여러 목록에 담을 수 있음)">
        <ListMusic className="h-3 w-3 text-sky-300" />
        <select aria-label="플레이리스트에 담기" value="" disabled={off || playlists.length === 0} onChange={(e) => void addToPlaylist(e.target.value)} className={sel}>
          <option value="">{playlists.length ? "플레이리스트에 담기…" : "플레이리스트 없음"}</option>
          {playlists.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
    </span>
  );
}
