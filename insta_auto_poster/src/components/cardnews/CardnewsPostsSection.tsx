"use client";

// 「게시글 관리」 안 카드뉴스 예약·게시 기록(v1.37, 병합 2단계) — 카드뉴스 스튜디오에서 올린 글(`cns_insta_posts`)을
// 피드 글과 같은 화면에서 보고 예약을 취소한다. 조회·취소는 카드뉴스 API(`/api/cardnews/instagram/posts`, 회원 본인 글만) 그대로.
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { markCanceled, postTimeLabel, useScheduledPostCancel, type InstaPostStatus } from "@/lib/cardnews/instagram/postsClient";

interface CardnewsPost {
  id: string;
  title: string;
  page_count: number;
  status: InstaPostStatus;
  scheduled_at: string | null;
  published_at: string | null;
  permalink: string | null;
  ig_username: string | null;
  error_message: string | null;
  created_at: string;
}

const STATUS: Record<InstaPostStatus, { text: string; cls: string }> = {
  scheduled: { text: "예약됨", cls: "bg-sky-500/15 text-sky-300" },
  publishing: { text: "게시 중", cls: "bg-amber-500/15 text-amber-300" },
  published: { text: "게시됨", cls: "bg-emerald-500/15 text-emerald-300" },
  failed: { text: "실패", cls: "bg-red-500/15 text-red-300" },
  canceled: { text: "취소", cls: "bg-slate-500/15 text-slate-400" },
};

export function CardnewsPostsSection() {
  const [posts, setPosts] = useState<CardnewsPost[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/cardnews/instagram/posts", { cache: "no-store" });
      const d = await r.json();
      if (r.ok) setPosts(d.posts ?? []);
      else setError(d.error ?? "카드뉴스 게시 기록을 불러오지 못했습니다.");
    } catch {
      setError("카드뉴스 게시 기록을 불러오지 못했습니다.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const { canceling, cancel } = useScheduledPostCancel("/api/cardnews/instagram/posts", {
    onCanceled: (id) => setPosts((cur) => (cur ? markCanceled(cur, id) : cur)),
    onError: (m) => setError(m || null),
    onSettled: () => void load(),
  });

  const pending = posts?.filter((p) => p.status === "scheduled").length ?? 0;

  return (
    <section className="mt-8">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-slate-100">
          🎨 카드뉴스 예약·게시 기록 {pending > 0 && <span className="text-sm font-medium text-sky-400">(예약 {pending}건 대기)</span>}
        </h2>
        <Link href="/cardnews" className="text-xs font-medium text-pink-400 hover:underline">
          카드뉴스 스튜디오 열기 →
        </Link>
      </div>
      {error && <p className="mb-2 text-xs text-red-400">{error}</p>}
      <div className="rounded-lg border border-neutral-200 bg-white">
        {posts === null ? (
          <p className="p-4 text-sm text-neutral-500">불러오는 중...</p>
        ) : posts.length === 0 ? (
          <p className="p-4 text-sm text-neutral-500">카드뉴스 스튜디오에서 게시하거나 예약한 기록이 없습니다(최근 30건까지 표시).</p>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {posts.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-2 p-4 text-xs text-neutral-500">
                <span className={`rounded-full px-2 py-0.5 font-bold ${STATUS[p.status].cls}`}>{STATUS[p.status].text}</span>
                <span className="min-w-0 flex-1 truncate text-sm text-neutral-900">{p.title || "카드뉴스"}</span>
                <span>{postTimeLabel(p)}</span>
                <span>· {p.page_count}장{p.ig_username ? ` · @${p.ig_username}` : ""}</span>
                {p.permalink && (
                  <a href={p.permalink} target="_blank" rel="noreferrer" className="font-bold text-pink-400 underline">
                    게시물 보기
                  </a>
                )}
                {p.status === "scheduled" && (
                  <button
                    type="button"
                    disabled={!!canceling}
                    onClick={() => void cancel(p.id)}
                    className="min-h-[32px] rounded-md border border-neutral-200 px-2.5 py-1 font-medium text-neutral-600 hover:bg-neutral-100 disabled:opacity-50"
                  >
                    {canceling === p.id ? "취소하는 중..." : "예약 취소"}
                  </button>
                )}
                {(p.status === "failed" || p.status === "scheduled") && p.error_message && (
                  <span className={`w-full ${p.status === "failed" ? "text-red-400" : "text-amber-400"}`}>{p.error_message}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
