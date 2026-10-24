"use client";

// 기준: real_estate_sales/src/components/districts/MonitoringSettings.tsx — 켜기/끄기·주기·시간대, 바꾸면 바로 저장.
import { useState, useTransition } from "react";
import { saveScheduleAction } from "@/lib/actions/settings";
import { COLLECT_INTERVAL_OPTIONS, isShortInterval } from "@/lib/schedule";

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, h) => h);

type Initial = { enabled: boolean; intervalMinutes: number; startHour: number | null; endHour: number | null };

export default function ScheduleClient({ initial }: { initial: Initial }) {
  const [enabled, setEnabled] = useState(initial.enabled);
  const [interval, setIntervalMinutes] = useState(initial.intervalMinutes);
  const [hoursRestricted, setHoursRestricted] = useState(initial.startHour !== null && initial.endHour !== null);
  const [startHour, setStartHour] = useState(initial.startHour ?? 9);
  const [endHour, setEndHour] = useState(initial.endHour ?? 22);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  function save(next: Partial<{ enabled: boolean; interval: number; hoursRestricted: boolean; startHour: number; endHour: number }>) {
    const merged = { enabled, interval, hoursRestricted, startHour, endHour, ...next };
    startTransition(async () => {
      const result = await saveScheduleAction({
        enabled: merged.enabled,
        intervalMinutes: merged.interval,
        hoursRestricted: merged.hoursRestricted,
        startHour: merged.startHour,
        endHour: merged.endHour,
      });
      setMessage(result.error ? { kind: "err", text: result.error } : { kind: "ok", text: "저장됐어요." });
    });
  }

  return (
    <section className="card">
      <div className="ra-item-head">
        <h2 className="card-title">자동 수집 예약</h2>
        <button
          type="button"
          className={`ra-toggle big ${enabled ? "on" : ""}`}
          disabled={pending}
          onClick={() => { const next = !enabled; setEnabled(next); save({ enabled: next }); }}
        >
          {enabled ? "예약 ON" : "예약 OFF"}
        </button>
      </div>
      <p className="lede">{enabled ? "켜져 있어요. 아래 간격과 시간대대로 확장이 수집합니다." : "꺼져 있으면 확장은 아무 요청도 하지 않아요."}</p>

      <div className="ra-grid">
        <div className="field">
          <label htmlFor="interval">수집 간격</label>
          <select id="interval" value={interval} disabled={pending} onChange={(e) => { const next = Number(e.target.value); setIntervalMinutes(next); save({ interval: next }); }}>
            {COLLECT_INTERVAL_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="field">
          <label>동작 시간대</label>
          <div className="ra-hours">
            <button type="button" className={`ra-toggle ${hoursRestricted ? "on" : ""}`} disabled={pending} onClick={() => { const next = !hoursRestricted; setHoursRestricted(next); save({ hoursRestricted: next }); }}>
              {hoursRestricted ? "특정 시간대만" : "종일"}
            </button>
            {hoursRestricted && (
              <>
                <select aria-label="시작 시" value={startHour} disabled={pending} onChange={(e) => { const next = Number(e.target.value); setStartHour(next); save({ startHour: next }); }}>
                  {HOUR_OPTIONS.map((h) => <option key={h} value={h}>{h}시</option>)}
                </select>
                <span>~</span>
                <select aria-label="끝 시" value={endHour} disabled={pending} onChange={(e) => { const next = Number(e.target.value); setEndHour(next); save({ endHour: next }); }}>
                  {HOUR_OPTIONS.map((h) => <option key={h} value={h}>{h}시</option>)}
                </select>
              </>
            )}
          </div>
        </div>
      </div>

      {isShortInterval(interval) && (
        <p className="ra-msg ra-warn" role="alert">
          ⚠️ 짧은 간격({interval}분)은 네이버 확인 화면이 뜨거나 계정이 일시 제한될 수 있어요. 확인 화면이 나오면 확장이 그날 수집을 자동으로 멈춥니다. 보통은 1~3시간을 권해요.
        </p>
      )}
      {hoursRestricted && startHour > endHour && <p className="card-caption">🌙 자정을 넘겨 {startHour}시부터 다음 날 {endHour}시까지 동작해요.</p>}
      {message && <p className={`ra-msg ${message.kind === "ok" ? "ra-ok" : "ra-err"}`} role="status">{message.text}</p>}
    </section>
  );
}
