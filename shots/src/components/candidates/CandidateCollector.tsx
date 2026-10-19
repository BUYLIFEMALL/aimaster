"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  collectFromHttpAction,
  collectFromRssAction,
  collectFromPerplexityAction,
  type CollectState,
} from "@/lib/actions/candidates";
import {
  saveNewsblurAccountAction,
  deleteNewsblurAccountAction,
  type SaveNewsblurAccountState,
} from "@/lib/actions/newsblurAccount";
import type { NewsblurFeedSummary } from "@/lib/ai/collector";
import { Globe, Rss, Sparkles } from "lucide-react";

type Method = "http" | "rss" | "perplexity";

const METHOD_LABELS: Record<Method, { label: string; icon: React.ReactNode }> = {
  http: { label: "HTTP (URL 지정)", icon: <Globe className="w-3.5 h-3.5" /> },
  rss: { label: "RSS (NewsBlur 구독 피드)", icon: <Rss className="w-3.5 h-3.5" /> },
  perplexity: { label: "Perplexity (트렌드 검색)", icon: <Sparkles className="w-3.5 h-3.5" /> },
};

const initialCollectState: CollectState = {};
const initialSaveState: SaveNewsblurAccountState = {};

interface CandidateCollectorProps {
  newsblurConnected: boolean;
  newsblurUsername: string | null;
  newsblurFeeds: NewsblurFeedSummary[];
  newsblurError: string | null;
}

export function CandidateCollector({
  newsblurConnected,
  newsblurUsername,
  newsblurFeeds,
  newsblurError,
}: CandidateCollectorProps) {
  const [method, setMethod] = useState<Method>("http");

  return (
    <div className="rounded-xl border border-[#272727] bg-[#1a1a1a] p-5">
      <div className="mb-5 flex flex-wrap gap-2 border-b border-[#272727] pb-3">
        {(Object.keys(METHOD_LABELS) as Method[]).map((m) => {
          const item = METHOD_LABELS[m];
          const isSelected = method === m;
          return (
            <button
              key={m}
              type="button"
              onClick={() => setMethod(m)}
              className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all ${
                isSelected
                  ? "bg-[#ff0000] text-white shadow-md shadow-[#ff0000]/25"
                  : "bg-[#272727] text-[#aaaaaa] hover:bg-[#323232] hover:text-[#f1f1f1]"
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          );
        })}
      </div>

      {method === "http" && <HttpForm />}
      {method === "rss" && (
        <NewsblurForm
          connected={newsblurConnected}
          username={newsblurUsername}
          feeds={newsblurFeeds}
          loadError={newsblurError}
        />
      )}
      {method === "perplexity" && <PerplexityForm />}
    </div>
  );
}

function ResultMessage({ state }: { state: CollectState }) {
  if (state.error) return <p className="mt-3 text-xs text-rose-400 bg-rose-950/40 border border-rose-800/40 p-2.5 rounded-lg">{state.error}</p>;
  if (state.success) return <p className="mt-3 text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 p-2.5 rounded-lg">🎉 쇼츠 주제 {state.count}건을 성공적으로 수집했습니다!</p>;
  return null;
}

function HttpForm() {
  const [state, formAction, isPending] = useActionState(collectFromHttpAction, initialCollectState);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="mb-1.5 block text-xs font-semibold text-[#f1f1f1]">대상 웹페이지 URL</label>
        <Input 
          name="url" 
          type="url" 
          required 
          placeholder="https://example.com/article/123" 
          className="bg-[#121212] border-[#2e2e2e] text-[#f1f1f1] placeholder:text-[#666666] focus:border-[#ff0000]"
        />
        <p className="mt-1.5 text-xs text-[#888888]">
          특정 뉴스/블로그 본문 URL이면 해당 글로 1건, 카테고리/목록 URL이면 주요 글을 선별해 최대 5건의 쇼츠 주제를 동시 생성합니다.
        </p>
      </div>
      <Button 
        type="submit" 
        disabled={isPending}
        className="bg-[#ff0000] hover:bg-[#cc0000] text-white font-semibold text-xs px-4 py-2.5 rounded-lg shadow-md"
      >
        {isPending ? "주제 수집 및 스크립트 기획 중..." : "이 웹페이지로 쇼츠 주제 생성"}
      </Button>
      <ResultMessage state={state} />
    </form>
  );
}

