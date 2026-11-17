"use client";
// PLAN-20261117-01 E2 7-2 예약 링크 — 손님 예약 화면(WS-20261117-21 2A, Master msg_49bc5d305fbd·msg_1587ff55b8b7). 계획 PLAN 7-6·7-8.
//  · 화면 스위치 BOOKING_FORM_UI.enabled(기본 false): 꺼져 있으면 아무것도 그리지 않고 요청 0. 서버 BOOKING_ENABLED와 함께 승인된 배포로만 켠다.
//  · 공개 페이지(2단계 배선, 아직 없음)가 서버에서 bookingSlots 결과를 받아 이 화면에 넘기고, 제출은 /api/public/submitBooking(공개 입구)로 보낸다.
//  · 제출 중에는 다시 누를 수 없고(즉시 잠금), 결과를 모르면(연결 끊김·서버 오류) 다시 제출하라고 하지 않는다 — 같은 예약이 두 번 생기지 않게.
//  · 손님에게 자동으로 연락하는 기능은 없으므로 「연락드립니다」를 약속하지 않고, 예약 담당자 확인이 필요하다고만 안내한다.
//  · 손님 입력은 기록(console)에 남기지 않는다. 시각은 회원 시간대 기준 + 손님 브라우저 시간대가 다르면 함께 보여 준다.
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";

/** 화면 스위치 — 서버 BOOKING_ENABLED(src/server/booking.ts)와 함께. 2026-11-17 WS-20261117-22 주인님 승인으로 v1.57부터 켬 */
export const BOOKING_FORM_UI = { enabled: true };

export interface SlotsViewProps { tz: string; notice: string; slotMin: number; slots: { start: number; end: number }[]; unavailable: boolean }

type Phase =
  | { kind: "pick" }
  | { kind: "sending" }
  | { kind: "confirmed" }
  | { kind: "received" }
  | { kind: "unknown" }
  | { kind: "closed" };

const fmt = (t: number, tz: string, opts: Intl.DateTimeFormatOptions) => {
  try {
    return new Intl.DateTimeFormat("ko-KR", { timeZone: tz, hourCycle: "h23", ...opts }).format(new Date(t));
  } catch {
    return new Date(t).toISOString();
  }
};

export function BookingForm(props: { token: string; view: SlotsViewProps; guestTz?: string; submitUrl?: string }) {
  if (!BOOKING_FORM_UI.enabled) return null;
  return <BookingFormInner {...props} />;
}

