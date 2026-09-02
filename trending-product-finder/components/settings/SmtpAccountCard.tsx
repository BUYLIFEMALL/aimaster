"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  deleteSmtpAccountAction,
  testSmtpAccountAction,
  toggleSmtpAccountActiveAction,
  updateSmtpAccountAction,
} from "@/lib/actions/smtpAccounts";

export interface SmtpAccountData {
  id: string;
  label: string;
  provider: string | null;
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  from_name: string | null;
  is_active: boolean;
}

export function SmtpAccountCard({ account }: { account: SmtpAccountData }) {
  const router = useRouter();
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  async function handleTest() {
    setTestResult(null);
    setIsTesting(true);
    try {
      const result = await testSmtpAccountAction(account.id);
      if (result.error) {
        setTestResult({ ok: false, message: result.error });
      } else {
        setTestResult({ ok: true, message: "본인(로그인 이메일)에게 테스트 메일을 보냈습니다. 받은편지함을 확인해주세요." });
      }
    } finally {
      setIsTesting(false);
    }
  }

  async function handleDelete() {
    setIsDeleting(true);
    try {
      await deleteSmtpAccountAction(account.id);
      router.refresh();
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleToggle() {
    setIsToggling(true);
    try {
      await toggleSmtpAccountActiveAction(account.id, !account.is_active);
      router.refresh();
    } finally {
      setIsToggling(false);
    }
  }

  async function handleSaveEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setEditError(null);
    setIsSaving(true);
    try {
      const result = await updateSmtpAccountAction(account.id, new FormData(e.currentTarget));
      if (result.error) {
        setEditError(result.error);
      } else {
        setIsEditing(false);
        router.refresh();
      }
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
      <div className="mb-1 flex items-center justify-between gap-2">
        <p className="text-sm font-bold text-gray-900">{account.label}</p>
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
            account.is_active ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"
          }`}
        >
          {account.is_active ? "사용 중" : "사용 안 함"}
        </span>
      </div>
      <p className="font-mono text-xs text-gray-500">
        {account.smtp_user} · {account.smtp_host}:{account.smtp_port}
      </p>
      {account.from_name && <p className="mt-0.5 text-xs text-gray-400">발신자 표시: {account.from_name}</p>}

      {testResult && <p className={`mt-2 text-xs ${testResult.ok ? "text-emerald-600" : "text-red-600"}`}>{testResult.message}</p>}

      <div className="mt-3 flex flex-wrap gap-3">
        <button type="button" onClick={handleTest} disabled={isTesting} className="text-xs font-semibold text-sky-600 hover:underline disabled:opacity-60">
          {isTesting ? "테스트 발송 중..." : "✉️ 테스트 발송"}
        </button>
        <button type="button" onClick={() => setIsEditing((v) => !v)} className="text-xs font-semibold text-gray-600 hover:underline">
          {isEditing ? "수정 취소" : "✏️ 수정"}
        </button>
        <button type="button" onClick={handleToggle} disabled={isToggling} className="text-xs font-semibold text-gray-600 hover:underline disabled:opacity-60">
          {account.is_active ? "사용 중지" : "다시 사용"}
        </button>
        <button type="button" onClick={handleDelete} disabled={isDeleting} className="text-xs font-semibold text-red-500 hover:underline disabled:opacity-60">
          {isDeleting ? "삭제 중..." : "삭제"}
        </button>
      </div>

      {isEditing && (
        <form onSubmit={handleSaveEdit} className="mt-4 space-y-3 border-t border-gray-200 pt-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-700">계정 별칭</label>
              <input name="label" required defaultValue={account.label} className="input-sm w-full" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-700">발신자 표시 이름 (선택)</label>
              <input name="fromName" defaultValue={account.from_name ?? ""} className="input-sm w-full" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-700">SMTP 호스트</label>
              <input name="smtpHost" required defaultValue={account.smtp_host} className="input-sm w-full" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-700">포트</label>
              <input name="smtpPort" type="number" required defaultValue={account.smtp_port} className="input-sm w-full" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-700">로그인 계정 (이메일)</label>
            <input name="smtpUser" type="email" required defaultValue={account.smtp_user} className="input-sm w-full" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-700">비밀번호 (앱 비밀번호)</label>
            <input
              name="smtpPassword"
              type="password"
              autoComplete="new-password"
              placeholder="변경하려면 새 비밀번호 입력 (비워두면 기존 값 유지)"
              className="input-sm w-full"
            />
          </div>

          {editError && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{editError}</p>}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-lg bg-sky-600 px-4 py-2 text-xs font-bold text-white hover:bg-sky-700 disabled:opacity-60"
            >
              {isSaving ? "저장 중..." : "저장"}
            </button>
            <button type="button" onClick={() => setIsEditing(false)} disabled={isSaving} className="text-xs font-semibold text-gray-500 hover:underline">
              취소
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
