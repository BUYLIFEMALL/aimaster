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

type Method = "http" | "rss" | "perplexity";

const METHOD_LABELS: Record<Method, string> = {
  http: "HTTP (URL 지정)",
  rss: "RSS (NewsBlur 구독 피드)",
  perplexity: "Perplexity (트렌드 검색)",
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
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <div className="mb-4 flex gap-2 border-b border-neutral-200 pb-3">
        {(Object.keys(METHOD_LABELS) as Method[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMethod(m)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              method === m
                ? "bg-neutral-900 text-white"
                : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
            }`}
          >
            {METHOD_LABELS[m]}
          </button>
        ))}
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
  if (state.error) return <p className="mt-2 text-sm text-red-600">{state.error}</p>;
  if (state.success) return <p className="mt-2 text-sm text-green-600">쇼츠 주제 {state.count}건을 수집했습니다.</p>;
  return null;
}

function HttpForm() {
  const [state, formAction, isPending] = useActionState(collectFromHttpAction, initialCollectState);

  return (
    <form action={formAction} className="space-y-3">
      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-700">대상 페이지 URL</label>
        <Input name="url" type="url" required placeholder="https://example.com/article/123" />
        <p className="mt-1 text-xs text-neutral-500">
          특정 게시글 URL이면 그 글로 1건, 카테고리/목록 페이지 URL이면 그 안의 게시글 중 무작위로
          최대 5건을 골라 각각 쇼츠 주제를 생성합니다.
        </p>
      </div>
      <Button type="submit" disabled={isPending}>
        {isPending ? "수집 중..." : "이 페이지로 쇼츠 주제 생성"}
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
      <div className="space-y-3">
        <p className="text-sm text-neutral-600">
          NewsBlur(newsblur.com) 계정을 연결하면 구독 중인 피드 목록을 불러와서 고를 수 있습니다.
        </p>
        <form action={saveAction} className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">NewsBlur 아이디</label>
            <Input name="username" required autoComplete="off" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">NewsBlur 비밀번호</label>
            <Input name="password" type="password" required autoComplete="off" />
          </div>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? "연결 확인 중..." : "NewsBlur 계정 연결"}
          </Button>
          {saveState.error && <p className="text-sm text-red-600">{saveState.error}</p>}
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-sm">
        <span className="text-neutral-700">NewsBlur 연결됨: {username}</span>
        <form action={deleteNewsblurAccountAction}>
          <button type="submit" className="text-xs text-red-600 hover:underline">
            연결 해제
          </button>
        </form>
      </div>

      {loadError && <p className="text-sm text-red-600">{loadError}</p>}

      {!loadError && feeds.length === 0 && (
        <p className="text-sm text-neutral-500">구독 중인 피드가 없습니다.</p>
      )}

      {feeds.length > 0 && (
        <form action={formAction} className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">구독 피드 선택</label>
            <select
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 outline-none focus:border-neutral-900"
              value={selectedFeed?.id ?? ""}
              onChange={(e) => setSelectedFeed(feeds.find((f) => f.id === e.target.value) ?? null)}
            >
              {feeds.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.title}
                </option>
              ))}
            </select>
          </div>
          <input type="hidden" name="feedId" value={selectedFeed?.id ?? ""} />
          <input type="hidden" name="feedTitle" value={selectedFeed?.title ?? ""} />
          <Button type="submit" disabled={isPending || !selectedFeed}>
            {isPending ? "수집 중..." : "이 피드로 쇼츠 주제 생성"}
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
    <form action={formAction} className="space-y-3">
      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-700">시드 주제</label>
        <Input name="topic" required placeholder="예: 다이어트 보조제" />
      </div>
      <Button type="submit" disabled={isPending}>
        {isPending ? "검색 중..." : "현재 트렌딩 앵글로 쇼츠 주제 생성"}
      </Button>
      <ResultMessage state={state} />
    </form>
  );
}
