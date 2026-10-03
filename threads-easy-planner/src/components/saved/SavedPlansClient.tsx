"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { SavedThreadPlan } from "@/types/planner";
import {
  loadPlansFromStorage,
  deletePlanFromStorage,
} from "@/lib/storage/savedPlansStorage";

export function SavedPlansClient() {
  const router = useRouter();
  const [plans, setPlans] = useState<SavedThreadPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [copyToast, setCopyToast] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPlans() {
      setIsLoading(true);
      try {
        const list = await loadPlansFromStorage();
        setPlans(list);
      } finally {
        setIsLoading(false);
      }
    }
    fetchPlans();
  }, []);

  function showToast(msg: string) {
    setCopyToast(msg);
    setTimeout(() => {
      setCopyToast(null);
    }, 2500);
  }

  function handleCopy(text: string, label: string) {
    navigator.clipboard.writeText(text);
    showToast(`📋 ${label} 클립보드에 복사되었습니다!`);
  }

  async function handleDelete(id: string) {
    if (!confirm("정말 이 콘텐츠를 보관함에서 삭제하시겠습니까?")) return;
    setDeletingId(id);
    try {
      await deletePlanFromStorage(id);
      setPlans((prev) => prev.filter((p) => p.id !== id));
      showToast("🗑️ 보관함에서 삭제되었습니다.");
    } finally {
      setDeletingId(null);
    }
  }

  function handleLoadIntoEditor(plan: SavedThreadPlan) {
    // sessionStorage에 해당 글 데이터 임시 저장 후 에디터로 이동 (즉시 로드 지원)
    if (typeof window !== "undefined") {
      sessionStorage.setItem("tep_load_plan", JSON.stringify(plan));
    }
    router.push(`/?load=${plan.id}`);
  }

  // 검색 필터링
  const filteredPlans = plans.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.topic.toLowerCase().includes(q) ||
      p.hook.toLowerCase().includes(q) ||
      p.body_text.toLowerCase().includes(q) ||
      (p.persona_name && p.persona_name.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* 토스트 알림 */}
      {copyToast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-2xl bg-neutral-900 px-5 py-3 text-sm font-bold text-white shadow-xl animate-in slide-in-from-bottom-2 duration-150">
          {copyToast}
        </div>
      )}

      {/* 헤더 섹션 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200/80 pb-5">
        <div>
          <div className="inline-flex items-center gap-2 mb-1">
            <span className="text-xl">📁</span>
            <h1 className="text-xl md:text-2xl font-black text-neutral-900 tracking-tight">
              내 콘텐츠 보관함
            </h1>
            <span className="rounded-full bg-neutral-900 text-white text-xs font-bold px-2.5 py-0.5 ml-1">
              {plans.length}건
            </span>
          </div>
          <p className="text-xs md:text-sm text-neutral-500">
            마음에 드는 스레드 글을 보관해두고, 언제든 다시 불러와 수정하거나 복사해 활용하세요.
          </p>
        </div>

        <Link
          href="/"
          className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-neutral-900 hover:bg-black text-white px-5 py-3 text-xs md:text-sm font-bold transition-all shadow-sm active:scale-95 shrink-0"
        >
          <span>✍️</span>
          <span>새 글 기획하러 가기</span>
        </Link>
      </div>

      {/* 검색 및 필터 바 */}
      {plans.length > 0 && (
        <div className="flex items-center gap-2.5 bg-white p-3 rounded-2xl border border-neutral-200 shadow-2xs">
          <span className="text-neutral-400 pl-1 text-sm">🔍</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="주제, 후킹 문장, 본문 키워드로 검색해보세요..."
            className="w-full text-xs md:text-sm text-neutral-900 bg-transparent focus:outline-none placeholder:text-neutral-400"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="text-xs text-neutral-400 hover:text-neutral-700 px-2 cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>
      )}

      {/* 로딩 인디케이터 */}
      {isLoading ? (
        <div className="py-20 text-center space-y-3 bg-white rounded-3xl border border-neutral-200">
          <div className="inline-block animate-spin text-3xl">🌀</div>
          <p className="text-sm font-bold text-neutral-600">
            보관함 콘텐츠를 불러오고 있습니다...
          </p>
        </div>
      ) : plans.length === 0 ? (
        /* 빈 화면 */
        <div className="rounded-3xl border border-dashed border-neutral-300 bg-white p-12 md:p-16 text-center space-y-4 shadow-xs">
          <div className="text-5xl">📭</div>
          <div className="space-y-1">
            <h3 className="text-base md:text-lg font-extrabold text-neutral-900">
              아직 보관된 콘텐츠가 없습니다
            </h3>
            <p className="text-xs md:text-sm text-neutral-500 max-w-md mx-auto leading-relaxed">
              스레드 AI 기획기에서 글을 생성한 후 결과 카드 상단의 <strong>&apos;💾 보관함에 저장&apos;</strong> 버튼을 누르면 이곳에 안전하게 보관됩니다.
            </p>
          </div>
          <div className="pt-2">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold px-6 py-3.5 text-xs md:text-sm shadow-sm transition-all active:scale-95"
            >
              <span>🎲</span>
              <span>지금 첫 글 기획하고 저장하기</span>
            </Link>
          </div>
        </div>
      ) : filteredPlans.length === 0 ? (
        /* 검색 결과 없음 */
        <div className="rounded-3xl bg-white border border-neutral-200 p-12 text-center space-y-2">
          <div className="text-3xl">🔎</div>
          <p className="text-sm font-bold text-neutral-800">
            &apos;{searchQuery}&apos; 검색 결과가 없습니다.
          </p>
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className="text-xs text-amber-600 hover:text-amber-800 underline font-semibold cursor-pointer"
          >
            전체 목록 다시 보기
          </button>
        </div>
      ) : (
        /* 저장된 글 목록 카드 그리드 */
        <div className="grid grid-cols-1 gap-4">
          {filteredPlans.map((plan) => {
            const isExpanded = expandedId === plan.id;
            const formattedDate = new Date(plan.created_at).toLocaleString("ko-KR", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            });

            const fullPostText = `[후킹]\n${plan.hook}\n\n[본문]\n${plan.body_text}\n\n[댓글/CTA]\n${plan.reply_cta}`;

            return (
              <div
                key={plan.id}
                className="rounded-3xl bg-white border border-neutral-200 shadow-2xs hover:shadow-sm transition-all overflow-hidden p-5 md:p-6 space-y-4"
              >
                {/* 카드 상단 메타 헤더 */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-100 pb-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-medium text-neutral-400">
                      {formattedDate}
                    </span>
                    {plan.persona_name && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[11px] font-bold">
                        🎭 {plan.persona_name}
                      </span>
                    )}
                    {plan.model_label && (
                      <span className="px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600 text-[11px] font-medium">
                        ⚡ {plan.model_label}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* 에디터로 불러와서 수정하기 버튼 (핵심 기능) */}
                    <button
                      type="button"
                      onClick={() => handleLoadIntoEditor(plan)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-black text-white text-xs font-bold transition-all shadow-2xs active:scale-95 cursor-pointer"
                      title="메인 에디터로 불러와서 바로 수정하고 리라이팅합니다"
                    >
                      <span>✏️</span>
                      <span>에디터로 불러와 수정하기</span>
                    </button>

                    {/* 전체 복사 버튼 */}
                    <button
                      type="button"
                      onClick={() => handleCopy(fullPostText, "전체 글(후킹+본문+댓글)이")}
                      className="px-2.5 py-1.5 rounded-xl border border-neutral-200 hover:bg-neutral-100 text-neutral-700 text-xs font-semibold transition-colors cursor-pointer"
                      title="전체 복사"
                    >
                      📋 복사
                    </button>

                    {/* 삭제 버튼 */}
                    <button
                      type="button"
                      disabled={deletingId === plan.id}
                      onClick={() => handleDelete(plan.id)}
                      className="px-2.5 py-1.5 rounded-xl border border-neutral-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 text-neutral-400 text-xs font-semibold transition-colors cursor-pointer"
                      title="보관함에서 삭제"
                    >
                      {deletingId === plan.id ? "삭제 중..." : "🗑️"}
                    </button>
                  </div>
                </div>

                {/* 주제명 */}
                <div>
                  <h3 className="text-base md:text-lg font-black text-neutral-900 tracking-tight leading-snug">
                    {plan.topic}
                  </h3>
                </div>

                {/* 1. 후킹 미리보기 */}
                <div className="rounded-2xl bg-amber-50/70 border border-amber-200/80 p-3.5 space-y-1">
                  <div className="text-[11px] font-bold text-amber-900 flex items-center gap-1">
                    <span>⚡ 첫 문장 후킹</span>
                    {plan.hook_reason && (
                      <span className="text-amber-800/80 font-normal">
                        ({plan.hook_reason})
                      </span>
                    )}
                  </div>
                  <p className="text-sm md:text-base font-extrabold text-neutral-900">
                    &ldquo;{plan.hook}&rdquo;
                  </p>
                </div>

                {/* 2. 본문 박스 */}
                <div className="rounded-2xl bg-neutral-50/70 border border-neutral-200/80 p-4 space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-bold text-neutral-600 border-b border-neutral-200/50 pb-1.5">
                    <span>📝 스레드 본문 (공백 포함 약 {plan.body_text.length}자)</span>
                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : plan.id)}
                      className="text-neutral-500 hover:text-neutral-900 font-semibold cursor-pointer"
                    >
                      {isExpanded ? "간략히 보기 ▲" : "전체 펼치기 ▼"}
                    </button>
                  </div>

                  <div
                    className={`whitespace-pre-line text-xs md:text-sm text-neutral-800 leading-relaxed font-sans ${
                      isExpanded ? "" : "line-clamp-4"
                    }`}
                  >
                    {plan.body_text}
                  </div>
                </div>

                {/* 3. 댓글 / CTA */}
                {plan.reply_cta && (
                  <div className="rounded-xl bg-blue-50/70 border border-blue-200/70 px-3.5 py-2.5 text-xs text-blue-950 font-semibold flex items-center gap-2">
                    <span className="text-blue-700 font-bold shrink-0">👉 첫 댓글 CTA:</span>
                    <span className="truncate">{plan.reply_cta}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
