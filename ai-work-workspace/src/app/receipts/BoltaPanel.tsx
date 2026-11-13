"use client";
// 세금계산서 바로 발급 — 볼타(2026-11-13, 플랜 docs/PLAN_20261113_U14_AND_DEFERRED.md §2-5).
// 처음 설정 4단계: 1 볼타 API 키 등록 → 2 발급자(내 사업자) 등록 → 3 공동인증서 등록 → 4 테스트 발급 확인 뒤 live_ 키로 바꾸고 실제 발급 동의.
import { useCallback, useEffect, useState } from "react";
import { rpc } from "@/lib/standaloneRpc";

interface BtStatus { keys: boolean; keyOk: boolean; mode: "test" | "live" | null; bizNo: boolean; issuer: boolean | null; cert: boolean | null; certExpires: string | null; liveAgreed: boolean; problem: string | null; webhookUrl?: boolean }

export function BoltaPanel({ notify }: { notify: (n: { text: string; error?: boolean }) => void }) {
  const [open, setOpen] = useState(false);
  const [st, setSt] = useState<BtStatus | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setSt(await rpc<BtStatus>("btStatus", {}));
    } catch (e) {
      notify({ text: (e as Error).message, error: true });
    }
  }, [notify]);
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
  const register = () => run(async () => {
    const r = await rpc<{ already: boolean }>("btRegisterIssuer", {});
    notify({ text: r.already ? "이미 볼타 발급자로 등록돼 있습니다." : "볼타 발급자로 등록했습니다." });
    await load();
  });
  const cert = () => run(async () => {
    const r = await rpc<{ url: string }>("btCertUrl", {});
    window.open(r.url, "bolta-cert", "width=640,height=760,scrollbars=yes,resizable=yes");
    notify({ text: "볼타 공동인증서 등록 창을 열었습니다(5분 안에 진행). 등록을 마친 뒤 「상태 새로고침」을 눌러 주세요." });
  });
  const agree = () => run(async () => {
    if (!window.confirm("실제 발급 키(live_)로 발급합니다. 「볼타 발급」을 누르면 국세청에 실제 세금계산서가 발급되고, 건당 요금(정발행 1건 90원, 볼타 공개 요금 기준)이 볼타 포인트에서 차감됩니다. 동의하십니까?")) return;
    await rpc("btAgreeLive", { agree: true });
    notify({ text: "실제 발급에 동의했습니다." });
    await load();
  });

  // (선택) 결과 자동 수신: 회원 전용 웹훅 주소 — 만들 때 한 번만 보여 준다
  const [hookUrl, setHookUrl] = useState("");
  const makeHook = () => run(async () => {
    if (st?.webhookUrl && !window.confirm("웹훅 주소를 새로 만들면 예전 주소는 더 이상 동작하지 않습니다. 볼타 개발자센터에 등록한 주소도 새 주소로 바꿔야 합니다. 계속할까요?")) return;
    const r = await rpc<{ url: string }>("btWebhookUrl", {});
    setHookUrl(r.url);
    void navigator.clipboard?.writeText(r.url).catch(() => {});
    notify({ text: "웹훅 주소를 만들어 복사했습니다. 이 주소는 지금만 보이니 바로 볼타 개발자센터에 등록해 주세요." });
    await load();
  });

  const step = (ok: boolean | null | undefined, label: string) => <li>{ok ? "✅" : "⬜"} {label}</li>;
  return (
    <div className="rc-card" style={{ marginBottom: 12 }}>
      <button type="button" className="rc-btn ghost" onClick={() => setOpen(!open)}>📤 볼타로 바로 발급 (선택) {open ? "▲" : "▼"}</button>
      {open && (
        <div style={{ marginTop: 8 }}>
          <p className="rc-hint">💡 홈택스 엑셀 대신 볼타(전자세금계산서 발급대행)로 바로 발급합니다. 회원님이 볼타 개발자센터에서 본인 사업자로 받은 API 키만 씁니다. <b>test_</b>로 시작하는 키는 테스트(국세청 전송·요금 없음), <b>live_</b>로 시작하는 키는 실제 발급입니다.</p>
          {st && (
            <>
              <ol style={{ listStyle: "none", paddingLeft: 0 }}>
                {step(st.keyOk, "1. 볼타 API 키 등록")}
                {step(st.issuer, "2. 「내 사업자」를 볼타 발급자로 등록")}
                {step(st.cert, `3. 공동인증서(사업자용) 등록${st.certExpires ? ` — 만료 ${st.certExpires.slice(0, 10)}` : ""}`)}
                {step(st.mode === "live" && st.liveAgreed, "4. 테스트 발급 확인 뒤 live_ 키로 바꾸고 실제 발급 동의")}
              </ol>
              <p className="rc-hint">지금 키: <b>{st.mode === "live" ? "🔴 실제 발급(live_)" : st.mode === "test" ? "🧪 테스트(test_)" : "없음"}</b></p>
              {st.problem && <p className="rc-hint">⚠️ {st.problem}</p>}
              {!st.bizNo && <p className="rc-hint">⚠️ 위 「내 사업자」에 사업자등록번호·이메일을 먼저 저장해 주세요.</p>}
              {(!st.keys || !st.keyOk) && <p className="rc-hint">➡️ <a href="/settings/keys">API키등록·플랫폼연동</a>에서 볼타 API 키를 등록해 주세요(<a href="https://docs.bolta.io" target="_blank" rel="noreferrer">볼타 개발자 문서 ↗</a>).</p>}
              <div className="rc-row-btns">
                {st.keyOk && st.bizNo && st.issuer === false && <button type="button" className="rc-btn" disabled={busy} onClick={() => void register()}>발급자 등록</button>}
                {st.issuer && <button type="button" className="rc-btn ghost" disabled={busy} onClick={() => void cert()}>🔐 공동인증서 등록 창 열기</button>}
                {st.mode === "live" && !st.liveAgreed && <button type="button" className="rc-btn ghost" disabled={busy} onClick={() => void agree()}>실제 발급 동의</button>}
                <button type="button" className="rc-btn ghost" disabled={busy} onClick={() => void load()}>상태 새로고침</button>
              </div>
              <p className="rc-hint">⚠️ 테스트 키와 실제 키는 볼타 안에서 발급자·인증서가 따로입니다. live_ 키로 바꾸면 2·3단계를 한 번 더 해 주세요. 발급은 문서마다 「📤 볼타 발급」을 직접 누를 때만 하며, 볼타가 접수한 뒤 결과가 나오면(테스트 10~30초, 실제 약 10분) 같은 버튼으로 확인합니다. 응답이 불확실하면 자동으로 다시 보내지 않습니다.</p>
              <p className="rc-hint"><b>(선택) 발급 결과 자동 기록</b> {st.webhookUrl ? "✅ 웹훅 주소 만듦" : "⬜ 웹훅 주소 없음"} — ① 「웹훅 주소 만들기」 ② 볼타 개발자센터 › 연동 › 웹훅에 그 주소 등록 ③ 거기서 보이는 서명 키(whsec_)를 <a href="/settings/keys">API키등록·플랫폼연동</a>의 「볼타 웹훅 서명 키」에 저장. 하면 「발급 결과 확인」을 다시 누르지 않아도 결과·실패 사유가 기록됩니다.</p>
              <div className="rc-row-btns">
                <button type="button" className="rc-btn ghost" disabled={busy || !st.keyOk} onClick={() => void makeHook()}>{st.webhookUrl ? "웹훅 주소 새로 만들기" : "웹훅 주소 만들기"}</button>
              </div>
              {hookUrl && <p className="rc-hint">📋 <code style={{ wordBreak: "break-all" }}>{hookUrl}</code> (복사됨 · 남에게 보여 주지 마세요)</p>}
            </>
          )}
          {!st && <p className="rc-hint">상태를 불러오는 중…</p>}
        </div>
      )}
    </div>
  );
}
