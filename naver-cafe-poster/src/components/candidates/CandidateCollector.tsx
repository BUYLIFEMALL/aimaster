"use client";

import { useActionState, useState, useTransition } from "react";
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
import { createScheduledSourceAction, type ScheduledSourceState } from "@/lib/actions/scheduledSources";
import { SCHEDULE_INTERVAL_OPTIONS } from "@/lib/schedule";
import type { NewsblurFeedSummary } from "@/lib/ai/collector";
import type { CafeCategory } from "@/types/post";

type Method = "http" | "rss" | "perplexity" | "candidate_pool";

const METHOD_LABELS: Record<Method, string> = {
  http: "HTTP (URL 지정)",
  rss: "RSS (NewsBlur 구독 피드)",
  perplexity: "Perplexity (트렌드 검색)",
  candidate_pool: "🗂️ 게시글 후보에서 예약발행",
};

const initialCollectState: CollectState = {};
const initialSaveState: SaveNewsblurAccountState = {};
const initialScheduleState: ScheduledSourceState = {};

interface CandidateCollectorProps {
  newsblurConnected: boolean;
  newsblurUsername: string | null;
  newsblurFeeds: NewsblurFeedSummary[];
  newsblurError: string | null;
  targets: { id: string; label: string }[];
  categories: CafeCategory[];
}

export function CandidateCollector({
  newsblurConnected,
  newsblurUsername,
  newsblurFeeds,
  newsblurError,
  targets,
  categories,
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

      {method === "http" && <HttpForm targets={targets} categories={categories} />}
      {method === "rss" && (
        <NewsblurForm
          connected={newsblurConnected}
          username={newsblurUsername}
          feeds={newsblurFeeds}
          loadError={newsblurError}
          targets={targets}
          categories={categories}
        />
      )}
      {method === "perplexity" && <PerplexityForm targets={targets} categories={categories} />}
      {method === "candidate_pool" && <CandidatePoolForm targets={targets} categories={categories} />}
    </div>
  );
}

/** 게시글 후보 수집/후보함 필터에서 공용으로 쓰는 카테고리 선택(회원이 미리 등록해둔 카테고리만 고를 수 있다). */
function CategorySelect({
  id,
  value,
  onChange,
  categories,
  label = "카테고리",
  noneLabel = "카테고리 없음",
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  categories: CafeCategory[];
  label?: string;
  noneLabel?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-xs font-medium text-neutral-700">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 outline-none focus:border-neutral-900"
      >
        <option value="">{noneLabel}</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
    </div>
  );
}

