"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { saveSmtpAccountAction, deleteSmtpAccountAction, type SaveSmtpAccountState } from "@/lib/actions/smtpAccount";

export interface SmtpAccountData {
  id: string;
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  from_name: string | null;
  is_active: boolean;
}

const PROVIDER_PRESETS = [
  { value: "gmail", label: "Google (Gmail)", host: "smtp.gmail.com", port: 587 },
  { value: "naver", label: "네이버 메일", host: "smtp.naver.com", port: 465 },
  { value: "daum", label: "다음(카카오) 메일", host: "smtp.daum.net", port: 465 },
  { value: "other", label: "기타 (직접 입력)", host: "", port: 587 },
];

const saveInitialState: SaveSmtpAccountState = {};

/**
 * 예약 자동 생성된 리포트를 이메일로도 받아볼 수 있게 하는 설정 섹션 — 공용
 * `user_smtp_accounts` 테이블을 재사용한다. 다른 프로그램에서 이미 등록한 계정이 있으면
 * (실사용 중 Gmail+네이버 2개가 이미 존재하는 회원이 확인됨) 여기서도 전부 그대로 보이고,
 * 그중 활성화된 것 중 하나로 발송된다(lib/emailNotify.ts).
 */
export function SmtpAccountSection({ accounts }: { accounts: SmtpAccountData[] }) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(accounts.length === 0);
  const [preset, setPreset] = useState("other");
  const [host, setHost] = useState("");
  const [port, setPort] = useState(587);
  const [state, formAction, isSaving] = useActionState(saveSmtpAccountAction, saveInitialState);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function handlePresetChange(value: string) {
    setPreset(value);
    const found = PROVIDER_PRESETS.find((p) => p.value === value);
    if (found && found.value !== "other") {
      setHost(found.host);
      setPort(found.port);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("이 이메일 계정을 삭제할까요? 다른 AIMaster 프로그램에서도 이 계정으로 발송하고 있었다면 그쪽에도 영향을 줍니다.")) return;
    setDeletingId(id);
    try {
      await deleteSmtpAccountAction(id);
      router.refresh();
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-neutral-900">📧 이메일 알림 (SMTP)</h2>
        {accounts.length > 0 && (
          <button type="button" onClick={() => setShowForm((v) => !v)} className="text-xs font-bold text-blue-600 hover:underline">
            {showForm ? "닫기" : "+ 계정 추가"}
          </button>
        )}
      </div>
      <p className="text-xs text-neutral-500">
        예약(정기 자동 생성)으로 만들어진 리포트를 본인 이메일로도 받아볼 수 있습니다. Gmail은
        &quot;앱 비밀번호&quot;, 네이버/다음은 메일 설정에서 SMTP를 켜고 발급받은 비밀번호를
        입력해주세요. 다른 AIMaster 프로그램에서 이미 등록하셨다면 여기서도 그대로 재사용됩니다.
      </p>

      {accounts.length > 0 && (
        <div className="space-y-2">
          {accounts.map((account) => (
            <div key={account.id} className="flex items-center justify-between rounded-lg border border-neutral-200 bg-neutral-50 p-3">
              <div>
                <p className="text-sm text-green-600">
                  ✅ {account.smtp_user} {!account.is_active && <span className="text-neutral-400">(비활성)</span>}
                </p>
                <p className="text-xs text-neutral-500">
                  {account.smtp_host}:{account.smtp_port}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleDelete(account.id)}
                disabled={deletingId === account.id}
                className="text-xs font-semibold text-red-500 hover:underline disabled:opacity-50"
              >
                {deletingId === account.id ? "삭제 중..." : "삭제"}
              </button>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <form action={formAction} className="space-y-3 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-neutral-700">메일 서비스</label>
            <select
              value={preset}
              onChange={(e) => handlePresetChange(e.target.value)}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 outline-none focus:border-neutral-900"
            >
              {PROVIDER_PRESETS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-neutral-700">SMTP 호스트</label>
              <input type="hidden" name="smtpHost" value={host} />
              <Input value={host} onChange={(e) => setHost(e.target.value)} placeholder="smtp.gmail.com" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-neutral-700">포트</label>
              <input type="hidden" name="smtpPort" value={port} />
              <Input type="number" value={port} onChange={(e) => setPort(Number(e.target.value) || 587)} />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-neutral-700">이메일 주소</label>
            <Input name="smtpUser" required placeholder="you@gmail.com" autoComplete="off" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-neutral-700">비밀번호 (앱 비밀번호)</label>
            <Input name="smtpPassword" type="password" required autoComplete="new-password" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-neutral-700">보내는 사람 이름 (선택)</label>
            <Input name="fromName" placeholder="카카오톡 뉴스레터 자동화" />
          </div>
          {state.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{state.error}</p>}
          <div className="flex gap-2">
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "저장 중..." : "저장"}
            </Button>
            {accounts.length > 0 && (
              <Button type="button" variant="ghost" onClick={() => setShowForm(false)} disabled={isSaving}>
                취소
              </Button>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
