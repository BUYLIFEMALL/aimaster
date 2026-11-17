"use client";
// PLAN-20261117-01 E2 7-2 예약 링크 — 회원 설정·예약 목록 카드(WS-20261117-21 2A, Master msg_49bc5d305fbd). 계획 PLAN 7-6·7-8.
//  · 화면 스위치 BOOKING_UI.enabled(기본 false): 꺼져 있으면 아무것도 그리지 않고 서버 요청 0. 켜는 것은 서버 BOOKING_ENABLED와 함께 승인된 배포로만.
//  · 예약 명령만 기대 계정(서버가 확인한 회원 id)을 실어 부른다 — 빈 계정이면 요청 0, 409(다른 계정)면 이전 정보를 숨기고 새로고침 안내.
//    늦게 온 응답·화면을 떠난 뒤 응답은 버린다(요청 번호 + 계정 일치). 기존 캘린더 카드들은 바꾸지 않는다.
//  · 자동 확인: cron-job.org 키가 있어도 실행기가 실제로 켜져 있지 않을 수 있다(남은 일이 없으면 꺼짐) → 정해진 시각 확인을 약속하지 않고, 목록을 열 때 확인한다고만 쓴다.
import { useCallback, useEffect, useRef, useState } from "react";
import { AccountChangedError, rpc } from "@/lib/standaloneRpc";

/** 화면 스위치 — 서버 BOOKING_ENABLED(src/server/booking.ts)와 함께 켠다 */
export const BOOKING_UI = { enabled: false };

interface Settings { tz: string; days: number[]; startMin: number; endMin: number; slotMin: number; beforeMin: number; afterMin: number; maxPerDay: number; horizonDays: number; notice: string }
interface PageInfo { exists: boolean; enabled: boolean; settings: Settings; maxHorizonDays: number; token?: string | null }
interface Item { id: string; start: number; end: number; status: string; finalUnknown: boolean; name: string | null; contact: string | null; memo: string | null; createdTime: number }

