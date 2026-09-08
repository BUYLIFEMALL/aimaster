"use client";

import { useActionState, useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import {
  toggleTopicActiveAction,
  deleteTopicAction,
  generateReportAction,
  updateTopicScheduleAction,
  updateTopicKeywordsAction,
  type GenerateReportState,
  type UpdateScheduleState,
} from "@/lib/actions/topics";
import { LOOKBACK_DAYS_OPTIONS } from "@/lib/validation";
import { NOTIFY_CHANNEL_OPTIONS, SCHEDULE_INTERVAL_OPTIONS, type NotifyChannel } from "@/lib/schedule";
import { clsx } from "@/lib/clsx";

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, h) => h);

interface TopicRowProps {
  id: string;
  topicName: string;
  keywords: string[];
  isActive: boolean;
  lookbackDays: number;
  scheduleEnabled: boolean;
  intervalMinutes: number | null;
  activeHourStart: number | null;
  activeHourEnd: number | null;
  notifyChannels: string[];
}

const generateInitialState: GenerateReportState = {};
const scheduleInitialState: UpdateScheduleState = {};

// trending-product-finder의 watchlist(관심 목록) 카드와 동일한 레이아웃 — 예약 패널을
// 별도 버튼 뒤에 숨기지 않고 카드 안에 항상 펼쳐서 보여준다. 상단은 이름/키워드 +
// 활성 ON/OFF + 삭제, 그 아래 "지금 리포트 생성" 알약 버튼, 그리고 그 아래 항상 보이는
// "🔔 예약 리포트 알림" 패널(자체 ON/OFF + 주기/동작시간대/알림채널)로 구성한다.
export function TopicRow({
  id,
  topicName,
  keywords,
  isActive,
  lookbackDays,
  scheduleEnabled,
  intervalMinutes,
  activeHourStart,
  activeHourEnd,
  notifyChannels,
}: TopicRowProps) {
  const [genState, genFormAction, isGenerating] = useActionState(generateReportAction, generateInitialState);

  // ── 예약(정기 자동 생성) 설정 — real_estate_sales의 MonitoringSettings.tsx /
  // trending-product-finder의 SourcingAlertControls.tsx와 동일하게, 버튼/셀렉트를 바꾸는
  // 즉시 자동 저장한다(별도 "저장" 버튼 없음).
  const [lookback, setLookback] = useState(lookbackDays);
  const [enabled, setEnabled] = useState(scheduleEnabled);
  const [interval, setInterval_] = useState(intervalMinutes ?? 1440);
  const [hoursRestricted, setHoursRestricted] = useState(activeHourStart !== null && activeHourEnd !== null);
  const [startHour, setStartHour] = useState(activeHourStart ?? 9);
  const [endHour, setEndHour] = useState(activeHourEnd ?? 22);
  const [channels, setChannels] = useState<string[]>(notifyChannels);
  const [isSavingSchedule, startSavingSchedule] = useTransition();
  const [scheduleState, setScheduleState] = useState<UpdateScheduleState>(scheduleInitialState);
  const [scheduleSaved, setScheduleSaved] = useState(false);

  function saveSchedule(next: {
    lookback?: number;
    enabled?: boolean;
    interval?: number;
    hoursRestricted?: boolean;
    startHour?: number;
    endHour?: number;
    channels?: string[];
  }) {
    const merged = {
      lookback: next.lookback ?? lookback,
      enabled: next.enabled ?? enabled,
      interval: next.interval ?? interval,
      hoursRestricted: next.hoursRestricted ?? hoursRestricted,
      startHour: next.startHour ?? startHour,
      endHour: next.endHour ?? endHour,
      channels: next.channels ?? channels,
    };
    const fd = new FormData();
    fd.set("id", id);
    fd.set("lookbackDays", String(merged.lookback));
    fd.set("scheduleEnabled", String(merged.enabled));
    fd.set("intervalMinutes", String(merged.interval));
    fd.set("hoursRestricted", String(merged.hoursRestricted));
    fd.set("activeHourStart", String(merged.startHour));
    fd.set("activeHourEnd", String(merged.endHour));
    merged.channels.forEach((c) => fd.append("notifyChannels", c));
    startSavingSchedule(async () => {
      const result = await updateTopicScheduleAction(scheduleInitialState, fd);
      setScheduleState(result);
      if (!result.error) {
        setScheduleSaved(true);
        setTimeout(() => setScheduleSaved(false), 1500);
      }
    });
  }

  function toggleChannel(channel: NotifyChannel) {
    const current = new Set(channels);
    if (current.has(channel)) current.delete(channel);
    else current.add(channel);
    const next = Array.from(current);
    setChannels(next);
    saveSchedule({ channels: next });
  }

  // ── 키워드 개별 추가/삭제
  const [isEditingKeywords, setIsEditingKeywords] = useState(false);
  const [editKeywords, setEditKeywords] = useState<string[]>(keywords);
  const [newKeyword, setNewKeyword] = useState("");
  const [isSavingKeywords, setIsSavingKeywords] = useState(false);
  const [keywordsError, setKeywordsError] = useState<string | null>(null);

  function startEditingKeywords() {
    setEditKeywords(keywords);
    setNewKeyword("");
    setKeywordsError(null);
    setIsEditingKeywords(true);
  }

  function removeEditKeyword(target: string) {
    setEditKeywords((prev) => prev.filter((k) => k !== target));
  }

  function addEditKeyword() {
    const value = newKeyword.trim();
    if (!value || editKeywords.includes(value)) {
      setNewKeyword("");
      return;
    }
    setEditKeywords((prev) => [...prev, value]);
    setNewKeyword("");
  }

  async function saveKeywords() {
    setKeywordsError(null);
    setIsSavingKeywords(true);
    try {
      const fd = new FormData();
      fd.set("id", id);
      editKeywords.forEach((k) => fd.append("keywords", k));
      const result = await updateTopicKeywordsAction(fd);
      if (result.error) {
        setKeywordsError(result.error);
      } else {
        setIsEditingKeywords(false);
      }
    } finally {
      setIsSavingKeywords(false);
    }
  }

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="flex-1">
          <p className="text-sm font-bold text-neutral-900">{topicName}</p>
          {!isEditingKeywords ? (
            <div className="mt-1 flex flex-wrap items-center gap-1">
              {keywords.map((k) => (
                <span key={k} className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">
                  {k}
                </span>
              ))}
              <button
                type="button"
                onClick={startEditingKeywords}
                className="shrink-0 text-[11px] text-blue-600 hover:text-blue-800"
              >
                ✏️ 키워드 수정
              </button>
            </div>
          ) : (
            <div className="mt-2 rounded-lg border border-neutral-200 bg-neutral-50 p-2">
              <div className="flex flex-wrap gap-1.5">
                {editKeywords.map((k) => (
                  <span
                    key={k}
                    className="flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-xs text-neutral-700 ring-1 ring-neutral-200"
                  >
                    {k}
                    <button
                      type="button"
                      onClick={() => removeEditKeyword(k)}
                      className="text-neutral-400 hover:text-red-600"
                      aria-label={`${k} 삭제`}
                    >
                      ×
                    </button>
                  </span>
                ))}
                {editKeywords.length === 0 && <p className="text-[11px] text-neutral-400">키워드가 없습니다. 추가해주세요.</p>}
              </div>
              <div className="mt-2 flex gap-1.5">
                <input
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addEditKeyword();
                    }
                  }}
                  placeholder="새 키워드 입력 후 Enter"
                  className="flex-1 rounded-lg border border-neutral-300 px-2 py-1 text-xs text-neutral-900 outline-none focus:border-neutral-900"
                />
                <Button type="button" variant="ghost" onClick={addEditKeyword}>
                  추가
                </Button>
              </div>
              {keywordsError && <p className="mt-1 text-[11px] text-red-600">{keywordsError}</p>}
              <div className="mt-2 flex gap-2">
                <Button type="button" disabled={isSavingKeywords} onClick={saveKeywords}>
                  {isSavingKeywords ? "저장 중..." : "저장"}
                </Button>
                <Button type="button" variant="ghost" onClick={() => setIsEditingKeywords(false)} disabled={isSavingKeywords}>
                  취소
                </Button>
              </div>
            </div>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <form action={toggleTopicActiveAction}>
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="isActive" value={String(isActive)} />
            <button
              type="submit"
              className={clsx(
                "rounded-full px-3 py-1 text-xs font-bold text-white transition-colors",
                isActive ? "bg-blue-600 hover:bg-blue-700" : "bg-red-500 hover:bg-red-600",
              )}
            >
              {isActive ? "ON" : "OFF"}
            </button>
          </form>
          <form action={deleteTopicAction}>
            <input type="hidden" name="id" value={id} />
            <button type="submit" className="text-xs font-semibold text-red-500 hover:underline">
              삭제
            </button>
          </form>
        </div>
      </div>

      <form action={genFormAction}>
        <input type="hidden" name="topicId" value={id} />
        <button
          type="submit"
          disabled={isGenerating}
          className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700 transition-colors hover:bg-green-200 disabled:opacity-50"
        >
          {isGenerating ? "생성 중..." : "✨ 지금 리포트 생성"}
        </button>
      </form>
      {genState.error && <p className="mt-2 text-xs text-red-600">{genState.error}</p>}

      <div className="mt-3 rounded-xl border-2 border-blue-200 bg-blue-50/50 p-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-blue-900">🔔 예약 리포트 알림</p>
          <button
            type="button"
            onClick={() => {
              const next = !enabled;
              setEnabled(next);
              saveSchedule({ enabled: next });
            }}
            disabled={isSavingSchedule}
            className={clsx(
              "rounded-full px-3 py-1 text-xs font-bold text-white transition-colors disabled:opacity-50",
              enabled ? "bg-blue-600 hover:bg-blue-700" : "bg-red-500 hover:bg-red-600",
            )}
          >
            {enabled ? "ON" : "OFF"}
          </button>
        </div>
        <p className="mt-1 text-[11px] leading-snug text-blue-700/80">
          정해둔 주기마다 이 주제로 최신 정보를 검색해서 리포트를 만들고, 등록된 채널로
          알려드려요. 카카오톡 발행은 항상 별도 승인(텔레그램 버튼 또는 리포트 화면의 발송
          버튼)이 필요합니다.
        </p>

        {enabled && (
          <div className="mt-2 space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-16 shrink-0 text-[11px] text-neutral-500">조회 범위</span>
              <select
                value={lookback}
                disabled={isSavingSchedule}
                onChange={(e) => {
                  const next = Number(e.target.value);
                  setLookback(next);
                  saveSchedule({ lookback: next });
                }}
                className="rounded-lg border border-neutral-300 bg-white px-2 py-1 text-xs text-neutral-900 outline-none focus:border-neutral-900"
              >
                {LOOKBACK_DAYS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="w-16 shrink-0 text-[11px] text-neutral-500">주기</span>
              <select
                value={interval}
                disabled={isSavingSchedule}
                onChange={(e) => {
                  const next = Number(e.target.value);
                  setInterval_(next);
                  saveSchedule({ interval: next });
                }}
                className="rounded-lg border border-neutral-300 bg-white px-2 py-1 text-xs text-neutral-900 outline-none focus:border-neutral-900"
              >
                {SCHEDULE_INTERVAL_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="w-16 shrink-0 text-[11px] text-neutral-500">동작 시간대</span>
              <button
                type="button"
                disabled={isSavingSchedule}
                onClick={() => {
                  const next = !hoursRestricted;
                  setHoursRestricted(next);
                  saveSchedule({ hoursRestricted: next });
                }}
                className={clsx(
                  "rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-colors disabled:opacity-50",
                  hoursRestricted ? "border-blue-400 bg-blue-100 text-blue-700" : "border-neutral-300 bg-white text-neutral-500",
                )}
              >
                {hoursRestricted ? "특정 시간대만" : "종일"}
              </button>

              {hoursRestricted && (
                <div className="flex items-center gap-1.5 text-xs">
                  <select
                    value={startHour}
                    disabled={isSavingSchedule}
                    onChange={(e) => {
                      const next = Number(e.target.value);
                      setStartHour(next);
                      saveSchedule({ startHour: next });
                    }}
                    className="rounded-lg border border-neutral-300 bg-white px-2 py-1 text-xs text-neutral-900"
                  >
                    {HOUR_OPTIONS.map((h) => (
                      <option key={h} value={h}>
                        {h}시
                      </option>
                    ))}
                  </select>
                  <span className="text-neutral-400">~</span>
                  <select
                    value={endHour}
                    disabled={isSavingSchedule}
                    onChange={(e) => {
                      const next = Number(e.target.value);
                      setEndHour(next);
                      saveSchedule({ endHour: next });
                    }}
                    className="rounded-lg border border-neutral-300 bg-white px-2 py-1 text-xs text-neutral-900"
                  >
                    {HOUR_OPTIONS.map((h) => (
                      <option key={h} value={h}>
                        {h}시
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5">
              {NOTIFY_CHANNEL_OPTIONS.map((c) => {
                const checked = channels.includes(c.value);
                return (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => toggleChannel(c.value)}
                    disabled={isSavingSchedule}
                    className={clsx(
                      "rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors disabled:opacity-50",
                      checked ? "border-blue-500 bg-blue-500 text-white" : "border-neutral-300 bg-white text-neutral-500",
                    )}
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>
            {channels.length === 0 && <p className="text-[11px] text-amber-600">채널을 최소 1개 선택해야 알림이 발송됩니다.</p>}
            <p className="text-[11px] leading-snug text-neutral-400">
              설정 페이지에 등록해둔 채널(이메일/텔레그램) 중 선택한 것으로, 이 주제의 리포트
              생성 소식을 보내드립니다.
            </p>
            {scheduleSaved && <p className="text-[11px] text-emerald-600">저장됐어요.</p>}
          </div>
        )}

        {scheduleState.error && <p className="mt-2 text-[11px] text-red-600">{scheduleState.error}</p>}
      </div>
    </div>
  );
}
