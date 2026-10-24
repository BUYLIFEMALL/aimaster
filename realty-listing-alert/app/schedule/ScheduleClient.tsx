"use client";

// 기준: real_estate_sales/src/components/districts/MonitoringSettings.tsx — 켜기/끄기·주기·시간대, 바꾸면 바로 저장.
import { useRef, useState, useTransition } from "react";
import { saveScheduleAction } from "@/lib/actions/settings";
import { COLLECT_INTERVAL_OPTIONS } from "@/lib/schedule";
import { MAX_COMPLEXES_PER_RUN, MAX_PAGES_PER_DAY, estimateLoad } from "@/lib/limits";

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, h) => h);

type Initial = { enabled: boolean; intervalMinutes: number; startHour: number | null; endHour: number | null };

type TargetLite = { target_type: string | null; region_max_complexes: number | null; enabled: boolean };

export default function ScheduleClient({ initial, targets }: { initial: Initial; targets: TargetLite[] }) {
  const [enabled, setEnabled] = useState(initial.enabled);
  const [interval, setIntervalMinutes] = useState(initial.intervalMinutes);
  const [hoursRestricted, setHoursRestricted] = useState(initial.startHour !== null && initial.endHour !== null);
  const [startHour, setStartHour] = useState(initial.startHour ?? 9);
  const [endHour, setEndHour] = useState(initial.endHour ?? 22);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  // 연달아 바꿀 때 앞의 변경을 잃지 않도록 마지막 값을 ref로 들고 간다(받는 방법 화면과 같은 수정, 2026-10-25).
  const latest = useRef({ enabled, interval, hoursRestricted, startHour, endHour });
  const queue = useRef<Promise<unknown>>(Promise.resolve()); // 저장 요청을 차례대로

  function save(next: Partial<{ enabled: boolean; interval: number; hoursRestricted: boolean; startHour: number; endHour: number }>) {
    const merged = { ...latest.current, ...next };
    latest.current = merged;
    startTransition(async () => {
      const payload = {
        enabled: merged.enabled,
        intervalMinutes: merged.interval,
        hoursRestricted: merged.hoursRestricted,
        startHour: merged.startHour,
        endHour: merged.endHour,
      };
      const run = queue.current.then(() => saveScheduleAction(payload));
      queue.current = run.catch(() => undefined);
      const result = await run;
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

      <p className="card-caption">💡 간격은 1시간부터 고를 수 있어요(너무 자주 살펴보면 네이버 확인 화면이 뜰 수 있어서). 보통은 2~3시간을 권해요.</p>
      {(() => {
        // 📊 예상 수집량(2026-10-25 주인님 지시 — 상한선과 함께 사용자에게 보이기)
        const load = estimateLoad(targets, interval, hoursRestricted ? startHour : null, hoursRestricted ? endHour : null);
        return (
          <div className={`load-box ${load.overRun || load.overDay ? "warn" : ""}`}>
            <strong>📊 예상 수집량</strong>
            <span>한 회차 단지 {load.perRun}곳{load.overRun ? ` (전체 ${load.complexes}곳 — 회차마다 ${MAX_COMPLEXES_PER_RUN}곳씩 돌아가며)` : ""} · 약 {load.pagesPerRun}페이지</span>
            <span>하루 약 {load.runsPerDay}회 · 약 {load.pagesPerDay}페이지{load.overDay ? ` (하루 상한 ${MAX_PAGES_PER_DAY}페이지에 닿으면 그날은 쉬어요)` : ""}</span>
            {(load.overRun || load.overDay) && <small>⚠️ 양이 많아요. 간격을 늘리거나 감시 단지·지역 수를 줄이면 네이버 이용 제한 위험이 줄어요.</small>}
          </div>
        );
      })()}
      {hoursRestricted && startHour > endHour && <p className="card-caption">🌙 자정을 넘겨 {startHour}시부터 다음 날 {endHour}시까지 동작해요.</p>}
      {message && <p className={`ra-msg ${message.kind === "ok" ? "ra-ok" : "ra-err"}`} role="status">{message.text}</p>}
    </section>
  );
}
