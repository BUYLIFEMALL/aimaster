"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import {
  addBroadcastRecipientAction,
  deleteBroadcastRecipientAction,
  type AddBroadcastRecipientState,
} from "@/lib/actions/broadcastRecipients";

export interface BroadcastRecipientData {
  id: string;
  phone: string;
  label: string | null;
}

const addInitialState: AddBroadcastRecipientState = {};

function maskPhone(phone: string): string {
  if (phone.length < 8) return phone;
  return `${phone.slice(0, 3)}-****-${phone.slice(-4)}`;
}

/**
 * 리포트를 본인뿐 아니라 함께 받아볼 사람들에게도 카카오톡으로 발송할 수 있게 하는
 * 수신자 목록 관리 섹션. 실제 발송은 SOLAPI 브랜드메시지(카카오톡 채널 친구가 아니어도
 * 전화번호만 있으면 도달)를 거치므로, SOLAPI 계정(카카오 채널 ID 포함)이 함께
 * 연동되어 있어야 실제로 동작한다 — lib/kakaoSend.ts 참고.
 */
export function BroadcastRecipientsSection({
  recipients,
  hasSolapiChannel,
  channelFriendUrl,
  hasAlimtalkTemplate,
}: {
  recipients: BroadcastRecipientData[];
  hasSolapiChannel: boolean;
  channelFriendUrl: string | null;
  hasAlimtalkTemplate: boolean;
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(recipients.length === 0);
  const [state, formAction, isSaving] = useActionState(addBroadcastRecipientAction, addInitialState);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(id: string) {
    if (!confirm("이 수신자를 목록에서 삭제할까요? 앞으로 리포트가 이 번호로 발송되지 않습니다.")) return;
    setDeletingId(id);
    try {
      await deleteBroadcastRecipientAction(id);
      router.refresh();
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-neutral-900">📣 카카오톡 수신자 목록</h2>
        {recipients.length > 0 && (
          <button type="button" onClick={() => setShowForm((v) => !v)} className="text-xs font-bold text-blue-600 hover:underline">
            {showForm ? "닫기" : "+ 수신자 추가"}
          </button>
        )}
      </div>
      <p className="text-xs text-neutral-500">
        여기 등록한 전화번호로도 리포트가 카카오톡으로 함께 발송됩니다.{" "}
        {hasAlimtalkTemplate
          ? "알림톡 템플릿이 등록돼 있어 채널 친구가 아니어도 도달합니다."
          : "단, 브랜드메시지는 채널을 친구 추가한 사람에게만 도달합니다 — 아직 친구 추가하지 않았다면 먼저 추가하도록 안내해주세요."}
      </p>
      {!hasSolapiChannel && (
        <p className="rounded-lg bg-yellow-50 px-3 py-2 text-xs text-yellow-800">
          아래 SOLAPI(카카오 채널) 계정을 함께 연동해야 실제로 발송됩니다. 수신자만
          등록해두고 나중에 연동해도 됩니다.
        </p>
      )}
      {hasSolapiChannel && !hasAlimtalkTemplate && (
        <div className="rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-800">
          {channelFriendUrl ? (
            <>
              📎 수신자에게 먼저 이 링크로 채널 친구 추가를 요청해주세요:{" "}
              <a href={channelFriendUrl} target="_blank" rel="noreferrer" className="font-semibold underline">
                {channelFriendUrl}
              </a>
            </>
          ) : (
            <>
              채널 친구추가 링크를 아래 SOLAPI 설정에 등록해두면 여기에 안내 링크를
              보여드립니다. (또는 알림톡 템플릿을 등록하면 친구 추가 없이도 도달합니다.)
            </>
          )}
        </div>
      )}

      {recipients.length > 0 && (
        <div className="space-y-2">
          {recipients.map((recipient) => (
            <div key={recipient.id} className="flex items-center justify-between rounded-lg border border-neutral-200 bg-neutral-50 p-3">
              <div>
                <p className="text-sm text-neutral-900">
                  {recipient.label ? `${recipient.label} ` : ""}
                  <span className="text-neutral-500">{maskPhone(recipient.phone)}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleDelete(recipient.id)}
                disabled={deletingId === recipient.id}
                className="text-xs font-semibold text-red-500 hover:underline disabled:opacity-50"
              >
                {deletingId === recipient.id ? "삭제 중..." : "삭제"}
              </button>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <form action={formAction} className="space-y-3 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-neutral-700">전화번호</label>
            <Input name="phone" required placeholder="01012345678" autoComplete="off" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-neutral-700">이름/메모 (선택)</label>
            <Input name="label" placeholder="예: 친구1, 고객A" />
          </div>
          {state.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{state.error}</p>}
          <div className="flex gap-2">
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "추가 중..." : "추가"}
            </Button>
            {recipients.length > 0 && (
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
