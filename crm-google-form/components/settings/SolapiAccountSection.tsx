"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
    if (!confirm("SOLAPI 계정을 삭제할까요? 문자·알림톡·친구톡 자동발송이 중단됩니다.")) return;
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
    <section className="glass-card space-y-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">📱 SOLAPI (문자·카카오·RCS)</h2>
        {account && !isEditing && (
          <button type="button" onClick={() => setIsEditing(true)} className="text-xs font-semibold text-blue-600 hover:underline">
            ✏️ 수정
          </button>
        )}
      </div>
      <p className="text-sm text-gray-500">
        <a href="https://solapi.com/" target="_blank" rel="noreferrer" className="font-semibold text-blue-600 hover:underline">
          solapi.com
        </a>
        에서 발급받은 API Key/Secret과, SOLAPI에 등록·인증된 발신번호를 등록하세요. 카카오
        알림톡·친구톡을 쓰려면 카카오 비즈니스 채널 ID(pfId)를, RCS 프로모션 메시지를 쓰려면
        브랜드 인증 ID(brandId)를 함께 등록해야 합니다(SMS만 쓸 거면 둘 다 비워둬도 됩니다).
      </p>

      {account && !isEditing ? (
        <div className="space-y-3 rounded-xl bg-gray-50 p-4">
          <p className="text-sm text-gray-700">
            API Key: <span className="font-mono">{maskApiKey(account.api_key)}</span>
          </p>
          <p className="text-sm text-gray-700">발신번호: {account.sender_phone}</p>
          <p className="text-sm text-gray-700">
            카카오 채널(pfId): {account.kakao_pf_id ?? <span className="text-gray-400">미등록</span>}
          </p>
          <p className="text-sm text-gray-700">
            RCS 브랜드(brandId): {account.rcs_brand_id ?? <span className="text-gray-400">미등록</span>}
          </p>

          <div className="flex flex-wrap items-center gap-3 border-t border-gray-200 pt-3">
            <button
              type="button"
              onClick={handleCheckBalance}
              disabled={isCheckingBalance}
              className="text-xs font-semibold text-blue-600 hover:underline disabled:opacity-60"
            >
              {isCheckingBalance ? "조회 중..." : "💰 잔액 조회"}
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="text-xs font-semibold text-red-500 hover:underline disabled:opacity-60"
            >
              {isDeleting ? "삭제 중..." : "삭제"}
            </button>
          </div>
          {balance && (
            <p className="text-sm text-gray-700">
              잔액: <span className="font-bold text-gray-900">{balance.balance.toLocaleString()}원</span> · 포인트:{" "}
              <span className="font-bold text-gray-900">{balance.point.toLocaleString()}</span>
            </p>
          )}
          {balanceError && <p className="text-xs text-red-600">{balanceError}</p>}

          <div className="flex flex-wrap items-center gap-2 border-t border-gray-200 pt-3">
            <input
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
              placeholder="테스트로 받을 본인 번호 (예: 01012345678)"
              className="input-sm flex-1 min-w-[200px]"
            />
            <button
              type="button"
              onClick={handleTestSms}
              disabled={isTesting}
              className="rounded-lg bg-gray-100 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-200 disabled:opacity-60"
            >
              {isTesting ? "발송 중..." : "✉️ 테스트 문자 발송"}
            </button>
          </div>
          {testResult && (
            <p className={`text-xs ${testResult.ok ? "text-green-600" : "text-red-600"}`}>{testResult.message}</p>
          )}
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-4 rounded-xl bg-gray-50 p-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">API Key</label>
              <input name="apiKey" required defaultValue={account?.api_key ?? ""} autoComplete="off" className="input" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">API Secret</label>
              <input name="apiSecret" type="password" required autoComplete="new-password" placeholder={account ? "변경하려면 새로 입력" : ""} className="input" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">발신번호</label>
              <input name="senderPhone" required defaultValue={account?.sender_phone ?? ""} placeholder="01012345678" className="input" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">카카오 채널 ID (pfId, 선택)</label>
              <input name="kakaoPfId" defaultValue={account?.kakao_pf_id ?? ""} placeholder="KA01PF..." className="input" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">RCS 브랜드 인증 ID (brandId, 선택)</label>
            <input name="rcsBrandId" defaultValue={account?.rcs_brand_id ?? ""} placeholder="RCS 프로모션 메시지를 쓸 때만 입력" className="input" />
          </div>
          {saveError && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{saveError}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {isSaving ? "저장 중..." : "저장"}
            </button>
            {account && (
              <button type="button" onClick={() => setIsEditing(false)} disabled={isSaving} className="text-sm font-semibold text-gray-500 hover:underline">
                취소
              </button>
            )}
          </div>
        </form>
      )}
    </section>
  );
}
