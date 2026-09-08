"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { saveSmtpAccountAction, deleteSmtpAccountAction, type SaveSmtpAccountState } from "@/lib/actions/smtpAccount";

export interface SmtpAccountData {
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  from_name: string | null;
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
 * `user_smtp_accounts` 테이블을 재사용한다(다른 프로그램에서 이미 등록했다면 여기서도
 * 그대로 보임). SolapiAccountSection/TelegramSection과 같은 "계정 1개" 단순 UI.
 */
export function SmtpAccountSection({ account }: { account: SmtpAccountData | null }) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(!account);
  const [preset, setPreset] = useState(
    PROVIDER_PRESETS.find((p) => p.host === account?.smtp_host)?.value ?? "other",
  );
  const [host, setHost] = useState(account?.smtp_host ?? "");
  const [port, setPort] = useState(account?.smtp_port ?? 587);
  const [state, formAction, isSaving] = useActionState(saveSmtpAccountAction, saveInitialState);
  const [isDeleting, setIsDeleting] = useState(false);

  function handlePresetChange(value: string) {
    setPreset(value);
    const found = PROVIDER_PRESETS.find((p) => p.value === value);
    if (found && found.value !== "other") {
      setHost(found.host);
      setPort(found.port);
    }
  }

  async function handleDelete() {
    if (!confirm("이메일 알림 계정을 삭제할까요? 예약 리포트 이메일 발송이 중단됩니다.")) return;
    setIsDeleting(true);
    try {
      await deleteSmtpAccountAction();
      router.refresh();
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-neutral-900">📧 이메일 알림 (SMTP)</h2>
        {account && !isEditing && (
          <button type="button" onClick={() => setIsEditing(true)} className="text-xs font-bold text-blue-600 hover:underline">
            ✏️ 수정
          </button>
        )}
      </div>
      <p className="text-xs text-neutral-500">
        예약(정기 자동 생성)으로 만들어진 리포트를 본인 이메일로도 받아볼 수 있습니다. Gmail은
        &quot;앱 비밀번호&quot;, 네이버/다음은 메일 설정에서 SMTP를 켜고 발급받은 비밀번호를
        입력해주세요. 다른 AIMaster 프로그램에서 이미 등록하셨다면 여기서도 그대로 재사용됩니다.
      </p>

      {account && !isEditing ? (
        <div className="space-y-2 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
          <p className="text-sm text-green-600">✅ {account.smtp_user}로 연동되어 있어요.</p>
          <p className="text-xs text-neutral-500">
            {account.smtp_host}:{account.smtp_port}
          </p>
          <Button type="button" variant="ghost" className="text-red-600 hover:bg-red-50" onClick={handleDelete} disabled={isDeleting}>
            {isDeleting ? "삭제 중..." : "삭제"}
          </Button>
        </div>
      ) : (
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
            <Input name="smtpUser" required defaultValue={account?.smtp_user ?? ""} placeholder="you@gmail.com" autoComplete="off" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-neutral-700">비밀번호 (앱 비밀번호)</label>
            <Input
              name="smtpPassword"
              type="password"
              autoComplete="new-password"
              placeholder={account ? "변경하려면 새로 입력" : ""}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-neutral-700">보내는 사람 이름 (선택)</label>
            <Input name="fromName" defaultValue={account?.from_name ?? ""} placeholder="카카오톡 뉴스레터 자동화" />
          </div>
          {state.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{state.error}</p>}
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