function NewsblurForm({
  connected,
  username,
  feeds,
  loadError,
}: {
  connected: boolean;
  username: string | null;
  feeds: NewsblurFeedSummary[];
  loadError: string | null;
}) {
  const [state, formAction, isPending] = useActionState(collectFromRssAction, initialCollectState);
  const [saveState, saveAction, isSaving] = useActionState(saveNewsblurAccountAction, initialSaveState);
  const [selectedFeed, setSelectedFeed] = useState<NewsblurFeedSummary | null>(feeds[0] ?? null);

  if (!connected) {
    return (
      <div className="space-y-4">
        <p className="text-xs text-[#aaaaaa]">
          NewsBlur(newsblur.com) 계정을 연결하면 구독 중인 RSS 피드 목록을 실시간으로 가져와 쇼츠 아이디어를 추출합니다.
        </p>
        <form action={saveAction} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-[#f1f1f1]">NewsBlur 아이디</label>
            <Input name="username" required autoComplete="off" className="bg-[#121212] border-[#2e2e2e] text-[#f1f1f1]" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-[#f1f1f1]">NewsBlur 비밀번호</label>
            <Input name="password" type="password" required autoComplete="off" className="bg-[#121212] border-[#2e2e2e] text-[#f1f1f1]" />
          </div>
          <Button type="submit" disabled={isSaving} className="bg-[#ff0000] hover:bg-[#cc0000] text-white text-xs">
            {isSaving ? "계정 연결 확인 중..." : "NewsBlur 계정 연동하기"}
          </Button>
          {saveState.error && <p className="text-xs text-rose-400">{saveState.error}</p>}
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-lg border border-[#2e2e2e] bg-[#121212] p-3 text-xs">
        <span className="text-[#f1f1f1]">NewsBlur 연결 계정: <b className="text-[#ff4e45]">{username}</b></span>
        <form action={deleteNewsblurAccountAction}>
          <button type="submit" className="text-xs text-rose-400 hover:underline">
            연결 해제
          </button>
        </form>
      </div>

      {loadError && <p className="text-xs text-rose-400">{loadError}</p>}

      {!loadError && feeds.length === 0 && (
        <p className="text-xs text-[#888888]">구독 중인 RSS 피드가 없습니다.</p>
      )}

      {feeds.length > 0 && (
        <form action={formAction} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-[#f1f1f1]">구독 피드 선택</label>
            <select
              className="w-full rounded-lg border border-[#2e2e2e] bg-[#121212] px-3 py-2 text-xs text-[#f1f1f1] outline-none focus:border-[#ff0000]"
              value={selectedFeed?.id ?? ""}
              onChange={(e) => setSelectedFeed(feeds.find((f) => f.id === e.target.value) ?? null)}
            >
              {feeds.map((f) => (
                <option key={f.id} value={f.id} className="bg-[#181818] text-[#f1f1f1]">
                  {f.title}
                </option>
              ))}
            </select>
          </div>
          <input type="hidden" name="feedId" value={selectedFeed?.id ?? ""} />
          <input type="hidden" name="feedTitle" value={selectedFeed?.title ?? ""} />
          <Button type="submit" disabled={isPending || !selectedFeed} className="bg-[#ff0000] hover:bg-[#cc0000] text-white text-xs">
            {isPending ? "피드 글 분석 중..." : "선택한 RSS 피드로 쇼츠 주제 생성"}
          </Button>
          <ResultMessage state={state} />
        </form>
      )}
    </div>
  );
}

function PerplexityForm() {
  const [state, formAction, isPending] = useActionState(collectFromPerplexityAction, initialCollectState);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="mb-1.5 block text-xs font-semibold text-[#f1f1f1]">트렌드 시드 키워드</label>
        <Input 
          name="topic" 
          required 
          placeholder="예: 2026 AI 자동화 트렌드, 직장인 부업 숏폼 팁" 
          className="bg-[#121212] border-[#2e2e2e] text-[#f1f1f1] placeholder:text-[#666666] focus:border-[#ff0000]"
        />
        <p className="mt-1.5 text-xs text-[#888888]">
          Perplexity Sonar 온라인 AI가 실시간 소셜 미디어 및 뉴스에서 가장 떡상 중인 앵글을 찾아 쇼츠 기획으로 가공합니다.
        </p>
      </div>
      <Button 
        type="submit" 
        disabled={isPending}
        className="bg-[#ff0000] hover:bg-[#cc0000] text-white font-semibold text-xs px-4 py-2.5 rounded-lg shadow-md"
      >
        {isPending ? "실시간 트렌드 검색 & 앵글 기획 중..." : "Perplexity 바이럴 앵글로 쇼츠 생성"}
      </Button>
      <ResultMessage state={state} />
    </form>
  );
}
