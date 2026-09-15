"use client";

import { useActionState, useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { clsx } from "@/lib/clsx";
import { SCHEDULE_INTERVAL_OPTIONS } from "@/lib/schedule";
import {
  createScheduledSourceAction,
  updateScheduledSourceAction,
  deleteScheduledSourceAction,
  runScheduledSourceNowAction,
  type ScheduledSourceState,
  type UpdateScheduledSourceState,
  type RunNowState,
} from "@/lib/actions/scheduledSources";
import type { NewsblurFeedSummary } from "@/lib/ai/collector";
import type { ScheduledSource } from "@/types/post";

type Method = "http" | "rss" | "perplexity";

const METHOD_LABELS: Record<Method, string> = {
  http: "HTTP (URL 지정)",
  rss: "RSS (NewsBlur 구독 피드)",
  perplexity: "Perplexity (트렌드 검색)",
};

const initialCreateState: ScheduledSourceState = {};

interface ScheduledSourceManagerProps {
  sources: ScheduledSource[];
  targets: { id: string; label: string }[];
  newsblurConnected: boolean;
  newsblurFeeds: NewsblurFeedSummary[];
}

/**
 * "글감 수집" 아래에 배치하는 예약 자동화 패널 — 소스(HTTP/RSS/Perplexity)와 게시할 카페를
 * 미리 등록해두면, 정해둔 주기마다 AI가 콘텐츠 1건을 만들고, "자동 포스팅"을 켜뒀으면 검토
 * 없이 바로 게시하고 꺼뒀으면 초안으로만 저장해 /drafts에서 검수 후 배포하게 한다(사용자
 * 지시, 2026-09-15). kakao_auto_poster의 TopicRow.tsx와 동일한 "즉시 자동 저장" UX를 따랐다.
 */
export function ScheduledSourceManager({ sources, targets, newsblurConnected, newsblurFeeds }: ScheduledSourceManagerProps) {
  return (
    <div className="rounded-lg border-2 border-blue-200 bg-blue-50/50 p-4">
      <p className="mb-1 text-sm font-bold text-blue-900">🔔 예약 자동 생성·포스팅</p>
      <p className="mb-4 text-xs leading-relaxed text-blue-700/80">
        수집 방식과 게시할 카페를 등록해두면, 정해둔 주기마다 AI가 콘텐츠를 자동으로 만듭니다.
        <br />
        <strong>자동 포스팅을 켜면 검토 없이 바로 카페에 게시</strong>되고, 꺼두면 초안으로만
        저장돼 &quot;AI 자동 글쓰기(수동)&quot;/게시글 관리 화면에서 검수 후 배포할 수
        있습니다.
      </p>

      {targets.length === 0 ? (
        <p className="rounded-lg bg-white p-3 text-xs text-neutral-500">
          먼저 설정 페이지에서 게시할 카페 게시판을 등록해주세요.
        </p>
      ) : (
        <CreateSourceForm targets={targets} newsblurConnected={newsblurConnected} newsblurFeeds={newsblurFeeds} />
      )}

      {sources.length > 0 && (
        <div className="mt-4 space-y-2">
          {sources.map((s) => (
            <SourceCard key={s.id} source={s} targets={targets} />
          ))}
        </div>
      )}
    </div>
  );
}

function CreateSourceForm({
  targets,
  newsblurConnected,
  newsblurFeeds,
}: {
  targets: { id: string; label: string }[];
  newsblurConnected: boolean;
  newsblurFeeds: NewsblurFeedSummary[];
}) {
  const [method, setMethod] = useState<Method>("http");
  const [state, formAction, isPending] = useActionState(createScheduledSourceAction, initialCreateState);
  const [selectedFeed, setSelectedFeed] = useState<NewsblurFeedSummary | null>(newsblurFeeds[0] ?? null);

  return (
    <form action={formAction} className="space-y-3 rounded-lg bg-white p-3">
      <div className="flex gap-2">
        {(Object.keys(METHOD_LABELS) as Method[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMethod(m)}
            className={clsx(
              "rounded-lg px-2.5 py-1 text-xs font-medium transition-colors",
              method === m ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200",
            )}
          >
            {METHOD_LABELS[m]}
          </button>
        ))}
      </div>
      <input type="hidden" name="sourceType" value={method} />

      {method === "http" && (
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-700">대상 페이지 URL</label>
          <Input name="sourceInput" type="url" required placeholder="https://example.com/category/news" />
        </div>
      )}

      {method === "rss" &&
        (newsblurConnected && newsblurFeeds.length > 0 ? (
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-700">구독 피드 선택</label>
            <select
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 outline-none focus:border-neutral-900"
              value={selectedFeed?.id ?? ""}
              onChange={(e) => setSelectedFeed(newsblurFeeds.find((f) => f.id === e.target.value) ?? null)}
            >
              {newsblurFeeds.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.title}
                </option>
              ))}
            </select>
            <input type="hidden" name="sourceInput" value={selectedFeed?.id ?? ""} />
            <input type="hidden" name="sourceLabel" value={selectedFeed?.title ?? ""} />
          </div>
        ) : (
          <p className="text-xs text-neutral-500">먼저 위 &quot;글감 수집&quot;에서 NewsBlur 계정을 연결해주세요.</p>
        ))}

      {method === "perplexity" && (
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-700">시드 주제</label>
          <Input name="sourceInput" required placeholder="예: 다이어트 보조제" />
        </div>
      )}

      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-700">게시할 카페</label>
        <select
          name="targetId"
          required
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 outline-none focus:border-neutral-900"
        >
          {targets.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      <label className="flex items-center gap-2 text-xs text-neutral-700">
        <input type="checkbox" name="autoPost" value="true" className="h-4 w-4" />
        자동 포스팅(검토 없이 바로 게시) — 끄면 초안으로만 저장됩니다
      </label>

      <Button
        type="submit"
        disabled={isPending || (method === "rss" && !selectedFeed)}
        className="text-xs"
      >
        {isPending ? "등록 중..." : "예약 소스 등록"}
      </Button>
      {state.error && <p className="text-xs text-red-600">{state.error}</p>}
    </form>
  );
}

