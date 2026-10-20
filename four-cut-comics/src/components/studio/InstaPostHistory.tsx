"use client";

import { useCallback, useEffect, useState } from "react";
import { X } from "lucide-react";
import { formatKst } from "@/lib/instagram/schedule";
import { markCanceled, postTimeLabel, useScheduledPostCancel } from "@/lib/instagram/postsClient";

// v1.19 최근 인스타 게시 기록(30일) — 게시 칸(InstaDirectPublish)과 내 작품 「📤 인스타그램 예약」이 같이 쓴다.
// v1.18에서 InstaDirectPublish 안에 있던 목록을 그대로 옮기고, 예약 대기 요약(n건·다음 게시)을 위에 붙였다. refreshKey가 바뀌면 다시 불러온다.

interface PostRow {
  id: string;
  title: string;
  page_count: number;
  status: "scheduled" | "publishing" | "published" | "failed" | "canceled";
  scheduled_at: string | null;
  published_at: string | null;
  permalink: string | null;
  ig_username: string | null;
  error_message: string | null;
  created_at: string;
}
const STATUS_LABEL: Record<PostRow["status"], { text: string; color: string }> = {
  scheduled: { text: "예약됨", color: "#0284c7" },
  publishing: { text: "게시 중", color: "#d97706" },
  published: { text: "게시됨", color: "#059669" },
  failed: { text: "실패", color: "#dc2626" },
  canceled: { text: "취소", color: "#64748b" },
};

export function InstaPostHistory({ refreshKey = 0, onPendingChange, emptyText }: { refreshKey?: number; onPendingChange?: (n: number) => void; emptyText?: string }) {
  const [posts, setPosts] = useState<PostRow[] | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/instagram/posts", { cache: "no-store" });
      const d = await r.json();
      if (r.ok) setPosts(d.posts ?? []);
    } catch {
      /* 기록을 못 불러와도 다른 기능은 쓸 수 있다 */
    }
  }, []);
  useEffect(() => { void load(); }, [load, refreshKey]);

  const pending = (posts ?? []).filter((p) => p.status === "scheduled" && p.scheduled_at).sort((a, b) => Date.parse(a.scheduled_at!) - Date.parse(b.scheduled_at!));
  useEffect(() => { if (posts) onPendingChange?.(pending.length); }, [posts, pending.length, onPendingChange]);

  // 예약 취소(취소 중 다른 버튼 막기·성공 즉시 「취소」 표시) — 공용 postsClient
  const { canceling, cancel } = useScheduledPostCancel("/api/instagram/posts", { onCanceled: (id) => setPosts((cur) => cur && markCanceled(cur, id)), onError: setError, onSettled: () => void load() });

  if (!posts) return null;
  if (posts.length === 0) return emptyText ? <small className="muted">{emptyText}</small> : null;
  return (
    <div style={{ borderTop: "1px solid var(--line)", paddingTop: 8 }}>
      <b style={{ fontSize: 12 }}>최근 인스타 게시 기록 (30일)</b>{" "}
      {pending.length > 0 && <small style={{ color: "#0284c7" }} role="status">· ⏰ 예약 {pending.length}건 대기 · 다음 게시 {formatKst(pending[0].scheduled_at)}</small>}
      {error && <small style={{ display: "block", color: "#dc2626" }} role="alert">{error}</small>}
      <ul style={{ listStyle: "none", margin: "6px 0 0", padding: 0, display: "grid", gap: 4, maxHeight: 240, overflowY: "auto" }} aria-label="인스타 게시 기록">
        {posts.map((p) => (
          <li key={p.id} style={{ fontSize: 12, background: "#fff", border: "1px solid var(--line)", borderRadius: 8, padding: "6px 8px" }}>
            <div className="actions" style={{ gap: 6 }}>
              <b style={{ color: STATUS_LABEL[p.status].color }}>{STATUS_LABEL[p.status].text}</b>
              <span>{postTimeLabel(p)}</span>
              <span className="muted">· {p.page_count}장{p.ig_username ? ` · @${p.ig_username}` : ""}</span>
              {p.permalink && <a href={p.permalink} target="_blank" rel="noopener noreferrer">게시물 보기</a>}
              {p.status === "scheduled" && <button type="button" style={{ marginLeft: "auto", padding: "2px 8px" }} disabled={!!canceling} onClick={() => void cancel(p.id)}><X size={12} />{canceling === p.id ? "취소하는 중..." : "예약 취소"}</button>}
            </div>
            {p.title && <small className="muted" style={{ display: "block" }}>{p.title}</small>}
            {p.error_message && <small style={{ display: "block", color: p.status === "failed" ? "#dc2626" : p.status === "scheduled" ? "#d97706" : "#64748b" }}>{p.status === "published" ? "ℹ️ " : ""}{p.error_message}</small>}
          </li>
        ))}
      </ul>
    </div>
  );
}