const DAYS = ["일", "월", "화", "수", "목", "금", "토"];
const STATUS: Record<string, string> = { pending: "처리 중", confirmed: "확정", needs_check: "확인 필요", failed: "받지 못함", expired: "시각 지남", released: "칸 풀림" };
const hhmm = (min: number) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
const toMin = (v: string) => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(v);
  return m ? Number(m[1]) * 60 + Number(m[2]) : NaN;
};
function when(t: number, tz: string) {
  try {
    return new Intl.DateTimeFormat("ko-KR", { timeZone: tz, month: "long", day: "numeric", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(t));
  } catch {
    return new Date(t).toISOString();
  }
}

type View = { account: string; page: PageInfo; list: Item[] };

export function BookingSettingsCard({ accountKey }: { accountKey: string | null | undefined }) {
  if (!BOOKING_UI.enabled) return null;
  return <BookingCardInner accountKey={accountKey} />;
}

function BookingCardInner({ accountKey }: { accountKey: string | null | undefined }) {
  const account = typeof accountKey === "string" && accountKey.trim() ? accountKey : null;
  const [view, setView] = useState<View | null>(null);
  const [changed, setChanged] = useState<string | null>(null); // 409를 받은 계정
  const [err, setErr] = useState<{ account: string; text: string } | null>(null);
  const [busy, setBusy] = useState("");
  const [link, setLink] = useState<{ account: string; url: string } | null>(null);
  const [form, setForm] = useState<{ account: string; s: Settings } | null>(null);
  const seq = useRef(0);
  const alive = useRef(true);
  const busyRef = useRef(false);
  useEffect(() => () => {
    alive.current = false;
    seq.current++;
  }, []);

  const call = useCallback(<T,>(name: string, body: Record<string, unknown> = {}) => rpc<T>(name, body, { expectedAccount: account }), [account]);

  const load = useCallback(async () => {
    if (!account) return;
    const my = ++seq.current;
    try {
      const [page, list] = await Promise.all([call<PageInfo>("bookingGet"), call<Item[]>("bookingList")]);
      if (!alive.current || my !== seq.current) return;
      setView({ account, page, list });
      setForm({ account, s: page.settings });
      setErr(null);
    } catch (e) {
      if (!alive.current || my !== seq.current) return;
      if (e instanceof AccountChangedError) setChanged(account);
      else setErr({ account, text: (e as Error).message });
    }
  }, [account, call]);

  useEffect(() => {
    seq.current++; // 계정이 바뀌면 이전 요청 응답은 버림
    void load();
  }, [load]);

  /** 한 번에 하나만(빠른 두 번 클릭 막기) */
  const run = async (key: string, fn: () => Promise<void>) => {
    if (busyRef.current || !account) return;
    busyRef.current = true;
    setBusy(key);
    const my = seq.current;
    try {
      await fn();
    } catch (e) {
      if (!alive.current || my !== seq.current) return;
      if (e instanceof AccountChangedError) setChanged(account);
      else setErr({ account, text: (e as Error).message });
    } finally {
      busyRef.current = false;
      if (alive.current) setBusy("");
    }
  };

  const head = (
    <div className="cs-card-head"><h2>③ 예약 받기</h2><span className="rc-chip">손님이 빈 시간을 골라 예약</span></div>
  );
  if (!account || changed === account) {
    return (
      <section className="rc-form cs-card" aria-label="예약 받기">
        {head}
        <p className="rc-err" role="status">{account ? "다른 계정으로 바뀌었습니다. 화면을 새로고침해 주세요." : "로그인 정보를 확인하지 못했습니다. 화면을 새로고침해 주세요."}</p>
      </section>
    );
  }
  const v = view && view.account === account ? view : null;
  const f = form && form.account === account ? form.s : null;
  const e = err && err.account === account ? err.text : "";
  const shown = link && link.account === account ? link.url : "";
  const set = (patch: Partial<Settings>) => f && setForm({ account, s: { ...f, ...patch } });
  const afterSave = (p: PageInfo) => {
    if (!alive.current) return;
    if (p.token) setLink({ account, url: `${window.location.origin}/book/${p.token}` });
    void load();
  };

  return (
    <section className="rc-form cs-card" aria-label="예약 받기">
      {head}
      <p className="rc-hint">공개 예약 주소를 손님에게 보내면, 손님이 회원님 구글 캘린더의 빈 시간을 골라 예약합니다. 구글 계정 연결(②)이 필요합니다. 예약 기록·손님 정보는 받은 날부터 30일 뒤 지워지고, 그래서 예약은 최대 21일 앞까지만 받습니다.</p>
      <p className="rc-hint">⚠️ 구글에 일정이 들어갔는지 바로 확인하지 못한 예약은 「확인 필요」로 남고 그 시간은 다른 손님에게 열리지 않습니다. cron-job.org 키를 등록했더라도 자동 실행이 실제로 켜져 있지 않으면(남은 일이 없으면 자동으로 꺼질 수 있음) 자동 확인이 이루어지지 않으며, 이 목록을 열 때 확인합니다. 확인 시각은 보장되지 않습니다.</p>
      {e && <p className="rc-err" role="alert">{e}</p>}
      {!v || !f ? (
        <p className="rc-hint">불러오는 중…</p>
      ) : (
        <>
          <p>{v.page.enabled ? "✅ 예약 받는 중" : v.page.exists ? "⏸ 꺼져 있음(주소 닫힘)" : "아직 예약 주소가 없습니다."}</p>
          {shown && (
            <div className="rc-row-btns">
              <input readOnly value={shown} aria-label="예약 주소" onFocus={(x) => x.target.select()} />
              <button type="button" className="rc-btn ghost" onClick={() => void navigator.clipboard?.writeText(shown)}>📋 복사</button>
              <span className="rc-hint">이 주소는 지금 한 번만 보입니다. 잃어버리면 「새 주소 만들기」를 누르세요.</span>
            </div>
          )}
          <fieldset className="cs-steps" aria-label="예약 받을 요일">
            <legend>예약 받을 요일</legend>
            {DAYS.map((d, i) => (
              <label key={d} style={{ marginRight: 8 }}>
                <input type="checkbox" checked={f.days.includes(i)} onChange={(x) => set({ days: x.target.checked ? [...f.days, i].sort() : f.days.filter((n) => n !== i) })} /> {d}
              </label>
            ))}
          </fieldset>
          <div className="rc-row-btns">
            <label>시작 <input type="time" aria-label="시작 시각" value={hhmm(f.startMin)} onChange={(x) => set({ startMin: toMin(x.target.value) })} /></label>
            <label>끝 <input type="time" aria-label="끝 시각" value={hhmm(f.endMin)} onChange={(x) => set({ endMin: toMin(x.target.value) })} /></label>
            <label>한 칸 <select aria-label="한 칸 길이" value={f.slotMin} onChange={(x) => set({ slotMin: Number(x.target.value) })}>{[15, 30, 45, 60, 90, 120].map((n) => <option key={n} value={n}>{n}분</option>)}</select></label>
          </div>
          <div className="rc-row-btns">
            <label>앞 준비 <input type="number" min={0} max={120} aria-label="앞 준비 시간(분)" value={f.beforeMin} onChange={(x) => set({ beforeMin: Number(x.target.value) })} />분</label>
            <label>뒤 준비 <input type="number" min={0} max={120} aria-label="뒤 준비 시간(분)" value={f.afterMin} onChange={(x) => set({ afterMin: Number(x.target.value) })} />분</label>
            <label>하루 최대 <input type="number" min={1} max={50} aria-label="하루 최대 예약 수" value={f.maxPerDay} onChange={(x) => set({ maxPerDay: Number(x.target.value) })} />건</label>
            <label>며칠 앞까지 <input type="number" min={1} max={v.page.maxHorizonDays} aria-label="예약 받을 기간(일)" value={f.horizonDays} onChange={(x) => set({ horizonDays: Number(x.target.value) })} />일(최대 {v.page.maxHorizonDays})</label>
          </div>
          <div className="rc-row-btns">
            <label>시간대 <input aria-label="시간대" value={f.tz} onChange={(x) => set({ tz: x.target.value })} /></label>
          </div>
          <label className="rc-hint">손님에게 보일 안내(500자)<textarea aria-label="손님 안내" maxLength={500} value={f.notice} onChange={(x) => set({ notice: x.target.value })} /></label>
          <div className="rc-row-btns">
            <button type="button" className="rc-btn" disabled={!!busy} onClick={() => void run("save", async () => afterSave(await call<PageInfo>("bookingSave", { settings: f })))}>{busy === "save" ? "저장 중…" : v.page.enabled ? "💾 설정 저장" : "▶ 예약 받기 켜기"}</button>
            {v.page.enabled && (
              <>
                <button type="button" className="rc-btn ghost" disabled={!!busy} onClick={() => confirm("새 주소를 만들면 지금 주소는 바로 닫힙니다. 계속할까요?") && void run("rotate", async () => afterSave(await call<PageInfo>("bookingSave", { settings: f, rotate: true })))}>🔄 새 주소 만들기</button>
                <button type="button" className="rc-btn ghost" disabled={!!busy} onClick={() => void run("off", async () => { await call("bookingOff"); if (alive.current) setLink(null); void load(); })}>⏸ 끄기</button>
              </>
            )}
          </div>
          <h3>받은 예약</h3>
          {v.list.length === 0 ? (
            <p className="rc-hint">받은 예약이 없습니다.</p>
          ) : (
            <div className="rc-table-wrap">
              <table className="rc-table">
                <thead><tr><th>시각({f.tz})</th><th>상태</th><th>손님</th><th>연락처</th><th>메모</th><th></th></tr></thead>
                <tbody>
                  {v.list.map((x) => (
                    <tr key={x.id}>
                      <td>{when(x.start, f.tz)}</td>
                      <td>{STATUS[x.status] ?? x.status}</td>
                      <td>{x.name ?? ""}</td>
                      <td>{x.contact ?? ""}</td>
                      <td>{x.memo ?? ""}</td>
                      <td>
                        {x.status === "needs_check" && (
                          <span className="rc-row-btns">
                            <button type="button" className="rc-btn ghost" disabled={!!busy} onClick={() => void run(`p-${x.id}`, async () => { await call("bookingResolve", { id: x.id, choice: "present" }); void load(); })}>캘린더에 있음</button>
                            <button type="button" className="rc-btn ghost" disabled={!!busy} onClick={() => confirm("구글 캘린더에 이 일정이 없는 것을 확인했나요? 칸을 풀면 다른 손님이 예약할 수 있습니다.") && void run(`a-${x.id}`, async () => { await call("bookingResolve", { id: x.id, choice: "absent" }); void load(); })}>없음(칸 풀기)</button>
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </section>
  );
}
