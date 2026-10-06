"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, Clock, AlertTriangle, ExternalLink, RefreshCw, Trash2, Send } from "lucide-react";

interface PostItem {
  id: string;
  blog_id: string;
  category_name: string;
  title: string;
  status: "draft" | "queued" | "publishing" | "published" | "failed";
  created_at: string;
  published_at?: string;
  post_url?: string;
  error_message?: string;
}

export default function QueuePage() {
  const [posts, setPosts] = useState<PostItem[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem("nba_saved_posts");
    if (saved) {
      try {
        setPosts(JSON.parse(saved));
      } catch {}
    } else {
      const initial: PostItem[] = [
        {
          id: "post-sample-1",
          blog_id: "myblog_sample",
          category_name: "생활정보",
          title: "2026 청년 취업지원금 신청 자격 및 필수 서류 총정리",
          status: "published",
          created_at: new Date(Date.now() - 3600000).toISOString(),
          published_at: new Date().toISOString(),
          post_url: "https://blog.naver.com/myblog_sample/2234567890",
        },
      ];
      setPosts(initial);
      localStorage.setItem("nba_saved_posts", JSON.stringify(initial));
    }
  }, []);

  const savePosts = (items: PostItem[]) => {
    setPosts(items);
    localStorage.setItem("nba_saved_posts", JSON.stringify(items));
  };

  const handlePublishNow = (id: string) => {
    const updated = posts.map((p) => {
      if (p.id === id) {
        return { ...p, status: "queued" as const };
      }
      return p;
    });
    savePosts(updated);
    alert("크롬 확장의 자동 발행 큐에 등록되었습니다! 크롬 브라우저가 열려 있으면 스마트에디터에 자동 입력됩니다.");
  };

  const handleDelete = (id: string) => {
    if (!confirm("원고를 삭제하시겠습니까?")) return;
    const updated = posts.filter((p) => p.id !== id);
    savePosts(updated);
  };

  return (
    <div className="space-y-6">
      {/* 타이틀 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
            발행 대기 큐 & 모니터링
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            생성된 원고의 네이버 스마트에디터 ONE 자동 발행 진행 상태와 결과를 모니터링합니다.
          </p>
        </div>
      </div>

      {/* 상태 요약 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "발행 대기 (Queued)", count: posts.filter((p) => p.status === "queued").length, color: "text-amber-600 bg-amber-50 border-amber-200" },
          { label: "발행 진행 중 (Publishing)", count: posts.filter((p) => p.status === "publishing").length, color: "text-blue-600 bg-blue-50 border-blue-200" },
          { label: "발행 완료 (Published)", count: posts.filter((p) => p.status === "published").length, color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
          { label: "전체 보관 원고", count: posts.length, color: "text-neutral-700 bg-neutral-50 border-neutral-200" },
        ].map((stat, idx) => (
          <div key={idx} className={`p-4 rounded-xl border ${stat.color} flex flex-col justify-between`}>
            <div className="text-xs font-semibold">{stat.label}</div>
            <div className="text-2xl font-bold mt-2">{stat.count}건</div>
          </div>
        ))}
      </div>

      {/* 발행 큐 테이블 */}
      <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
        <div className="p-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
          <div className="font-semibold text-xs text-neutral-700">전체 원고 및 발행 내역</div>
        </div>

        {posts.length === 0 ? (
          <div className="p-12 text-center text-neutral-400 text-xs">
            저장된 원고가 없습니다. [블로그 글 자동 생성] 메뉴에서 첫 글을 생성해보세요.
          </div>
        ) : (
          <div className="divide-y divide-neutral-100">
            {posts.map((post) => (
              <div key={post.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-neutral-50/50 transition-colors">
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-neutral-100 text-neutral-600">
                      {post.blog_id}
                    </span>
                    <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-medium">
                      {post.category_name}
                    </span>
                    {post.status === "published" && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>발행완료</span>
                      </span>
                    )}
                    {post.status === "queued" && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200 animate-pulse">
                        <Clock className="w-3 h-3" />
                        <span>발행대기중</span>
                      </span>
                    )}
                    {post.status === "publishing" && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-blue-700 font-semibold bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        <span>에디터 작성중</span>
                      </span>
                    )}
                    {post.status === "draft" && (
                      <span className="text-[11px] text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded">
                        임시저장
                      </span>
                    )}
                  </div>

                  <div className="font-semibold text-sm text-neutral-900 truncate">
                    {post.title}
                  </div>

                  <div className="text-[11px] text-neutral-400">
                    생성: {new Date(post.created_at).toLocaleString("ko-KR")}
                    {post.published_at && ` · 발행: ${new Date(post.published_at).toLocaleString("ko-KR")}`}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {post.post_url && (
                    <a
                      href={post.post_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-lg border border-neutral-200 text-neutral-700 hover:bg-neutral-100 text-xs font-medium flex items-center gap-1 transition-colors"
                    >
                      <span>블로그 보기</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}

                  {post.status !== "published" && post.status !== "publishing" && (
                    <button
                      onClick={() => handlePublishNow(post.id)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <Send className="w-3 h-3" />
                      <span>{post.status === "queued" ? "대기 재요청" : "크롬으로 발행"}</span>
                    </button>
                  )}

                  <button
                    onClick={() => handleDelete(post.id)}
                    className="p-1.5 text-neutral-400 hover:text-red-600 rounded-lg transition-colors"
                    title="삭제"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
