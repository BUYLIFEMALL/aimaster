"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  createReminderRuleAction,
  deleteReminderRuleAction,
  toggleReminderRuleActiveAction,
  updateReminderRuleAction,
} from "@/lib/actions/reminderRules";

export interface ReminderRuleData {
  id: string;
  name: string;
  offset_minutes: number;
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

function offsetToParts(offsetMinutes: number): { value: number; unit: string; direction: string } {
  const direction = offsetMinutes < 0 ? "before" : "after";
  const magnitude = Math.abs(offsetMinutes);
  if (magnitude % 1440 === 0) return { value: magnitude / 1440, unit: "days", direction };
  if (magnitude % 60 === 0) return { value: magnitude / 60, unit: "hours", direction };
  return { value: magnitude, unit: "minutes", direction };
}

function describeOffset(offsetMinutes: number): string {
  const { value, unit, direction } = offsetToParts(offsetMinutes);
  const unitLabel = unit === "days" ? "일" : unit === "hours" ? "시간" : "분";
  return `예약 ${value}${unitLabel} ${direction === "before" ? "전" : "후"}`;
}

function RuleForm({ rule, onDone }: { rule?: ReminderRuleData; onDone: () => void }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [showAlimtalk, setShowAlimtalk] = useState(rule?.channel_alimtalk ?? false);

  const defaults = rule ? offsetToParts(rule.offset_minutes) : { value: 24, unit: "hours", direction: "before" };
  const kakaoVariablesText = Object.entries(rule?.kakao_variables ?? {})
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsPending(true);
    try {
      const formData = new FormData(e.currentTarget);
      const result = rule ? await updateReminderRuleAction(rule.id, formData) : await createReminderRuleAction(formData);
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
      <input name="name" required defaultValue={rule?.name ?? ""} placeholder="규칙 이름 (예: 전날 리마인드)" className="input-sm" />

      <div className="flex items-center gap-2">
        <select name="offsetDirection" defaultValue={defaults.direction} className="input-sm w-24">
          <option value="before">예약 전</option>
          <option value="after">예약 후</option>
        </select>
        <input name="offsetValue" type="number" min={1} required defaultValue={defaults.value} className="input-sm w-20" />
        <select name="offsetUnit" defaultValue={defaults.unit} className="input-sm w-24">
          <option value="minutes">분</option>
          <option value="hours">시간</option>
          <option value="days">일</option>
        </select>
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

      <input name="messageSubject" defaultValue={rule?.message_subject ?? ""} placeholder="이메일 제목 (선택)" className="input-sm" />
      <textarea
        name="messageText"
        required
        defaultValue={rule?.message_text ?? ""}
        placeholder={"{name}은 고객명, {time}은 예약일시로 자동 치환됩니다.\n예: {name}님, {time}에 예약이 있으신 거 잊지 마세요!"}
        rows={2}
        className="input-sm"
      />

      {showAlimtalk && (
        <div className="space-y-1 rounded bg-gray-50 p-2">
          <input name="kakaoTemplateId" defaultValue={rule?.kakao_template_id ?? ""} placeholder="알림톡 템플릿 ID" className="input-sm" />
          <textarea
            name="kakaoVariables"
            defaultValue={kakaoVariablesText}
            placeholder={"#{성함}={name}\n#{예약일시}={time}"}
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

function RuleRow({ rule }: { rule: ReminderRuleData }) {
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
      await toggleReminderRuleActiveAction(rule.id, !rule.is_active);
      router.refresh();
    } finally {
      setIsToggling(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`"${rule.name}" 규칙을 삭제할까요?`)) return;
    setIsDeleting(true);
    try {
      await deleteReminderRuleAction(rule.id);
      router.refresh();
    } finally {
      setIsDeleting(false);
    }
  }

  if (isEditing) {
    return <RuleForm rule={rule} onDone={() => setIsEditing(false)} />;
  }

  return (
    <div className="flex items-center justify-between gap-2 rounded-lg bg-white border border-gray-200 px-3 py-2">
      <p className="font-semibold text-gray-800">
        {rule.name} <span className="font-normal text-gray-400">· {describeOffset(rule.offset_minutes)} · {channels.join("/") || "채널 없음"}</span>
      </p>
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

export function ReminderRulesSection({ rules }: { rules: ReminderRuleData[] }) {
  const [isAdding, setIsAdding] = useState(false);

  return (
    <section className="space-y-2 bg-white border border-gray-100 rounded-2xl p-5 shadow-sm text-xs text-gray-600">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-900">🔔 리마인드 규칙</h3>
        {!isAdding && (
          <button type="button" onClick={() => setIsAdding(true)} className="text-xs font-semibold text-blue-600 hover:underline">
            + 규칙 추가
          </button>
        )}
      </div>
      <p className="text-gray-400">모든 예약에 공통 적용됩니다. 예: "전날 리마인드", "2시간 전 확인", "방문 다음날 리뷰 요청"</p>

      <div className="space-y-2">
        {rules.map((rule) => (
          <RuleRow key={rule.id} rule={rule} />
        ))}
        {rules.length === 0 && !isAdding && <p className="text-gray-400 py-2">아직 등록된 리마인드 규칙이 없습니다.</p>}
      </div>

      {isAdding && <RuleForm onDone={() => setIsAdding(false)} />}
    </section>
  );
}
