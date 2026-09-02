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

export function SourcingAlertControls({ entry, onUpdated }: SourcingAlertControlsProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(next: { enabled: boolean; intervalMinutes: number; channels: AlertChannel[] }) {
    setError(null);
    setIsSaving(true);
    try {
      const formData = new FormData();
      formData.set("id", entry.id);
      formData.set("enabled", String(next.enabled));
      formData.set("intervalMinutes", String(next.intervalMinutes));
      next.channels.forEach((c) => formData.append("channels", c));
      const result = await updateSourcingAlertAction(formData);
      if (result.error) setError(result.error);
      else if (result.entry) onUpdated(result.entry);
    } finally {
      setIsSaving(false);
    }
  }

  function toggleEnabled() {
    save({
      enabled: !entry.sourcingAlertEnabled,
      intervalMinutes: entry.sourcingAlertIntervalMinutes ?? DEFAULT_INTERVAL,
      channels: entry.sourcingAlertChannels as AlertChannel[],
    });
  }

  function changeInterval(value: number) {
    save({ enabled: entry.sourcingAlertEnabled, intervalMinutes: value, channels: entry.sourcingAlertChannels as AlertChannel[] });
  }

  function toggleChannel(channel: AlertChannel) {
    const current = new Set(entry.sourcingAlertChannels as AlertChannel[]);
    if (current.has(channel)) current.delete(channel);
    else current.add(channel);
    save({
      enabled: entry.sourcingAlertEnabled,
      intervalMinutes: entry.sourcingAlertIntervalMinutes ?? DEFAULT_INTERVAL,
      channels: Array.from(current),
    });
  }

  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-gray-700">🔔 예약 소싱 알림</p>
        <button
          type="button"
          onClick={toggleEnabled}
          disabled={isSaving}
          className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold transition-colors disabled:opacity-50 ${
            entry.sourcingAlertEnabled ? "bg-sky-600 text-white" : "bg-gray-200 text-gray-500"
          }`}
        >
          {entry.sourcingAlertEnabled ? "사용 중" : "꺼짐"}
        </button>
      </div>

      {entry.sourcingAlertEnabled && (
        <div className="mt-2 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-gray-500">주기</span>
            <select
              value={entry.sourcingAlertIntervalMinutes ?? DEFAULT_INTERVAL}
              onChange={(e) => changeInterval(Number(e.target.value))}
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
          <div className="flex flex-wrap gap-1.5">
            {ALERT_CHANNEL_OPTIONS.map((c) => {
              const checked = entry.sourcingAlertChannels.includes(c.value);
              return (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => toggleChannel(c.value)}
                  disabled={isSaving}
                  className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors disabled:opacity-50 ${
                    checked ? "border-sky-500 bg-sky-500 text-white" : "border-gray-300 bg-white text-gray-500"
                  }`}
                >
                  {c.label}
                </button>
              );
            })}
          </div>
          {entry.sourcingAlertChannels.length === 0 && (
            <p className="text-[11px] text-amber-600">채널을 최소 1개 선택해야 알림이 발송됩니다.</p>
          )}
          <p className="text-[11px] leading-snug text-gray-400">
            설정 페이지에 등록해둔 채널(이메일/카카오톡/텔레그램/문자) 중 선택한 것으로, 이 키워드로
            검색한 소싱 후보 상품 리스트를 정해진 주기마다 보내드립니다.
          </p>
        </div>
      )}

      {error && <p className="mt-2 text-[11px] text-red-600">{error}</p>}
    </div>
  );
}