function SourceCard({ source, targets }: { source: ScheduledSource; targets: { id: string; label: string }[] }) {
  const [enabled, setEnabled] = useState(source.schedule_enabled);
  const [interval, setInterval_] = useState(source.interval_minutes ?? 1440);
  const [autoPost, setAutoPost] = useState(source.auto_post);
  const [isSaving, startSaving] = useTransition();
  const [saveState, setSaveState] = useState<UpdateScheduledSourceState>({});
  const [saved, setSaved] = useState(false);
  const [runState, runAction, isRunning] = useActionState(runScheduledSourceNowAction, {} as RunNowState);

  const targetLabel = targets.find((t) => t.id === source.target_id)?.label ?? "알 수 없는 카페";

  function save(next: { enabled?: boolean; interval?: number; autoPost?: boolean }) {
    const merged = {
      enabled: next.enabled ?? enabled,
      interval: next.interval ?? interval,
      autoPost: next.autoPost ?? autoPost,
    };
    const fd = new FormData();
    fd.set("id", source.id);
    fd.set("scheduleEnabled", String(merged.enabled));
    fd.set("intervalMinutes", String(merged.interval));
    fd.set("autoPost", String(merged.autoPost));
    startSaving(async () => {
      const result = await updateScheduledSourceAction(saveState, fd);
      setSaveState(result);
      if (!result.error) {
        setSaved(true);
        setTimeout(() => setSaved(false), 1500);
      }
    });
  }

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-3">
      <div className="mb-1 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-xs font-bold text-neutral-900">{source.source_label}</p>
          <p className="text-[11px] text-neutral-400">→ {targetLabel}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            disabled={isSaving}
            onClick={() => {
              const next = !enabled;
              setEnabled(next);
              save({ enabled: next });
            }}
            className={clsx(
              "rounded-full px-2.5 py-1 text-[11px] font-bold text-white transition-colors disabled:opacity-50",
              enabled ? "bg-blue-600 hover:bg-blue-700" : "bg-red-500 hover:bg-red-600",
            )}
          >
            예약 {enabled ? "ON" : "OFF"}
          </button>
          <form action={deleteScheduledSourceAction}>
            <input type="hidden" name="id" value={source.id} />
            <button type="submit" className="text-[11px] text-red-500 hover:underline">
              삭제
            </button>
          </form>
        </div>
      </div>

      {enabled && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <select
            value={interval}
            disabled={isSaving}
            onChange={(e) => {
              const next = Number(e.target.value);
              setInterval_(next);
              save({ interval: next });
            }}
            className="rounded-lg border border-neutral-300 bg-white px-2 py-1 text-[11px] text-neutral-900"
          >
            {SCHEDULE_INTERVAL_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={isSaving}
          onClick={() => {
            const next = !autoPost;
            setAutoPost(next);
            save({ autoPost: next });
          }}
          className={clsx(
            "rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-colors disabled:opacity-50",
            autoPost ? "border-amber-400 bg-amber-100 text-amber-800" : "border-neutral-300 bg-white text-neutral-500",
          )}
        >
          {autoPost ? "⚡ 자동 포스팅 ON" : "📝 초안으로만 저장"}
        </button>

        <form action={runAction}>
          <input type="hidden" name="id" value={source.id} />
          <button
            type="submit"
            disabled={isRunning}
            className="rounded-lg border border-neutral-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
          >
            {isRunning ? "실행 중..." : "✨ 지금 실행"}
          </button>
        </form>

        {saved && <span className="text-[11px] text-emerald-600">저장됐어요.</span>}
      </div>

      {runState.error && <p className="mt-1 text-[11px] text-red-600">{runState.error}</p>}
      {runState.success && <p className="mt-1 text-[11px] text-emerald-600">생성 완료!</p>}
      {source.last_run_at && (
        <p className="mt-1 text-[11px] text-neutral-400">
          마지막 실행: {new Date(source.last_run_at).toLocaleString("ko-KR")}
        </p>
      )}
      {source.last_error && <p className="mt-1 text-[11px] text-red-500">직전 실패: {source.last_error}</p>}
    </div>
  );
}
