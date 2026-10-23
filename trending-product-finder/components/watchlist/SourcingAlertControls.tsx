"use client";

import { useState } from "react";
import { updateSourcingAlertAction, type WatchlistEntry } from "@/lib/actions/watchlist";
import { ALERT_INTERVAL_OPTIONS } from "@/lib/schedule";
import { ALERT_CHANNEL_OPTIONS, type AlertChannel } from "@/lib/constants";

interface SourcingAlertControlsProps {
  entry: WatchlistEntry;
  onUpdated: (entry: WatchlistEntry) => void;
}

const DEFAULT_INTERVAL = 1440; // 매일
const HOUR_OPTIONS = Array.from({ length: 24 }, (_, h) => h);

// 관심상품(components/sourcing/SavedProductsPanel.tsx)과 동일한 "동작 시간대" 설정을
// 여기에도 추가(2026-09-03, "소싱쪽처럼 시간대 켜고 끄는 기능 넣어줘" 요청) — 항목을
// 건드릴 때마다 현재 상태 전체와 합쳐서 즉시 저장한다.
export function SourcingAlertControls({ entry, onUpdated }: SourcingAlertControlsProps) {
  const [channels, setChannels] = useState<AlertChannel[]>(entry.sourcingAlertChannels as AlertChannel[]);
  const [hoursRestricted, setHoursRestricted] = useState(
    entry.sourcingAlertActiveHourStart !== null && entry.sourcingAlertActiveHourEnd !== null,
  );
  const [startHour, setStartHour] = useState(entry.sourcingAlertActiveHourStart ?? 9);
  const [endHour, setEndHour] = useState(entry.sourcingAlertActiveHourEnd ?? 22);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function save(next: {
    enabled?: boolean;
    intervalMinutes?: number;
    channels?: AlertChannel[];
    hoursRestricted?: boolean;
    startHour?: number;
    endHour?: number;
    notifyMode?: "always" | "changes_only";
  }) {
    const merged = {
      enabled: next.enabled ?? entry.sourcingAlertEnabled,
      intervalMinutes: next.intervalMinutes ?? entry.sourcingAlertIntervalMinutes ?? DEFAULT_INTERVAL,
      channels: next.channels ?? channels,
      hoursRestricted: next.hoursRestricted ?? hoursRestricted,
      startHour: next.startHour ?? startHour,
      endHour: next.endHour ?? endHour,
      notifyMode: next.notifyMode ?? entry.sourcingAlertNotifyMode,
    };
    setError(null);
    setIsSaving(true);
    try {
      const formData = new FormData();
      formData.set("id", entry.id);
      formData.set("enabled", String(merged.enabled));
      formData.set("intervalMinutes", String(merged.intervalMinutes));
      merged.channels.forEach((c) => formData.append("channels", c));
      formData.set("hoursRestricted", String(merged.hoursRestricted));
      formData.set("activeHourStart", String(merged.startHour));
      formData.set("activeHourEnd", String(merged.endHour));
      formData.set("notifyMode", merged.notifyMode);
      const result = await updateSourcingAlertAction(formData);
      if (result.error) {
        setError(result.error);
      } else if (result.entry) {
        onUpdated(result.entry);
        setSaved(true);
        setTimeout(() => setSaved(false), 1500);
      }
    } finally {
      setIsSaving(false);
    }
  }

  function toggleChannel(channel: AlertChannel) {
    const current = new Set(channels);
    if (current.has(channel)) current.delete(channel);
    else current.add(channel);
    const next = Array.from(current);
    setChannels(next);
    save({ channels: next });
  }

  return (
    <div className="rounded-xl border-2 border-mx-primary/40 bg-mx-primary/10 p-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-mx-link">🔔 예약 소싱 알림</p>
        <button
          type="button"
          onClick={() => save({ enabled: !entry.sourcingAlertEnabled })}
          disabled={isSaving}
          className={`rounded-full px-3 py-1 text-xs font-bold text-white transition-colors disabled:opacity-50 ${
            entry.sourcingAlertEnabled ? "bg-mx-primary hover:bg-[#1d4ed8]" : "bg-mx-danger hover:bg-[#e11d48]"
          }`}
        >
          {entry.sourcingAlertEnabled ? "ON" : "OFF"}
        </button>
      </div>
      <p className="mt-1 text-[11px] leading-snug text-mx-link/80">
        정해둔 주기마다 이 키워드로 소싱 후보 상품을 검색해서 등록된 채널로 요약을 보내드려요.
      </p>

      {entry.sourcingAlertEnabled && (
        <div className="mt-2 space-y-2">
          <div className="flex items-center gap-2">
            <span className="w-16 shrink-0 text-[11px] text-mx-muted">주기</span>
            <select
              value={entry.sourcingAlertIntervalMinutes ?? DEFAULT_INTERVAL}
              onChange={(e) => save({ intervalMinutes: Number(e.target.value) })}
              disabled={isSaving}
              className="input-sm text-xs"
            >
              {ALERT_INTERVAL_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="w-16 shrink-0 text-[11px] text-mx-muted">동작 시간대</span>
            <button
              type="button"
              disabled={isSaving}
              onClick={() => {
                const next = !hoursRestricted;
                setHoursRestricted(next);
                save({ hoursRestricted: next });
              }}
              className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-colors disabled:opacity-50 ${
                hoursRestricted ? "border-mx-primary/40 bg-mx-primary/10 text-mx-link" : "border-mx-border bg-mx-surface text-mx-muted"
              }`}
            >
              {hoursRestricted ? "특정 시간대만" : "종일"}
            </button>

            {hoursRestricted && (
              <div className="flex items-center gap-1.5 text-xs">
                <select
                  value={startHour}
                  disabled={isSaving}
                  onChange={(e) => {
                    const next = Number(e.target.value);
                    setStartHour(next);
                    save({ startHour: next });
                  }}
                  className="input-sm text-xs"
                >
                  {HOUR_OPTIONS.map((h) => (
                    <option key={h} value={h}>
                      {h}시
                    </option>
                  ))}
                </select>
                <span className="text-mx-muted">~</span>
                <select
                  value={endHour}
                  disabled={isSaving}
                  onChange={(e) => {
                    const next = Number(e.target.value);
                    setEndHour(next);
                    save({ endHour: next });
                  }}
                  className="input-sm text-xs"
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

          <div className="flex flex-wrap items-center gap-2">
            <span className="w-16 shrink-0 text-[11px] text-mx-muted">발송 방식</span>
            <div className="flex overflow-hidden rounded-lg border border-mx-border">
              <button
                type="button"
                disabled={isSaving}
                onClick={() => save({ notifyMode: "always" })}
                className={`px-2.5 py-1 text-[11px] font-semibold transition-colors disabled:opacity-50 ${
                  entry.sourcingAlertNotifyMode === "always" ? "bg-mx-primary text-white" : "bg-mx-surface text-mx-muted hover:bg-[#262c3a]"
                }`}
              >
                매번 전체 발송
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={() => save({ notifyMode: "changes_only" })}
                className={`border-l border-mx-border px-2.5 py-1 text-[11px] font-semibold transition-colors disabled:opacity-50 ${
                  entry.sourcingAlertNotifyMode === "changes_only" ? "bg-mx-primary text-white" : "bg-mx-surface text-mx-muted hover:bg-[#262c3a]"
                }`}
              >
                변경사항만 발송
              </button>
            </div>
          </div>
          {entry.sourcingAlertNotifyMode === "changes_only" && (
            <p className="text-[11px] leading-snug text-mx-link">
              직전 확인 대비 새 상품이 나타나거나, 가격이 5% 이상 바뀌거나, 검색결과에서 사라진(품절 추정) 경우에만 알려드려요. 변화가 없으면 조용히 넘어갑니다.
            </p>
          )}

          <div className="flex flex-wrap gap-1.5">
            {ALERT_CHANNEL_OPTIONS.map((c) => {
              const checked = channels.includes(c.value);
              return (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => toggleChannel(c.value)}
                  disabled={isSaving}
                  className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors disabled:opacity-50 ${
                    checked ? "border-mx-primary/40 bg-mx-primary text-white" : "border-mx-border bg-mx-surface text-mx-muted"
                  }`}
                >
                  {c.label}
                </button>
              );
            })}
          </div>
          {channels.length === 0 && <p className="text-[11px] text-mx-accent">채널을 최소 1개 선택해야 알림이 발송됩니다.</p>}
          <p className="text-[11px] leading-snug text-mx-muted">
            설정 페이지에 등록해둔 채널(이메일/카카오톡/텔레그램/문자) 중 선택한 것으로, 이 키워드로
            검색한 소싱 후보 상품 리스트를 정해진 주기마다 보내드립니다.
          </p>
          {saved && <p className="text-[11px] text-mx-success">저장됐어요.</p>}
        </div>
      )}

      {error && <p className="mt-2 text-[11px] text-mx-danger">{error}</p>}
    </div>
  );
}
