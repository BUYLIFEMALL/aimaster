"use client";
// 세금계산서 바로 발급 — 팝빌(2026-11-13, 플랜 docs/PLAN_20261113_U14_AND_DEFERRED.md §2-5).
// 처음 설정 4단계: 1 키 등록(API키등록) → 2 연동회원 가입 → 3 공동인증서 등록 → 4 테스트 발급. 실제 발급은 회원이 직접 전환(동의 1번).
import { useCallback, useEffect, useState } from "react";
import { rpc } from "@/lib/standaloneRpc";

export interface PbStatus { mode: "test" | "prod"; keys: boolean; bizNo: boolean; member: boolean | null; cert: boolean | null; balance: number | null; unitCost: number | string | null; problem: string | null }

export function PopbillPanel({ notify, onStatus }: { notify: (n: { text: string; error?: boolean }) => void; onStatus?: (s: PbStatus | null) => void }) {
  const [open, setOpen] = useState(false);
  const [st, setSt] = useState<PbStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [join, setJoin] = useState({ id: "", password: "", contactName: "", contactEmail: "", contactTel: "" });

  const load = useCallback(async () => {
    try {
      const s = await rpc<PbStatus>("pbStatus", {});
      setSt(s);
      onStatus?.(s);
    } catch (e) {
      notify({ text: (e as Error).message, error: true });
    }
  }, [notify, onStatus]);
  useEffect(() => {
    if (open && !st) void load();
  }, [open, st, load]);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      notify({ text: (e as Error).message, error: true });
    } finally {
      setBusy(false);
    }
  };
  const doJoin = () => run(async () => {
    const r = await rpc<{ message: string }>("pbJoin", join);
    notify({ text: `팝빌 연동회원 가입: ${r.message}` });
    setJoin({ ...join, password: "" });
    await load();
  });
  const doCert = () => run(async () => {
    const r = await rpc<{ url: string }>("pbCertUrl", {});
    window.open(r.url, "popbill-cert", "width=600,height=700,scrollbars=yes,resizable=yes");
    notify({ text: "팝빌 인증서 등록 창을 열었습니다. 등록을 마친 뒤 「상태 새로고침」을 눌러 주세요." });
  });
  const setMode = (mode: "test" | "prod") => run(async () => {
    if (mode === "prod" && !window.confirm("실제 발급으로 바꿉니다. 이제부터 「팝빌 발급」을 누르면 국세청에 실제 세금계산서가 발급되고, 건당 요금은 팝빌이 회원님 계정에 청구합니다. 동의하십니까?")) return;
    await rpc("pbSetMode", { mode, agree: mode === "prod" });
    notify({ text: mode === "prod" ? "실제 발급 모드로 바꿨습니다." : "테스트 모드로 바꿨습니다." });
    await load();
  });

  const step = (ok: boolean | null, label: string) => <li className={ok ? "done" : undefined}>{ok ? "✅" : "⬜"} {label}</li>;
  return (
    <div className="rc-card" style={{ marginBottom: 12 }}>
      <button type="button" className="rc-btn ghost" onClick={() => setOpen(!open)}>📤 팝빌로 바로 발급 (선택) {open ? "▲" : "▼"}</button>
      {open && (
        <div style={{ marginTop: 8 }}>
          <p className="rc-hint">💡 홈택스 엑셀 대신 팝빌(발급대행)로 바로 발급합니다. 회원님이 본인 사업자로 팝빌에 API를 신청해 받은 키만 씁니다. 처음에는 <b>테스트 모드</b>(무료 테스트 포인트)로 시험하고, 준비되면 「실제 발급으로 전환」을 누르세요. 실제 발급 요금은 팝빌이 회원님 계정에 청구합니다.</p>
          {st && (
            <>
              <ol className="rc-steps" style={{ listStyle: "none", paddingLeft: 0 }}>
                {step(st.keys, "1. 팝빌 LinkID·SecretKey 등록")}
                {step(st.member, "2. 내 사업자를 팝빌 연동회원으로 가입")}
                {step(st.cert, "3. 공동인증서(전자세금계산서용) 등록")}
                {step(st.mode === "prod", "4. 테스트 발급 확인 뒤 실제 발급으로 전환")}
              </ol>
              <p className="rc-hint">지금: <b>{st.mode === "prod" ? "🔴 실제 발급" : "🧪 테스트"}</b>{st.balance != null ? ` · 남은 포인트 ${Number(st.balance).toLocaleString()}` : ""}{st.unitCost != null ? ` · 건당 ${st.unitCost}` : ""}</p>
              {st.problem && <p className="rc-hint">⚠️ {st.problem}</p>}
              {!st.bizNo && <p className="rc-hint">⚠️ 위 「내 사업자」에 사업자등록번호를 먼저 저장해 주세요.</p>}
              {!st.keys && <p className="rc-hint">➡️ <a href="/settings/keys">API키등록·플랫폼연동</a>에서 팝빌 LinkID·SecretKey를 등록해 주세요(<a href="https://developers.popbill.com/en/guide/taxinvoice/getting-started/environment-set-up" target="_blank" rel="noreferrer">팝빌 API 신청 안내 ↗</a>).</p>}
              {st.keys && st.bizNo && st.member === false && (
                <div className="rc-grid">
                  <label>팝빌 아이디(새로 정함)<input value={join.id} onChange={(e) => setJoin({ ...join, id: e.target.value })} /></label>
                  <label>팝빌 비밀번호(8~20자, 저장하지 않음)<input type="password" value={join.password} onChange={(e) => setJoin({ ...join, password: e.target.value })} /></label>
                  <label>담당자 이름<input value={join.contactName} onChange={(e) => setJoin({ ...join, contactName: e.target.value })} /></label>
                  <label>담당자 이메일<input value={join.contactEmail} onChange={(e) => setJoin({ ...join, contactEmail: e.target.value })} /></label>
                  <label>담당자 연락처<input value={join.contactTel} onChange={(e) => setJoin({ ...join, contactTel: e.target.value })} /></label>
                  <div><button type="button" className="rc-btn" disabled={busy} onClick={() => void doJoin()}>연동회원 가입</button></div>
                </div>
              )}
              <div className="rc-row-btns">
                {st.member && <button type="button" className="rc-btn ghost" disabled={busy} onClick={() => void doCert()}>🔐 공동인증서 등록 창 열기</button>}
                {st.member && st.mode === "test" && <button type="button" className="rc-btn ghost" disabled={busy || !st.cert} onClick={() => void setMode("prod")}>실제 발급으로 전환</button>}
                {st.mode === "prod" && <button type="button" className="rc-btn ghost" disabled={busy} onClick={() => void setMode("test")}>테스트로 되돌리기</button>}
                <button type="button" className="rc-btn ghost" disabled={busy} onClick={() => void load()}>상태 새로고침</button>
              </div>
              <p className="rc-hint">⚠️ 테스트와 실제는 팝빌 안에서 회원가입·인증서가 따로입니다. 실제로 전환하면 2·3단계를 실제 서버에서 한 번 더 해야 할 수 있습니다. 발급은 문서마다 「📤 팝빌 발급」을 직접 누를 때만 하며, 응답이 불확실하면 자동으로 다시 보내지 않습니다.</p>
            </>
          )}
          {!st && <p className="rc-hint">상태를 불러오는 중…</p>}
        </div>
      )}
    </div>
  );
}
