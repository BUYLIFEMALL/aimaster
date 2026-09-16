"use client";

import { useActionState, useState, useTransition } from "react";
import { clsx } from "@/lib/clsx";
import { SCHEDULE_INTERVAL_OPTIONS } from "@/lib/schedule";
import {
  updateScheduledSourceAction,
  updateScheduledSourceContentAction,
  deleteScheduledSourceAction,
  runScheduledSourceNowAction,
  type UpdateScheduledSourceState,
  type RunNowState,
} from "@/lib/actions/scheduledSources";
import { CategoryCheckboxGroup } from "@/components/candidates/CategoryCheckboxGroup";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { CafeCategory, ScheduledSource } from "@/types/post";

const SOURCE_INPUT_LABELS: Record<string, string> = {
  http: "대상 페이지 URL",
  rss: "NewsBlur 피드 ID",
  perplexity: "시드 주제",
};

interface ScheduledSourceManagerProps {
  sources: ScheduledSource[];
  targets: { id: string; label: string }[];
  categories: CafeCategory[];
}

/**
 * 위쪽 "글감 수집" 폼에서 "🔔 예약 자동화로 등록"을 켜서 만든 소스들의 목록·관리 패널.
 * 등록 폼 자체는 여기 없다 — 수집 방식(HTTP/RSS/Perplexity) 선택 UI를 이 화면에 중복으로
 * 두지 않기 위해 등록은 CandidateCollector 쪽 폼에 통합했다(2026-09-15, 사용자 피드백으로
 * 중복 탭을 제거).
 */
export function ScheduledSourceManager({ sources, targets, categories }: ScheduledSourceManagerProps) {
  if (sources.length === 0) return null;

  return (
    <div className="rounded-lg border-2 border-blue-200 bg-blue-50/50 p-4">
      <p className="mb-1 text-sm font-bold text-blue-900">🔔 등록된 예약 자동화</p>
      <p className="mb-4 text-xs leading-relaxed text-blue-700/80">
        위 "글감 수집"에서 "예약 자동화로 등록"을 켜서 만든 소스들입니다. 여기서 예약 ON/OFF,
        주기, 자동 포스팅 여부를 바꾸거나 즉시 실행할 수 있습니다.
      </p>

      <div className="space-y-2">
        {sources.map((s) => (
          <SourceCard key={s.id} source={s} targets={targets} categories={categories} />
        ))}
      </div>
    </div>
  );
}

function SourceCard({
  source,
  targets,
  categories,
}: {
  source: ScheduledSource;
  targets: { id: string; label: string }[];
  categories: CafeCategory[];
}) {
  const [enabled, setEnabled] = useState(source.schedule_enabled);
  const [interval, setInterval_] = useState(source.interval_minutes ?? 1440);
  const [autoPost, setAutoPost] = useState(source.auto_post);
  const [isSaving, startSaving] = useTransition();
  const [saveState, setSaveState] = useState<UpdateScheduledSourceState>({});
  const [saved, setSaved] = useState(false);
  const [runState, runAction, isRunning] = useActionState(runScheduledSourceNowAction, {} as RunNowState);

  const isPool = source.source_type === "candidate_pool";
  const [isEditing, setIsEditing] = useState(false);
  const [editTargetId, setEditTargetId] = useState(source.target_id ?? "");
  const [editCategoryIds, setEditCategoryIds] = useState<string[]>(source.category_ids ?? []);
  const [editSourceInput, setEditSourceInput] = useState(source.source_input ?? "");
  const [isSavingContent, startSavingContent] = useTransition();
  const [contentSaveState, setContentSaveState] = useState<UpdateScheduledSourceState>({});

  function saveContent() {
    const fd = new FormData();
    fd.set("id", source.id);
    fd.set("sourceType", source.source_type);
    fd.set("targetId", editTargetId);
    editCategoryIds.forEach((id) => fd.append("categoryIds", id));
    if (!isPool) fd.set("sourceInput", editSourceInput);
    startSavingContent(async () => {
      const result = await updateScheduledSourceContentAction(contentSaveState, fd);
      setContentSaveState(result);
      if (!result.error) setIsEditing(false);
    });
  }

  const targetLabel = targets.find((t) => t.id === source.target_id)?.label ?? "알 수 없는 카페";
  const categoryNames = (source.category_ids ?? [])
    .map((id) => categories.find((c) => c.id === id)?.name)
    .filter((name): name is string => !!name);

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
          {categoryNames.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {categoryNames.map((name) => (
                <span key={name} className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-600">
                  {name}
                </span>
              ))}
            </div>
          )}
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
          <button
            type="button"
            onClick={() => setIsEditing((prev) => !prev)}
            className="rounded-full border border-neutral-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-neutral-700 hover:bg-neutral-50"
          >
            {isEditing ? "수정 닫기" : "수정"}
          </button>
          <form action={deleteScheduledSourceAction}>
            <input type="hidden" name="id" value={source.id} />
            <button type="submit" className="text-[11px] text-red-500 hover:underline">
              삭제
            </button>
          </form>
        </div>
      </div>

      {isEditing && (
        <div className="mt-2 space-y-2 rounded-lg border border-dashed border-blue-300 bg-blue-50/40 p-3">
          <div>
            <label className="mb-1 block text-[11px] font-medium text-neutral-700">게시할 카페</label>
            <select
              value={editTargetId}
              onChange={(e) => setEditTargetId(e.target.value)}
              className="w-full rounded-lg border border-neutral-300 bg-white px-2 py-1.5 text-xs text-neutral-900"
            >
              {targets.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {!isPool && (
            <div>
              <label className="mb-1 block text-[11px] font-medium text-neutral-700">
                {SOURCE_INPUT_LABELS[source.source_type] ?? "수집 대상"}
              </label>
              <Input
                value={editSourceInput}
                onChange={(e) => setEditSourceInput(e.target.value)}
                className="text-xs"
              />
            </div>
          )}

          <CategoryCheckboxGroup categories={categories} selectedIds={editCategoryIds} onChange={setEditCategoryIds} />

          <div className="flex items-center gap-2 pt-1">
            <Button
              type="button"
              onClick={saveContent}
              disabled={isSavingContent || !editTargetId}
              className="px-3 py-1.5 text-xs"
            >
              {isSavingContent ? "저장 중..." : "저장"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsEditing(false)}
              disabled={isSavingContent}
              className="px-3 py-1.5 text-xs"
            >
              취소
            </Button>
            {contentSaveState.error && <span className="text-[11px] text-red-600">{contentSaveState.error}</span>}
          </div>
        </div>
      )}

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
