"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  createFollowupRuleAction,
  deleteFollowupRuleAction,
  toggleFollowupRuleActiveAction,
  updateFollowupRuleAction,
} from "@/lib/actions/followupRules";

export interface FollowupRuleData {
  id: string;
  name: string;
  days_after: number;
  channel_email: boolean;
  channel_sms: boolean;
  channel_alimtalk: boolean;
  channel_friendtalk: boolean;
  message_subject: string | null;
  message_text: string;
  kakao_template_id: string | null;
  kakao_variables: Record<string, string>;
  is_active: boolean;
}

function RuleForm({
  formSourceId,
  rule,
  onDone,
}: {
  formSourceId: string;
  rule?: FollowupRuleData;
  onDone: () => void;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [showAlimtalk, setShowAlimtalk] = useState(rule?.channel_alimtalk ?? false);

  const kakaoVariablesText = Object.entries(rule?.kakao_variables ?? {})
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsPending(true);
    try {
      const formData = new FormData(e.currentTarget);
      const result = rule
        ? await updateFollowupRuleAction(rule.id, formData)
        : await createFollowupRuleAction(formSourceId, formData);
      if (result.error) setError(result.error);
      else {
        router.refresh();
        onDone();
      }
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2 rounded-lg bg-white border border-gray-200 p-3">
      <div className="grid grid-cols-2 gap-2">
        <input name="name" required defaultValue={rule?.name ?? ""} placeholder="규칙 이름 (예: 3일 후 안내)" className="input-sm" />
        <div className="flex items-center gap-1">
          <input name="daysAfter" type="number" min={1} required defaultValue={rule?.days_after ?? 3} className="input-sm w-20" />
          <span className="text-gray-500">일 후 발송</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <label className="flex items-center gap-1">
          <input name="channelEmail" type="checkbox" defaultChecked={rule?.channel_email} /> 이메일
        </label>
        <label className="flex items-center gap-1">
          <input name="channelSms" type="checkbox" defaultChecked={rule?.channel_sms} /> 문자
        </label>
        <label className="flex items-center gap-1">
          <input
            name="channelAlimtalk"
            type="checkbox"
            defaultChecked={rule?.channel_alimtalk}
            onChange={(e) => setShowAlimtalk(e.target.checked)}
          />
          알림톡
        </label>
        <label className="flex items-center gap-1">
          <input name="channelFriendtalk" type="checkbox" defaultChecked={rule?.channel_friendtalk} /> 친구톡
        </label>
      </div>

      <input name="messageSubject" defaultValue={rule?.message_subject ?? ""} placeholder="이메일 제목 (선택, 비우면 규칙 이름 사용)" className="input-sm" />
      <textarea
        name="messageText"
        required
        defaultValue={rule?.message_text ?? ""}
        placeholder={"발송할 메시지. {name}은 신청자 이름으로 자동 치환됩니다.\n예: {name}님, 신청해주셔서 감사합니다. 추가로 궁금한 점 있으시면 언제든 연락주세요."}
        rows={2}
        className="input-sm"
      />

      {showAlimtalk && (
        <div className="space-y-1 rounded bg-gray-50 p-2">
          <input name="kakaoTemplateId" defaultValue={rule?.kakao_template_id ?? ""} placeholder="알림톡 템플릿 ID" className="input-sm" />
          <textarea
            name="kakaoVariables"
            defaultValue={kakaoVariablesText}
            placeholder={"#{성함}=성함"}
            rows={2}
            className="input-sm font-mono"
          />
        </div>
      )}

      {error && <p className="text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={isPending} className="rounded-lg bg-blue-600 px-3 py-1.5 font-bold text-white hover:bg-blue-700 disabled:opacity-60">
          {isPending ? "저장 중..." : rule ? "수정 저장" : "규칙 추가"}
        </button>
        <button type="button" onClick={onDone} className="font-semibold text-gray-500 hover:underline">
          취소
        </button>
      </div>
    </form>
  );
}

function RuleRow({ rule }: { rule: FollowupRuleData }) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const channels = [
    rule.channel_email && "이메일",
    rule.channel_sms && "문자",
    rule.channel_alimtalk && "알림톡",
    rule.channel_friendtalk && "친구톡",
  ].filter(Boolean);

  async function handleToggle() {
    setIsToggling(true);
    try {
      await toggleFollowupRuleActiveAction(rule.id, !rule.is_active);
      router.refresh();
    } finally {
      setIsToggling(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`"${rule.name}" 규칙을 삭제할까요?`)) return;
    setIsDeleting(true);
    try {
      await deleteFollowupRuleAction(rule.id);
      router.refresh();
    } finally {
      setIsDeleting(false);
    }
  }

  if (isEditing) {
    return <RuleForm formSourceId="" rule={rule} onDone={() => setIsEditing(false)} />;
  }

  return (
    <div className="flex items-center justify-between gap-2 rounded-lg bg-white border border-gray-200 px-3 py-2">
      <div>
        <p className="font-semibold text-gray-800">
          {rule.name} <span className="font-normal text-gray-400">· {rule.days_after}일 후 · {channels.join("/") || "채널 없음"}</span>
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className={`rounded-full px-2 py-0.5 ${rule.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
          {rule.is_active ? "켜짐" : "꺼짐"}
        </span>
        <button type="button" onClick={handleToggle} disabled={isToggling} className="font-semibold text-gray-600 hover:underline disabled:opacity-60">
          {rule.is_active ? "끄기" : "켜기"}
        </button>
        <button type="button" onClick={() => setIsEditing(true)} className="font-semibold text-blue-600 hover:underline">
          수정
        </button>
        <button type="button" onClick={handleDelete} disabled={isDeleting} className="font-semibold text-red-500 hover:underline disabled:opacity-60">
          삭제
        </button>
      </div>
    </div>
  );
}

export function FollowupRulesSection({ formSourceId, rules }: { formSourceId: string; rules: FollowupRuleData[] }) {
  const [isAdding, setIsAdding] = useState(false);

  return (
    <div className="space-y-2 rounded-xl bg-gray-50 p-4 text-xs text-gray-600">
      <div className="flex items-center justify-between">
        <p className="font-semibold text-gray-700">🔁 접수 후 팔로우업 자동화</p>
        {!isAdding && (
          <button type="button" onClick={() => setIsAdding(true)} className="font-semibold text-blue-600 hover:underline">
            + 규칙 추가
          </button>
        )}
      </div>
      <p className="text-gray-400">접수된 신청자에게 N일 뒤 안내·만족도 조사 등을 자동으로 다시 보냅니다.</p>

      <div className="space-y-2">
        {rules.map((rule) => (
          <RuleRow key={rule.id} rule={rule} />
        ))}
      </div>

      {isAdding && <RuleForm formSourceId={formSourceId} onDone={() => setIsAdding(false)} />}
    </div>
  );
}