/** 예약 자동화 등록 시 카테고리를 여러 개 선택할 수 있는 체크박스 그룹. */
function CategoryCheckboxGroup({
  categories,
  selectedIds,
  onChange,
}: {
  categories: CafeCategory[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  if (categories.length === 0) return null;

  function toggle(id: string) {
    onChange(selectedIds.includes(id) ? selectedIds.filter((v) => v !== id) : [...selectedIds, id]);
  }

  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-neutral-700">카테고리 (여러 개 선택 가능)</label>
      <div className="flex flex-wrap gap-2">
        {categories.map((c) => (
          <label
            key={c.id}
            className={`flex cursor-pointer items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors ${
              selectedIds.includes(c.id)
                ? "border-blue-400 bg-blue-100 text-blue-800"
                : "border-neutral-300 bg-white text-neutral-600 hover:bg-neutral-50"
            }`}
          >
            <input
              type="checkbox"
              checked={selectedIds.includes(c.id)}
              onChange={() => toggle(c.id)}
              className="h-3.5 w-3.5"
            />
            {c.name}
          </label>
        ))}
      </div>
    </div>
  );
}

function ResultMessage({ state }: { state: CollectState }) {
  if (state.error) return <p className="mt-2 text-sm text-red-600">{state.error}</p>;
  if (state.success) return <p className="mt-2 text-sm text-green-600">게시글 후보 {state.count}건을 수집했습니다.</p>;
  return null;
}

/** "글감 수집"(1회성) / "🔔 예약 자동화로 등록"(주기적 자동 생성) 중 하나를 고르는 공용 토글 UI. */
function ScheduleToggle({
  enabled,
  onToggle,
  targets,
  targetId,
  onTargetId,
  autoPost,
  onAutoPost,
  interval,
  onInterval,
  categories,
  categoryIds,
  onCategoryIds,
}: {
  enabled: boolean;
  onToggle: (v: boolean) => void;
  targets: { id: string; label: string }[];
  targetId: string;
  onTargetId: (v: string) => void;
  autoPost: boolean;
  onAutoPost: (v: boolean) => void;
  interval: number;
  onInterval: (v: number) => void;
  categories: CafeCategory[];
  categoryIds: string[];
  onCategoryIds: (ids: string[]) => void;
}) {
  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3">
      <label className="flex items-center gap-2 text-sm font-medium text-blue-900">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onToggle(e.target.checked)}
          className="h-4 w-4"
        />
        🔔 예약 자동화로 등록 — 1회 수집 대신, 정해둔 주기마다 자동으로 콘텐츠를 만듭니다
      </label>

      {enabled && (
        <div className="mt-3 space-y-2">
          {targets.length === 0 ? (
            <p className="rounded-lg bg-white p-2 text-xs text-neutral-500">
              먼저 설정 페이지에서 게시할 카페 게시판을 등록해주세요.
            </p>
          ) : (
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-700">게시할 카페</label>
              <select
                value={targetId}
                onChange={(e) => onTargetId(e.target.value)}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 outline-none focus:border-neutral-900"
              >
                {targets.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-700">주기</label>
            <select
              value={interval}
              onChange={(e) => onInterval(Number(e.target.value))}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 outline-none focus:border-neutral-900"
            >
              {SCHEDULE_INTERVAL_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-2 text-xs text-neutral-700">
            <input
              type="checkbox"
              checked={autoPost}
              onChange={(e) => onAutoPost(e.target.checked)}
              className="h-4 w-4"
            />
            자동 포스팅(검토 없이 바로 게시) — 끄면 초안으로만 저장됩니다
          </label>

          <CategoryCheckboxGroup categories={categories} selectedIds={categoryIds} onChange={onCategoryIds} />
        </div>
      )}
    </div>
  );
}

function ScheduleResultMessage({ state }: { state: ScheduledSourceState | null }) {
  if (!state) return null;
  if (state.error) return <p className="mt-2 text-sm text-red-600">{state.error}</p>;
  return <p className="mt-2 text-sm text-green-600">예약 자동화로 등록했습니다. 아래 "수집된 게시글 후보" 위 목록에서 확인·관리할 수 있습니다.</p>;
}

function HttpForm({ targets, categories }: { targets: { id: string; label: string }[]; categories: CafeCategory[] }) {
  const [collectState, setCollectState] = useState<CollectState>(initialCollectState);
  const [scheduleState, setScheduleState] = useState<ScheduledSourceState | null>(null);
  const [isPending, startTransition] = useTransition();

  const [url, setUrl] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [scheduleMode, setScheduleMode] = useState(false);
  const [targetId, setTargetId] = useState(targets[0]?.id ?? "");
  const [autoPost, setAutoPost] = useState(false);
  const [interval, setInterval_] = useState(1440);
  const [scheduleCategoryIds, setScheduleCategoryIds] = useState<string[]>([]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    startTransition(async () => {
      if (scheduleMode) {
        const fd = new FormData();
        fd.set("sourceType", "http");
        fd.set("sourceInput", url);
        fd.set("sourceLabel", url);
        fd.set("targetId", targetId);
        fd.set("autoPost", String(autoPost));
        fd.set("scheduleEnabled", "true");
        fd.set("intervalMinutes", String(interval));
        scheduleCategoryIds.forEach((id) => fd.append("categoryIds", id));
        const result = await createScheduledSourceAction(initialScheduleState, fd);
        setScheduleState(result);
        if (!result.error) setUrl("");
      } else {
        const fd = new FormData();
        fd.set("url", url);
        fd.set("categoryId", categoryId);
        const result = await collectFromHttpAction(initialCollectState, fd);
        setCollectState(result);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-700">대상 페이지 URL</label>
        <Input
          type="url"
          required
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com/article/123"
        />
        <p className="mt-1 text-xs text-neutral-500">
          특정 게시글 URL이면 그 글로 1건, 카테고리/목록 페이지 URL이면 그 안의 게시글 중 무작위로
          최대 5건을 골라 각각 게시글 후보를 생성합니다. (예약 자동화 등록 시에는 매번 1건만
          생성합니다.)
        </p>
      </div>

      {!scheduleMode && (
        <CategorySelect id="cat-http" value={categoryId} onChange={setCategoryId} categories={categories} />
      )}

      <ScheduleToggle
        enabled={scheduleMode}
        onToggle={setScheduleMode}
        targets={targets}
        targetId={targetId}
        onTargetId={setTargetId}
        autoPost={autoPost}
        onAutoPost={setAutoPost}
        interval={interval}
        onInterval={setInterval_}
        categories={categories}
        categoryIds={scheduleCategoryIds}
        onCategoryIds={setScheduleCategoryIds}
      />

      <Button type="submit" disabled={isPending || (scheduleMode && !targetId)}>
        {isPending ? (scheduleMode ? "등록 중..." : "수집 중...") : scheduleMode ? "예약 자동화 등록" : "글감 수집"}
      </Button>

      {scheduleMode ? <ScheduleResultMessage state={scheduleState} /> : <ResultMessage state={collectState} />}
    </form>
  );
}

function NewsblurForm({
  connected,
  username,
  feeds,
  loadError,
  targets,
  categories,
}: {
  connected: boolean;
  username: string | null;
  feeds: NewsblurFeedSummary[];
  loadError: string | null;
  targets: { id: string; label: string }[];
  categories: CafeCategory[];
}) {
  const [collectState, setCollectState] = useState<CollectState>(initialCollectState);
  const [scheduleState, setScheduleState] = useState<ScheduledSourceState | null>(null);
  const [isPending, startTransition] = useTransition();
  const [saveState, saveAction, isSaving] = useActionState(saveNewsblurAccountAction, initialSaveState);

  const [selectedFeed, setSelectedFeed] = useState<NewsblurFeedSummary | null>(feeds[0] ?? null);
  const [categoryId, setCategoryId] = useState("");
  const [scheduleMode, setScheduleMode] = useState(false);
  const [targetId, setTargetId] = useState(targets[0]?.id ?? "");
  const [autoPost, setAutoPost] = useState(false);
  const [interval, setInterval_] = useState(1440);
  const [scheduleCategoryIds, setScheduleCategoryIds] = useState<string[]>([]);

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

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedFeed) return;
    startTransition(async () => {
      if (scheduleMode) {
        const fd = new FormData();
        fd.set("sourceType", "rss");
        fd.set("sourceInput", selectedFeed.id);
        fd.set("sourceLabel", selectedFeed.title);
        fd.set("targetId", targetId);
        fd.set("autoPost", String(autoPost));
        fd.set("scheduleEnabled", "true");
        fd.set("intervalMinutes", String(interval));
        scheduleCategoryIds.forEach((id) => fd.append("categoryIds", id));
        const result = await createScheduledSourceAction(initialScheduleState, fd);
        setScheduleState(result);
      } else {
        const fd = new FormData();
        fd.set("feedId", selectedFeed.id);
        fd.set("feedTitle", selectedFeed.title);
        fd.set("categoryId", categoryId);
        const result = await collectFromRssAction(initialCollectState, fd);
        setCollectState(result);
      }
    });
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
        <form onSubmit={handleSubmit} className="space-y-3">
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

          {!scheduleMode && (
            <CategorySelect id="cat-rss" value={categoryId} onChange={setCategoryId} categories={categories} />
          )}

          <ScheduleToggle
            enabled={scheduleMode}
            onToggle={setScheduleMode}
            targets={targets}
            targetId={targetId}
            onTargetId={setTargetId}
            autoPost={autoPost}
            onAutoPost={setAutoPost}
            interval={interval}
            onInterval={setInterval_}
            categories={categories}
            categoryIds={scheduleCategoryIds}
            onCategoryIds={setScheduleCategoryIds}
          />

          <Button type="submit" disabled={isPending || !selectedFeed || (scheduleMode && !targetId)}>
            {isPending ? (scheduleMode ? "등록 중..." : "수집 중...") : scheduleMode ? "예약 자동화 등록" : "글감 수집"}
          </Button>

          {scheduleMode ? <ScheduleResultMessage state={scheduleState} /> : <ResultMessage state={collectState} />}
        </form>
      )}
    </div>
  );
}

function PerplexityForm({ targets, categories }: { targets: { id: string; label: string }[]; categories: CafeCategory[] }) {
  const [collectState, setCollectState] = useState<CollectState>(initialCollectState);
  const [scheduleState, setScheduleState] = useState<ScheduledSourceState | null>(null);
  const [isPending, startTransition] = useTransition();

  const [topic, setTopic] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [scheduleMode, setScheduleMode] = useState(false);
  const [targetId, setTargetId] = useState(targets[0]?.id ?? "");
  const [autoPost, setAutoPost] = useState(false);
  const [interval, setInterval_] = useState(1440);
  const [scheduleCategoryIds, setScheduleCategoryIds] = useState<string[]>([]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    startTransition(async () => {
      if (scheduleMode) {
        const fd = new FormData();
        fd.set("sourceType", "perplexity");
        fd.set("sourceInput", topic);
        fd.set("sourceLabel", topic);
        fd.set("targetId", targetId);
        fd.set("autoPost", String(autoPost));
        fd.set("scheduleEnabled", "true");
        fd.set("intervalMinutes", String(interval));
        scheduleCategoryIds.forEach((id) => fd.append("categoryIds", id));
        const result = await createScheduledSourceAction(initialScheduleState, fd);
        setScheduleState(result);
        if (!result.error) setTopic("");
      } else {
        const fd = new FormData();
        fd.set("topic", topic);
        fd.set("categoryId", categoryId);
        const result = await collectFromPerplexityAction(initialCollectState, fd);
        setCollectState(result);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-700">시드 주제</label>
        <Input required value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="예: 다이어트 보조제" />
      </div>

      {!scheduleMode && (
        <CategorySelect id="cat-perplexity" value={categoryId} onChange={setCategoryId} categories={categories} />
      )}

      <ScheduleToggle
        enabled={scheduleMode}
        onToggle={setScheduleMode}
        targets={targets}
        targetId={targetId}
        onTargetId={setTargetId}
        autoPost={autoPost}
        onAutoPost={setAutoPost}
        interval={interval}
        onInterval={setInterval_}
        categories={categories}
        categoryIds={scheduleCategoryIds}
        onCategoryIds={setScheduleCategoryIds}
      />

      <Button type="submit" disabled={isPending || (scheduleMode && !targetId)}>
        {isPending ? (scheduleMode ? "등록 중..." : "검색 중...") : scheduleMode ? "예약 자동화 등록" : "글감 수집"}
      </Button>

      {scheduleMode ? <ScheduleResultMessage state={scheduleState} /> : <ResultMessage state={collectState} />}
    </form>
  );
}

/**
 * 새로 수집하는 대신, 이미 모여 있는(기존 수집분 + 앞으로 새로 수집되는 것 포함) "수집된
 * 게시글 후보" 중 선택한 카테고리에 속한 것을 먼저 모인 순서대로(FIFO) 하나씩 골라 카페
 * 게시글을 만드는 예약 전용 소스. 후보는 수집 시 기본적으로 대상에 포함되며, 특정 글만
 * 빼고 싶으면 후보 목록에서 "예약포스팅"을 OFF로 끄면 된다. 1회성 "글감 수집" 개념이
 * 없으므로 다른 방식과 달리 예약 등록만 지원한다.
 */
function CandidatePoolForm({ targets, categories }: { targets: { id: string; label: string }[]; categories: CafeCategory[] }) {
  const [scheduleState, setScheduleState] = useState<ScheduledSourceState | null>(null);
  const [isPending, startTransition] = useTransition();
  const [targetId, setTargetId] = useState(targets[0]?.id ?? "");
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [autoPost, setAutoPost] = useState(false);
  const [interval, setInterval_] = useState(1440);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    startTransition(async () => {
      const fd = new FormData();
      fd.set("sourceType", "candidate_pool");
      fd.set("targetId", targetId);
      fd.set("autoPost", String(autoPost));
      fd.set("scheduleEnabled", "true");
      fd.set("intervalMinutes", String(interval));
      categoryIds.forEach((id) => fd.append("categoryIds", id));
      const result = await createScheduledSourceAction(initialScheduleState, fd);
      setScheduleState(result);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <p className="text-sm text-neutral-600">
        아래 "수집된 게시글 후보"는 기존에 모아둔 것과 앞으로 새로 수집되는 것 모두 기본적으로
        예약포스팅 대상에 포함됩니다. 정해둔 주기마다 그중 가장 먼저 모인 것부터 하나씩 골라
        카페 게시글로 만들고, 한 번 쓰인 후보는 자동으로 제외되어 중복 게시되지 않습니다.
        카테고리를 선택하면 그 카테고리 후보 중에서만 고릅니다(선택 안 하면 전체 대상). 특정
        글만 자동 발행에서 빼고 싶으면 후보 목록에서 "예약포스팅"을 OFF로 꺼주세요.
      </p>

      <CategoryCheckboxGroup categories={categories} selectedIds={categoryIds} onChange={setCategoryIds} />

      {targets.length === 0 ? (
        <p className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-xs text-neutral-500">
          먼저 설정 페이지에서 게시할 카페 게시판을 등록해주세요.
        </p>
      ) : (
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">게시할 카페</label>
          <select
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 outline-none focus:border-neutral-900"
          >
            {targets.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-700">주기</label>
        <select
          value={interval}
          onChange={(e) => setInterval_(Number(e.target.value))}
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 outline-none focus:border-neutral-900"
        >
          {SCHEDULE_INTERVAL_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <label className="flex items-center gap-2 text-xs text-neutral-700">
        <input
          type="checkbox"
          checked={autoPost}
          onChange={(e) => setAutoPost(e.target.checked)}
          className="h-4 w-4"
        />
        자동 포스팅(검토 없이 바로 게시) — 끄면 초안으로만 저장됩니다
      </label>

      <Button type="submit" disabled={isPending || !targetId}>
        {isPending ? "등록 중..." : "예약 자동화 등록"}
      </Button>

      <ScheduleResultMessage state={scheduleState} />
    </form>
  );
}
