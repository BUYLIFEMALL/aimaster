"use client";

import { useState, useTransition } from "react";
import { updateMonitoringSettingsAction } from "@/lib/actions/districts";
import { COLLECT_INTERVAL_OPTIONS } from "@/lib/publicdata/schedule";
import { clsx } from "@/lib/clsx";

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, h) => h);

export function MonitoringSettings({
  sggCd,
  sggNm,
  monitoringEnabled,
  intervalMinutes,
  activeHourStart,
  activeHourEnd,
}: {
  sggCd: string;
  sggNm: string;
  monitoringEnabled: boolean;
  intervalMinutes: number;
  activeHourStart: number | null;
  activeHourEnd: number | null;
}) {
  const [enabled, setEnabled] = useState(monitoringEnabled);
  const [interval, setInterval_] = useState(intervalMinutes);
  const [hoursRestricted, setHoursRestricted] = useState(
    activeHourStart !== null && activeHourEnd !== null,
  );
  const [startHour, setStartHour] = useState(activeHourStart ?? 9);
  const [endHour, setEndHour] = useState(activeHourEnd ?? 22);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function save(next: {
    enabled?: boolean;
    interval?: number;
    hoursRestricted?: boolean;
    startHour?: number;
    endHour?: number;
  }) {
    const merged = {
      enabled: next.enabled ?? enabled,
      interval: next.interval ?? interval,
      hoursRestricted: next.hoursRestricted ?? hoursRestricted,
      startHour: next.startHour ?? startHour,
      endHour: next.endHour ?? endHour,
    };
    const fd = new FormData();
    fd.set("sggCd", sggCd);
    fd.set("monitoringEnabled", String(merged.enabled));
    fd.set("intervalMinutes", String(merged.interval));
    fd.set("hoursRestricted", String(merged.hoursRestricted));
    fd.set("activeHourStart", String(merged.startHour));
    fd.set("activeHourEnd", String(merged.endHour));
    startTransition(async () => {
      await updateMonitoringSettingsAction(fd);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    });
  }

  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between">
        <span className="font-medium text-neutral-100">{sggNm}</span>
        <button
          type="button"
          disabled={isPending}
          onClick={() => {
            const next = !enabled;
            setEnabled(next);
            save({ enabled: next });
          }}
          className={clsx(
            "rounded-full px-3 py-1 text-xs font-medium transition-colors disabled:opacity-50",
            enabled
              ? "bg-gold-gradient text-dark"
              : "border border-white/10 bg-dark-100 text-neutral-400",
          )}
        >
          {enabled ? "모니터링 ON" : "모니터링 OFF"}
        </button>
      </div>

      {enabled && (
        <div className="mt-4 space-y-3 text-sm">
          <div className="flex items-center gap-3">
            <label className="w-24 shrink-0 text-neutral-400">수집 주기</label>
            <select
              value={interval}
              disabled={isPending}
              onChange={(e) => {
                const next = Number(e.target.value);
                setInterval_(next);
                save({ interval: next });
              }}
              className="rounded-lg border border-white/10 bg-dark-100 px-2 py-1.5 text-neutral-100"
            >
              {COLLECT_INTERVAL_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3">
            <label className="w-24 shrink-0 text-neutral-400">동작 시간대</label>
            <button
              type="button"
              disabled={isPending}
              onClick={() => {
                const next = !hoursRestricted;
                setHoursRestricted(next);
                save({ hoursRestricted: next });
              }}
              className={clsx(
                "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50",
                hoursRestricted
                  ? "border-gold/40 bg-dark-100 text-gold-light"
                  : "border-white/10 bg-dark-100 text-neutral-400",
              )}
            >
              {hoursRestricted ? "특정 시간대만" : "종일"}
            </button>

            {hoursRestricted && (
              <div className="flex items-center gap-2">
                <select
                  value={startHour}
                  disabled={isPending}
                  onChange={(e) => {
                    const next = Number(e.target.value);
                    setStartHour(next);
                    save({ startHour: next });
                  }}
                  className="rounded-lg border border-white/10 bg-dark-100 px-2 py-1.5 text-neutral-100"
                >
                  {HOUR_OPTIONS.map((h) => (
                    <option key={h} value={h}>
                      {h}시
                    </option>
                  ))}
                </select>
                <span className="text-neutral-500">~</span>
                <select
                  value={endHour}
                  disabled={isPending}
                  onChange={(e) => {
                    const next = Number(e.target.value);
                    setEndHour(next);
                    save({ endHour: next });
                  }}
                  className="rounded-lg border border-white/10 bg-dark-100 px-2 py-1.5 text-neutral-100"
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
          {saved && <p className="text-xs text-green-400">저장됐어요.</p>}
        </div>
      )}
    </div>
  );
}
