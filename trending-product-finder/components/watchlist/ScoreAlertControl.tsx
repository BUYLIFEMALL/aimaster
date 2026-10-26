"use client";

import { useState } from "react";
import { updateScoreAlertThresholdAction, type WatchlistEntry } from "@/lib/actions/watchlist";

// EC-W7(2026-10-26): 매일 자동 리포트가 만들어질 때 「기회 점수 ○점 이상」 키워드가 있을 때만, 그 키워드만 알림.
// 끄면 예전처럼 리포트 전체를 알린다. 알림 채널은 설정 화면 「📣 리포트 자동 알림」에 등록한 회원 본인 계정.
const OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "끔 — 매일 리포트 전체 알림" },
  { value: "60", label: "60점 이상만" },
  { value: "70", label: "70점 이상만" },
  { value: "80", label: "80점 이상만" },
  { value: "90", label: "90점 이상만" },
];

export function ScoreAlertControl({ entry, onUpdated }: { entry: WatchlistEntry; onUpdated: (entry: WatchlistEntry) => void }) {
  const current = entry.scoreAlertThreshold == null ? "" : String(entry.scoreAlertThreshold);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function change(value: string) {
    setSaving(true);
    setError(null);
    const fd = new FormData();
    fd.set("id", entry.id);
    fd.set("threshold", value);
    const res = await updateScoreAlertThresholdAction(fd);
    setSaving(false);
    if (res.error) setError(res.error);
    else if (res.entry) onUpdated(res.entry);
  }

  const known = OPTIONS.some((o) => o.value === current);
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-mx-border bg-mx-raised px-3 py-2 text-xs text-mx-text">
      <span className="font-semibold">🔔 기회 점수 알림</span>
      <select
        value={current}
        disabled={saving}
        onChange={(e) => change(e.target.value)}
        className="input-sm w-auto"
        aria-label="기회 점수 알림 기준"
      >
        {!known && <option value={current}>{current}점 이상만</option>}
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <span className="text-[11px] text-mx-muted">
        {current ? `자동 리포트에서 ${current}점 이상 키워드가 나올 때만 그 키워드를 보냅니다.` : "자동 리포트가 만들어지면 결과 전체를 보냅니다."}
      </span>
      {saving && <span className="text-[11px] text-mx-muted">저장 중…</span>}
      {error && <span className="text-[11px] text-mx-danger">{error}</span>}
    </div>
  );
}
