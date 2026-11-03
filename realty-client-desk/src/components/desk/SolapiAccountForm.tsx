"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { SignupLinks } from "@/components/desk/SignupLinks";
import {
  checkSolapiBalanceAction,
  deleteSolapiAccountAction,
  saveSolapiAccountAction,
  testSolapiSmsAction,
  type SolapiAccountActionState,
} from "@/lib/actions/solapiAccount";

export type SolapiData = { api_key: string; sender_phone: string } | null;

const mask = (k: string) => (k.length <= 8 ? "••••••••" : `${k.slice(0, 4)}••••${k.slice(-4)}`);

// 회원 본인 SOLAPI 계정(다른 AIMaster 프로그램과 같은 공용 칸 — 한 번 등록하면 함께 씀). 실거래 프로그램 화면과 같은 흐름.
export function SolapiAccountForm({ account }: { account: SolapiData }) {
  const router = useRouter();
  const [editing, setEditing] = useState(!account);
  const [state, action, pending] = useActionState<SolapiAccountActionState, FormData>(async (p, fd) => {
    const r = await saveSolapiAccountAction(p, fd);
    if (r.success) { setEditing(false); router.refresh(); }
    return r;
  }, {});
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [testPhone, setTestPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function run(fn: () => Promise<{ ok: boolean; text: string }>) {
    setBusy(true);
    setMsg(null);
    try { setMsg(await fn()); } finally { setBusy(false); }
  }

  return (
    <div className="mx-card space-y-3 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold text-mx-text">💬 문자 발송 (본인 SOLAPI 계정)</h2>
        <div className="flex flex-wrap items-center gap-2">
          <SignupLinks links={[{ label: "SOLAPI 가입하기", href: "https://solapi.com/" }, { label: "API 키 만들기", href: "https://console.solapi.com/credentials" }]} />
          {account && !editing && <button type="button" onClick={() => setEditing(true)} className="mx-btn-ghost min-h-[40px] px-3 text-xs">✏️ 수정</button>}
        </div>
      </div>
      <p className="text-sm text-mx-muted">
        <a href="https://solapi.com/" target="_blank" rel="noreferrer" className="text-mx-link underline">solapi.com</a>에서 받은 API Key·Secret과 등록한 발신번호를 넣어 주세요. 문자 요금은 본인 SOLAPI 계정에서 나가요.
      </p>
      {account && !editing ? (
        <div className="space-y-2 text-sm text-mx-text">
          <p>API Key: <span className="font-mono">{mask(account.api_key)}</span> · 발신번호: {account.sender_phone}</p>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" disabled={busy} onClick={() => run(async () => { const r = await checkSolapiBalanceAction(); return r.error ? { ok: false, text: r.error } : { ok: true, text: `잔액 ${(r.balance ?? 0).toLocaleString()}원 · 포인트 ${(r.point ?? 0).toLocaleString()}` }; })} className="mx-btn-ghost min-h-[40px] px-3 text-xs">💰 잔액 확인</button>
            {confirmDelete ? (
              <>
                <span className="text-xs text-mx-danger">다른 프로그램의 문자 발송도 멈춰요. 지울까요?</span>
                <button type="button" disabled={busy} onClick={() => run(async () => { await deleteSolapiAccountAction(); setConfirmDelete(false); router.refresh(); return { ok: true, text: "지웠어요." }; })} className="mx-btn-danger min-h-[40px] px-3 text-xs">네, 지우기</button>
                <button type="button" onClick={() => setConfirmDelete(false)} className="mx-btn-ghost min-h-[40px] px-3 text-xs">취소</button>
              </>
            ) : (
              <button type="button" onClick={() => setConfirmDelete(true)} className="mx-btn-ghost min-h-[40px] px-3 text-xs">🗑 삭제</button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input value={testPhone} onChange={(e) => setTestPhone(e.target.value)} placeholder="시험 문자 받을 본인 번호" className="mx-input min-w-[200px] flex-1" />
            <button type="button" disabled={busy} onClick={() => run(async () => { const r = await testSolapiSmsAction(testPhone); return r.error ? { ok: false, text: r.error } : { ok: true, text: "시험 문자를 보냈어요." }; })} className="mx-btn-ghost min-h-[40px] px-3 text-xs">✉️ 시험 문자</button>
          </div>
        </div>
      ) : (
        <form action={action} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <input name="apiKey" required autoComplete="off" defaultValue={account?.api_key ?? ""} placeholder="API Key" className="mx-input" />
            <input name="apiSecret" type="password" required autoComplete="new-password" placeholder={account ? "API Secret(새로 입력)" : "API Secret"} className="mx-input" />
            <input name="senderPhone" required defaultValue={account?.sender_phone ?? ""} placeholder="발신번호 (예: 01012345678)" className="mx-input" />
          </div>
          {state.error && <p className="text-sm text-mx-danger">{state.error}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={pending} className="mx-btn-primary min-h-[44px] px-4 text-sm disabled:opacity-60">{pending ? "저장 중…" : "저장"}</button>
            {account && <button type="button" onClick={() => setEditing(false)} className="mx-btn-ghost min-h-[44px] px-4 text-sm">취소</button>}
          </div>
        </form>
      )}
      {msg && <p className={`text-sm ${msg.ok ? "text-mx-success" : "text-mx-danger"}`}>{msg.text}</p>}
    </div>
  );
}
