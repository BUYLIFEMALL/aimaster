"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  checkSolapiBalanceAction,
  deleteSolapiAccountAction,
  saveSolapiAccountAction,
  testSolapiSmsAction,
  type SolapiAccountActionState,
} from "@/lib/actions/solapiAccount";

export interface SolapiAccountData {
  api_key: string;
  sender_phone: string;
  kakao_pf_id: string | null;
}

function maskApiKey(key: string): string {
  if (key.length <= 8) return "••••••••";
  return `${key.slice(0, 4)}••••${key.slice(-4)}`;
}

const initialState: SolapiAccountActionState = {};

export function SolapiAccountSection({ account }: { account: SolapiAccountData | null }) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(!account);
  const [state, formAction, isPending] = useActionState(saveSolapiAccountAction, initialState);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCheckingBalance, setIsCheckingBalance] = useState(false);
  const [balance, setBalance] = useState<{ balance: number; point: number } | null>(null);
  const [balanceError, setBalanceError] = useState<string | null>(null);
  const [testPhone, setTestPhone] = useState("");
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    if (state.success) setIsEditing(false);
  }, [state.success]);

  async function handleDelete() {
    if (!confirm("SOLAPI 계정을 삭제할까요? 카카오톡/문자 알림이 중단됩니다.")) return;
    setIsDeleting(true);
    try {
      await deleteSolapiAccountAction();
      router.refresh();
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleCheckBalance() {
    setBalanceError(null);
    setIsCheckingBalance(true);
    try {
      const result = await checkSolapiBalanceAction();
      if (result.error) setBalanceError(result.error);
      else setBalance({ balance: result.balance ?? 0, point: result.point ?? 0 });
    } finally {
      setIsCheckingBalance(false);
    }
  }

  async function handleTestSms() {
    setTestResult(null);
    setIsTesting(true);
    try {
      const result = await testSolapiSmsAction(testPhone);
      if (result.error) setTestResult({ ok: false, message: result.error });
      else setTestResult({ ok: true, message: "테스트 문자를 발송했습니다." });
    } finally {
      setIsTesting(false);
    }
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium text-neutral-100">💬 카카오톡/문자 알림 (SOLAPI)</h2>
          <p className="text-sm text-neutral-400">
            <a href="https://solapi.com/" target="_blank" rel="noreferrer" className="text-gold-light hover:underline">
              solapi.com
            </a>
            에서 발급받은 키와 발신번호를 등록하면, 새 실거래 알림을 문자·카카오톡으로도 받을 수 있어요.
          </p>
        </div>
        {account && !isEditing && (
          <button type="button" onClick={() => setIsEditing(true)} className="text-xs text-gold-light hover:underline">
            ✏️ 수정
          </button>
        )}
      </div>

      <div>
        {account && !isEditing ? (
          <div className="space-y-3 rounded-xl border border-white/5 bg-dark-50 p-4">
            <p className="text-sm text-neutral-300">
              API Key: <span className="font-mono">{maskApiKey(account.api_key)}</span>
            </p>
            <p className="text-sm text-neutral-300">발신번호: {account.sender_phone}</p>
            <p className="text-sm text-neutral-300">
              카카오 채널(pfId):{" "}
              {account.kakao_pf_id ?? <span className="text-neutral-500">미등록 — 카카오톡 알림 안 됨</span>}
            </p>

            <div className="flex flex-wrap items-center gap-3 border-t border-white/10 pt-3">
              <button
                type="button"
                onClick={handleCheckBalance}
                disabled={isCheckingBalance}
                className="text-xs text-gold-light hover:underline disabled:opacity-60"
              >
                {isCheckingBalance ? "조회 중..." : "💰 잔액 조회"}
              </button>
              <button type="button" onClick={handleDelete} disabled={isDeleting} className="text-xs text-red-400 hover:underline disabled:opacity-60">
                {isDeleting ? "삭제 중..." : "삭제"}
              </button>
            </div>
            {balance && (
              <p className="text-sm text-neutral-300">
                잔액: <span className="font-medium text-neutral-100">{balance.balance.toLocaleString()}원</span> · 포인트:{" "}
                <span className="font-medium text-neutral-100">{balance.point.toLocaleString()}</span>
              </p>
            )}
            {balanceError && <p className="text-xs text-red-400">{balanceError}</p>}

            <div className="flex flex-wrap items-center gap-2 border-t border-white/10 pt-3">
              <Input
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                placeholder="테스트로 받을 본인 번호 (예: 01012345678)"
                className="min-w-[200px] flex-1"
              />
              <Button type="button" variant="secondary" onClick={handleTestSms} disabled={isTesting}>
                {isTesting ? "발송 중..." : "✉️ 테스트 문자 발송"}
              </Button>
            </div>
            {testResult && <p className={`text-xs ${testResult.ok ? "text-green-400" : "text-red-400"}`}>{testResult.message}</p>}
          </div>
        ) : (
          <form action={formAction} className="space-y-3 rounded-xl border border-white/5 bg-dark-50 p-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs text-neutral-400">API Key</label>
                <Input name="apiKey" required defaultValue={account?.api_key ?? ""} autoComplete="off" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-neutral-400">API Secret</label>
                <Input
                  name="apiSecret"
                  type="password"
                  required
                  autoComplete="new-password"
                  placeholder={account ? "변경하려면 새로 입력" : ""}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs text-neutral-400">발신번호</label>
                <Input name="senderPhone" required defaultValue={account?.sender_phone ?? ""} placeholder="01012345678" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-neutral-400">카카오 채널 ID (pfId, 선택)</label>
                <Input name="kakaoPfId" defaultValue={account?.kakao_pf_id ?? ""} placeholder="KA01PF..." />
              </div>
            </div>
            {state.error && <p className="text-xs text-red-400">{state.error}</p>}
            <div className="flex gap-2">
              <Button type="submit" variant="primary" disabled={isPending}>
                {isPending ? "저장 중..." : "저장"}
              </Button>
              {account && (
                <Button type="button" variant="ghost" onClick={() => setIsEditing(false)} disabled={isPending}>
                  취소
                </Button>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