function BookingFormInner({ token, view, guestTz, submitUrl = "/api/public/submitBooking" }: { token: string; view: SlotsViewProps; guestTz?: string; submitUrl?: string }) {
  const myTz = useMemo(() => {
    if (guestTz) return guestTz;
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return view.tz;
    }
  }, [guestTz, view.tz]);
  const [picked, setPicked] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [memo, setMemo] = useState("");
  const [phase, setPhase] = useState<Phase>({ kind: "pick" });
  const [error, setError] = useState("");
  const sending = useRef(false);
  // QA025(2026-11-17): 세대 번호 — 화면이 붙을 때마다(StrictMode 다시 붙기 포함)·주소(token)가 바뀔 때마다 새 번호.
  // 앞 세대에서 보낸 요청의 응답은 화면을 바꾸지 않는다. 새 세대는 처음 상태(고르기)에서 다시 시작.
  const gen = useRef(0);
  useEffect(() => {
    const g = ++gen.current;
    sending.current = false;
    setPicked(null);
    setPhase({ kind: "pick" });
    setError("");
    return () => {
      if (gen.current === g) gen.current++;
    };
  }, [token]);

  const days = useMemo(() => {
    const m = new Map<string, number[]>();
    for (const s of view.slots) {
      const k = fmt(s.start, view.tz, { month: "long", day: "numeric", weekday: "short" });
      m.set(k, [...(m.get(k) ?? []), s.start]);
    }
    return [...m.entries()];
  }, [view.slots, view.tz]);
  const differentTz = myTz !== view.tz;
  const timeLabel = (t: number) => {
    const base = fmt(t, view.tz, { hour: "2-digit", minute: "2-digit" });
    return differentTz ? `${base} (내 시간 ${fmt(t, myTz, { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })})` : base;
  };

  const submit = async () => {
    if (sending.current || picked === null) return; // 빠른 두 번 클릭·결과 뒤 재제출 막기
    if (!name.trim() || !contact.trim()) {
      setError("이름과 연락처를 적어 주세요.");
      return;
    }
    const g = gen.current;
    sending.current = true;
    setError("");
    setPhase({ kind: "sending" });
    let res: Response;
    try {
      res = await fetch(submitUrl, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token, start: picked, name: name.trim(), contact: contact.trim(), memo: memo.trim() }) });
    } catch {
      if (g === gen.current) setPhase({ kind: "unknown" }); // 보냈는지 모름 — 다시 제출하게 하지 않음
      return;
    }
    const body = (await res.json().catch(() => null)) as { ok?: boolean; status?: string; error?: string; message?: string } | null;
    if (g !== gen.current) return; // 앞 세대(다른 주소·다시 붙기 전) 응답은 버림
    if (res.status === 404) return setPhase({ kind: "closed" });
    if (res.ok && body?.ok === true && body.status === "confirmed") return setPhase({ kind: "confirmed" });
    if (res.ok && body?.ok === true && body.status === "received") return setPhase({ kind: "received" });
    if ((res.ok && body?.ok === false) || res.status === 429 || res.status === 400) {
      // 서버가 확실히 거절한 경우(칸 찼음·입력 오류·한도) — 다른 시간을 고를 수 있게 다시 연다
      sending.current = false;
      setPicked(null);
      setError(body?.error ?? body?.message ?? "예약하지 못했습니다. 다른 시간을 골라 주세요.");
      setPhase({ kind: "pick" });
      return;
    }
    setPhase({ kind: "unknown" }); // 그 밖(5xx·형식 모름) — 결과를 모르니 다시 제출하게 하지 않음
  };

  const box = (children: ReactNode) => (
    <section aria-label="예약하기" style={{ maxWidth: 640, margin: "0 auto", background: "#fff", border: "1px solid #e9e9e7", borderRadius: 12, padding: "28px 24px" }}>{children}</section>
  );
  if (phase.kind === "confirmed") return box(<p role="status">✅ 예약이 완료됐습니다. {picked !== null && timeLabel(picked)}</p>);
  if (phase.kind === "received") return box(<p role="status">📨 예약 신청이 접수됐습니다. 아직 확정 전이며 예약 담당자의 확인이 필요합니다. 다시 신청하지 마세요.</p>);
  if (phase.kind === "unknown") return box(<p role="status">⚠️ 예약 결과를 확인하지 못했습니다. 이미 접수됐을 수 있으니 다시 신청하지 마시고, 예약 담당자에게 확인을 요청해 주세요.</p>);
  if (phase.kind === "closed") return box(<p role="status">이 예약 주소는 닫혔습니다.</p>);

  return box(
    <>
      <p style={{ margin: 0, fontSize: 13, color: "#787774" }}>📅 예약하기 · 시간은 {view.tz} 기준{differentTz ? `(괄호 안은 내 시간 ${myTz})` : ""}</p>
      {view.notice && <p style={{ whiteSpace: "pre-wrap" }}>{view.notice}</p>}
      {view.unavailable ? (
        <p role="status">지금은 빈 시간을 불러오지 못했습니다. 잠시 후 다시 열어 주세요.</p>
      ) : days.length === 0 ? (
        <p role="status">지금 예약할 수 있는 시간이 없습니다.</p>
      ) : (
        days.map(([day, starts]) => (
          <div key={day} style={{ margin: "12px 0" }}>
            <p style={{ margin: "0 0 6px", fontWeight: 600 }}>{day}</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {starts.map((t) => (
                <button key={t} type="button" aria-pressed={picked === t} disabled={phase.kind === "sending"} onClick={() => setPicked(t)} style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #d3d3d0", background: picked === t ? "#4f46e5" : "#fff", color: picked === t ? "#fff" : "#37352f" }}>
                  {timeLabel(t)}
                </button>
              ))}
            </div>
          </div>
        ))
      )}
      {picked !== null && (
        <div style={{ display: "grid", gap: 8, marginTop: 16 }}>
          <label>이름 <input aria-label="이름" maxLength={50} value={name} onChange={(e) => setName(e.target.value)} disabled={phase.kind === "sending"} /></label>
          <label>연락처 <input aria-label="연락처" maxLength={100} value={contact} onChange={(e) => setContact(e.target.value)} disabled={phase.kind === "sending"} /></label>
          <label>메모(선택) <textarea aria-label="메모" maxLength={500} value={memo} onChange={(e) => setMemo(e.target.value)} disabled={phase.kind === "sending"} /></label>
          <p style={{ fontSize: 12, color: "#787774", margin: 0 }}>적어 주신 이름·연락처·메모는 예약을 받은 회원만 보며, 받은 날부터 30일 뒤 지워집니다.</p>
          <button type="button" onClick={() => void submit()} disabled={phase.kind === "sending"}>{phase.kind === "sending" ? "보내는 중…" : "예약하기"}</button>
        </div>
      )}
      {error && <p role="alert" style={{ color: "#c4320a" }}>{error}</p>}
    </>,
  );
}
