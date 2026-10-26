"use client";

// 📅 주간 리포트(D, 2026-10-26): 고른 요일의 그날 첫 수집 뒤 7일 변화를 한 번 보낸다(텔레그램·메일·카톡). 바꾸면 바로 저장.
import { useState, useTransition } from "react";
import { saveWeeklyAction } from "@/lib/actions/settings";

const DAYS = ["일", "월", "화", "수", "목", "금", "토"];

export default function WeeklyReportCard({ initial }: { initial: { enabled: boolean; day: number } }) {
  const [enabled, setEnabled] = useState(initial.enabled);
  const [day, setDay] = useState(initial.day);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const save = (next: { enabled?: boolean; day?: number }) => start(async () => {
    const r = await saveWeeklyAction(next);
    setMsg(r.error ? { kind: "err", text: r.error } : { kind: "ok", text: "저장됐어요." });
  });
  return (
    <section className="card">
      <div className="ra-item-head">
        <h2 className="card-title">📅 주간 리포트</h2>
        <button type="button" className={`ra-toggle big ${enabled ? "on" : ""}`} disabled={pending} onClick={() => { const v = !enabled; setEnabled(v); save({ enabled: v }); }}>
          {enabled ? "받기 ON" : "받기 OFF"}
        </button>
      </div>
      <p className="lede">일주일에 한 번, 감시 단지들의 7일 변화(매물 수·매매 평균·새 매물·가격 내림/오름·사라짐·실거래 대비)와 여러 번 내린 매물·오래 안 팔린 매물을 한 장으로 보내 드려요.</p>
      <div className="ra-grid">
        <div className="field">
          <label htmlFor="weekly-day">보내는 요일</label>
          <select id="weekly-day" value={day} disabled={pending || !enabled} onChange={(e) => { const v = Number(e.target.value); setDay(v); save({ day: v }); }}>
            {DAYS.map((d, i) => <option key={d} value={i}>{d}요일</option>)}
          </select>
        </div>
      </div>
      <p className="card-caption">💡 그 요일의 첫 수집이 끝나면 보내요. 그날 PC가 꺼져 있었으면 그 주 안의 다음 수집 때 보내요. 텔레그램·메일·카톡 중 연결한 곳으로 가고, 🤖 AI 시세 요약을 켠 회원은 AI 주간 정리(본인 키, 주 1회)도 붙어요. 처음 켜면 이번 주 리포트가 다음 수집 때 바로 갈 수 있어요.</p>
      {msg && <p className={`ra-msg ${msg.kind === "ok" ? "ra-ok" : "ra-err"}`} role="status">{msg.text}</p>}
    </section>
  );
}
