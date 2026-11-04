"use client";
// 모집 방식 세 가지와 하루 상한·동작 시간대를 한 화면에서 한 번에 저장한다(같은 설정은 이곳 한 군데).
import { useEffect, useRef, useState } from "react";
import { recruit, hhmm, toMinute, type Settings } from "./call";

export function SettingsForm() {
  const [s, setS] = useState<Settings | null>(null), [form, setForm] = useState({ known: true, promo: true, extract: false, consent: false, cap: 20, start: "09:00", end: "22:00" });
  const [msg, setMsg] = useState(""), [busy, setBusy] = useState(false); const lock = useRef(false);
  const load = async () => {
    try { const v = await recruit<Settings>("settings_get"); setS(v); setForm({ known: v.mode_known, promo: v.mode_promo, extract: v.mode_extract, consent: false, cap: v.daily_cap, start: hhmm(v.active_start_minute), end: hhmm(v.active_end_minute) }); }
    catch (e) { setMsg(e instanceof Error ? e.message : "설정을 불러오지 못했습니다."); }
  };
  useEffect(() => { void load(); }, []);
  async function save() {
    if (lock.current) return; lock.current = true; setBusy(true); setMsg("저장 중…");
    try {
      const start = toMinute(form.start), end = toMinute(form.end);
      if (!Number.isFinite(start) || !Number.isFinite(end)) throw new Error("동작 시간대를 확인해 주세요.");
      if (form.extract && !s?.extract_consent_at && !form.consent) throw new Error("「카페 활동 회원」 방식은 책임 고지에 동의해야 켜집니다.");
      await recruit("settings_save", { mode_known: form.known, mode_promo: form.promo, mode_extract: form.extract, consent: form.consent, daily_cap: form.cap, active_start_minute: start, active_end_minute: end });
      setMsg("저장했습니다."); await load();
    } catch (e) { setMsg(e instanceof Error ? e.message : "저장 결과를 확인하지 못했습니다."); }
    finally { lock.current = false; setBusy(false); }
  }
  if (!s) return <p className="text-sm text-slate-500">{msg || "설정을 불러오는 중…"}</p>;
  const card = "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm";
  return <div className="space-y-4">
    <section className={card}>
      <h2 className="text-lg font-bold text-slate-900">초대할 사람을 얻는 방식 (여러 개 켤 수 있음)</h2>
      <label className="mt-4 flex gap-3 text-sm"><input type="checkbox" className="mt-1" checked={form.known} onChange={e => setForm({ ...form, known: e.target.checked })} />
        <span><b>👋 B. 아는 사람</b> — 내가 직접 넣은 네이버 아이디(서로이웃·지인)에게만 초대합니다. <span className="text-emerald-700">추천</span></span></label>
      <label className="mt-3 flex gap-3 text-sm"><input type="checkbox" className="mt-1" checked={form.promo} onChange={e => setForm({ ...form, promo: e.target.checked })} />
        <span><b>📣 C. 카페 홍보 글</b> — 초대 대신, 내가 가입한 카페 게시판에 내 카페 소개 글을 올립니다(「네이버 카페 포스팅 자동화」와 같은 방식, 카페 규칙 안에서).</span></label>
      <label className="mt-3 flex gap-3 text-sm"><input type="checkbox" className="mt-1" checked={form.extract} onChange={e => setForm({ ...form, extract: e.target.checked })} />
        <span><b>🔎 A. 카페 활동 회원</b> — 내가 운영·가입한 카페의 공유 가능한 글 작성자 중에서 고릅니다. 내가 로그인한 브라우저에서만 확장이 읽습니다. <span className="text-amber-700">기본 꺼짐</span></span></label>
      {form.extract && !s.extract_consent_at && <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <p className="font-semibold">⚠️ 책임 고지 (A 방식을 켤 때 한 번)</p>
        <p className="mt-1">네이버 이용약관 위반·계정 제재·법적 책임 등 이 방식 사용으로 생기는 결과는 회원 본인 책임입니다. 프로그램은 회원 본인 로그인 상태에서만, 하루 상한·동작 시간대 안에서, 네이버 제한 안내가 뜨면 그날 멈추도록 동작합니다. 이메일·전화번호는 모으지 않습니다.</p>
        <label className="mt-2 flex gap-2"><input type="checkbox" checked={form.consent} onChange={e => setForm({ ...form, consent: e.target.checked })} />위 내용을 이해했고 동의합니다.</label>
      </div>}
      {s.extract_consent_at && <p className="mt-2 text-xs text-slate-500">A 방식 책임 고지 동의: {new Date(s.extract_consent_at).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}</p>}
    </section>
    <section className={card}>
      <h2 className="text-lg font-bold text-slate-900">안전 장치</h2>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3 text-sm">
        <label className="grid gap-1">하루 초대 상한(최대 25)<input className="rounded-lg border px-3 py-2" type="number" min={1} max={25} value={form.cap} onChange={e => setForm({ ...form, cap: Number(e.target.value) })} /></label>
        <label className="grid gap-1">동작 시작<input className="rounded-lg border px-3 py-2" type="time" value={form.start} onChange={e => setForm({ ...form, start: e.target.value })} /></label>
        <label className="grid gap-1">동작 끝<input className="rounded-lg border px-3 py-2" type="time" value={form.end} onChange={e => setForm({ ...form, end: e.target.value })} /></label>
      </div>
      <p className="mt-3 text-xs text-slate-500">네이버 초대 제한(계정당 하루 50건)의 절반 이하로 시작합니다. 제한 안내(권한 없음·한도 초과 등)가 뜨면 그날은 더 보내지 않고, 같은 사람에게 같은 카페 초대를 두 번 보내지 않습니다. 오늘 보낸 초대: {s.used_today}건.</p>
    </section>
    <div className="flex items-center gap-3"><button disabled={busy} onClick={() => void save()} className="rounded-xl bg-[#03c75a] px-5 py-3 font-bold text-white shadow disabled:opacity-50">설정 저장</button>
      {msg && <p role="status" className="text-sm text-slate-700">{msg}</p>}</div>
  </div>;
}
