"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import {
  checkSolapiBalanceAction,
  deleteSolapiAccountAction,
  saveSolapiAccountAction,
  testSolapiSmsAction,
} from "@/lib/actions/solapiAccount";

export interface SolapiAccountData {
  api_key: string;
  sender_phone: string;
  kakao_pf_id: string | null;
  rcs_brand_id: string | null;
}

function maskApiKey(key: string): string {
  if (key.length <= 8) return "••••••••";
  return `${key.slice(0, 4)}••••${key.slice(-4)}`;
}

// trending-product-finder/components/settings/SolapiAccountSection.tsx와 동일한 기능을,
// 이 프로젝트의 Input/Button 컴포넌트와 팔레트(노랑, 카카오 브랜드 컬러)로 다시 구성했다.
export function SolapiAccountSection({ account }: { account: SolapiAccountData | null }) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(!account);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCheckingBalance, setIsCheckingBalance] = useState(false);
  const [balance, setBalance] = useState<{ balance: number; point: number } | null>(null);
  const [balanceError, setBalanceError] = useState<string | null>(null);
  const [testPhone, setTestPhone] = useState("");
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaveError(null);
    setIsSaving(true);
    try {
      const result = await saveSolapiAccountAction(new FormData(e.currentTarget));
      if (result.error) {
        setSaveError(result.error);
      } else {
        setIsEditing(false);
        router.refresh();
      }
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("SOLAPI 계정을 삭제할까요? 카카오톡 리포트 발송이 중단됩니다.")) return;
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
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-neutral-900">💬 카카오톡 채널 연동 (SOLAPI)</h2>
        {account && !isEditing && (
          <button type="button" onClick={() => setIsEditing(true)} className="text-xs font-bold text-yellow-700 hover:underline">
            ✏️ 수정
          </button>
        )}
      </div>
      <p className="text-xs text-neutral-500">
        <a href="https://solapi.com/" target="_blank" rel="noreferrer" className="font-semibold text-yellow-700 hover:underline">
          solapi.com
        </a>
        에서 발급받은 API Key/Secret과, SOLAPI에 등록·인증된 발신번호를 등록하세요. 카카오톡
        채널로 리포트를 받으려면 카카오 비즈니스 채널 ID(pfId)도 함께 등록해야 합니다(SMS
        테스트만 쓸 거면 비워둬도 됩니다).
      </p>

      {account && !isEditing ? (
        <div className="space-y-3 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
          <p className="text-sm text-neutral-700">
            API Key: <span className="font-mono">{maskApiKey(account.api_key)}</span>
          </p>
          <p className="text-sm text-neutral-700">발신번호: {account.sender_phone}</p>
          <p className="text-sm text-neutral-700">
            카카오 채널(pfId): {account.kakao_pf_id ?? <span className="text-neutral-400">미등록 — 리포트 카카오톡 발송 안 됨</span>}
          </p>

          <div className="flex flex-wrap items-center gap-3 border-t border-neutral-200 pt-3">
            <button
              type="button"
              onClick={handleCheckBalance}
              disabled={isCheckingBalance}
              className="text-xs font-semibold text-yellow-700 hover:underline disabled:opacity-60"
            >
              {isCheckingBalance ? "조회 중..." : "💰 잔액 조회"}
            </button>
            <button type="button" onClick={handleDelete} disabled={isDeleting} className="text-xs font-semibold text-red-500 hover:underline disabled:opacity-60">
              {isDeleting ? "삭제 중..." : "삭제"}
            </button>
          </div>
          {balance && (
            <p className="text-sm text-neutral-700">
              잔액: <span className="font-bold text-neutral-900">{balance.balance.toLocaleString()}원</span> · 포인트:{" "}
              <span className="font-bold text-neutral-900">{balance.point.toLocaleString()}</span>
            </p>
          )}
          {balanceError && <p className="text-xs text-red-600">{balanceError}</p>}

          <div className="flex flex-wrap items-center gap-2 border-t border-neutral-200 pt-3">
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
          {testResult && <p className={`text-xs ${testResult.ok ? "text-emerald-600" : "text-red-600"}`}>{testResult.message}</p>}
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-3 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-neutral-700">API Key</label>
              <Input name="apiKey" required defaultValue={account?.api_key ?? ""} autoComplete="off" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-neutral-700">API Secret</label>
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
              <label className="mb-1 block text-xs font-semibold text-neutral-700">발신번호</label>
              <Input name="senderPhone" required defaultValue={account?.sender_phone ?? ""} placeholder="01012345678" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-neutral-700">카카오 채널 ID (pfId, 선택)</label>
              <Input name="kakaoPfId" defaultValue={account?.kakao_pf_id ?? ""} placeholder="KA01PF..." />
            </div>
          </div>
          <input type="hidden" name="rcsBrandId" value={account?.rcs_brand_id ?? ""} />
          {saveError && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{saveError}</p>}
          <div className="flex gap-2">
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "저장 중..." : "저장"}
            </Button>
            {account && (
              <Button type="button" variant="ghost" onClick={() => setIsEditing(false)} disabled={isSaving}>
                취소
              </Button>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
