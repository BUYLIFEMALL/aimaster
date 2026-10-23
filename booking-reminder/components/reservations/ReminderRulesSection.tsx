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
    <form onSubmit={handleSubmit} className="space-y-3.5 rounded-xl bg-slate-50 border border-blue-200 p-4">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold text-slate-900">
          {rule ? "✏️ 리마인드 규칙 수정" : "✨ 신규 리마인드 규칙 등록"}
        </h4>
        <button type="button" onClick={onDone} className="text-xs text-slate-400 hover:text-slate-600">
          닫기 ✕
        </button>
      </div>

      <div>
        <label className="block text-[11px] font-semibold text-slate-700 mb-1">규칙 이름</label>
        <input
          name="name"
          required
          defaultValue={rule?.name ?? ""}
          placeholder="예: D-1 전날 예약 확인 리마인드"
          className="input-sm"
        />
      </div>

      <div>
        <label className="block text-[11px] font-semibold text-slate-700 mb-1">발송 타이밍 (기준 일시 대비)</label>
        <div className="flex items-center gap-2">
          <select name="offsetDirection" defaultValue={defaults.direction} className="input-sm w-28 font-medium">
            <option value="before">예약 전</option>
            <option value="after">예약 후</option>
          </select>
          <input
            name="offsetValue"
            type="number"
            min={1}
            required
            defaultValue={defaults.value}
            className="input-sm w-20 font-medium"
          />
          <select name="offsetUnit" defaultValue={defaults.unit} className="input-sm w-24 font-medium">
            <option value="minutes">분</option>
            <option value="hours">시간</option>
            <option value="days">일</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-[11px] font-semibold text-slate-700 mb-1">발송 채널 선택</label>
        <div className="flex flex-wrap gap-4 text-xs">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" name="channelSms" defaultChecked={rule?.channel_sms ?? true} className="rounded" />
            <span className="font-medium text-slate-800">문자(SMS)</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              name="channelAlimtalk"
              defaultChecked={rule?.channel_alimtalk ?? false}
              onChange={(e) => setShowAlimtalk(e.target.checked)}
              className="rounded"
            />
            <span className="font-medium text-slate-800">카카오 알림톡</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" name="channelEmail" defaultChecked={rule?.channel_email ?? false} className="rounded" />
            <span className="font-medium text-slate-800">이메일(SMTP)</span>
          </label>
        </div>
      </div>

      {showAlimtalk && (
        <div className="space-y-2 rounded-lg bg-amber-50/50 border border-amber-200 p-3">
          <p className="text-[11px] font-semibold text-amber-800">카카오 알림톡 추가 설정</p>
          <input
            name="kakaoTemplateId"
            defaultValue={rule?.kakao_template_id ?? ""}
            placeholder="카카오 알림톡 템플릿 코드 (예: KA01TP240819)"
            className="input-sm"
          />
          <textarea
            name="kakaoVariables"
            rows={2}
            defaultValue={kakaoVariablesText}
            placeholder={"치환 변수 (한 줄에 하나씩, 예: 이름=홍길동\n날짜=8월 20일)"}
            className="input-sm text-xs font-mono"
          />
        </div>
      )}

      <div>
        <label className="block text-[11px] font-semibold text-slate-700 mb-1">이메일 제목 (이메일 발송 시 적용)</label>
        <input
          name="messageSubject"
          defaultValue={rule?.message_subject ?? ""}
          placeholder="[예약안내] #{고객명}님, 예약 일정을 안내해 드립니다."
          className="input-sm"
        />
      </div>

      <div>
        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
          메시지 본문 (문자/이메일 내용)
        </label>
        <textarea
          name="messageText"
          required
          rows={3}
          defaultValue={rule?.message_text ?? ""}
          placeholder="안녕하세요 #{고객명}님! #{예약일시}에 예약되어 있습니다. 변경이 필요하시면 미리 연락 부탁드립니다."
          className="input-sm text-xs"
        />
        <p className="mt-1 text-[10px] text-slate-400">
          치환 태그 사용 가능: {"#{고객명}"}, {"#{예약일시}"}, {"#{메모}"}
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-600 font-medium">
          ⚠️ {error}
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onDone}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
        >
          취소
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isPending ? "저장 중..." : rule ? "규칙 수정 완료" : "신규 규칙 저장"}
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
  const [toggleError, setToggleError] = useState<string | null>(null);

  const channels = [
    rule.channel_sms && "문자",
    rule.channel_alimtalk && "알림톡",
    rule.channel_email && "이메일",
  ].filter(Boolean);

  async function handleToggle() {
    setIsToggling(true);
    try {
      // 「내 cron-job.org」 방식인데 키가 없는 등 켤 준비가 안 됐으면 규칙이 다시 꺼지고 안내가 돌아온다(v1.22, crm-google-form v1.10과 같은 방식)
      const result = await toggleReminderRuleActiveAction(rule.id, !rule.is_active);
      setToggleError(result.error ?? null);
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
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl bg-white border border-slate-200/90 p-3.5 shadow-sm hover:border-indigo-200 transition-all">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-900 text-xs sm:text-sm">{rule.name}</span>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
              rule.is_active
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : "bg-slate-100 text-slate-400 border border-slate-200"
            }`}
          >
            {rule.is_active ? "가동 중" : "일시중지"}
          </span>
        </div>
        {toggleError && <p className="text-xs font-semibold text-rose-600" role="alert">{toggleError}</p>}

        <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
          <span className="rounded-md bg-indigo-50 text-indigo-700 px-1.5 py-0.5 text-[11px] font-semibold">
            ⏱ {describeOffset(rule.offset_minutes)}
          </span>
          <span>·</span>
          <span className="text-slate-600 font-medium">
            채널: {channels.length > 0 ? channels.join(", ") : "채널 미지정"}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
        <button
          type="button"
          onClick={handleToggle}
          disabled={isToggling}
          className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors disabled:opacity-50 ${
            rule.is_active
              ? "bg-slate-100 text-slate-600 hover:bg-slate-200"
              : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold"
          }`}
        >
          {isToggling ? "처리 중" : rule.is_active ? "끄기" : "켜기"}
        </button>
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className="rounded-lg px-2.5 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50 transition-colors"
        >
          수정
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={isDeleting}
          className="rounded-lg px-2 py-1 text-xs font-semibold text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
        >
          {isDeleting ? "삭제 중" : "삭제"}
        </button>
      </div>
    </div>
  );
}

export function ReminderRulesSection({ rules }: { rules: ReminderRuleData[] }) {
  const [isAdding, setIsAdding] = useState(false);

  return (
    <section className="space-y-3 rounded-2xl border border-slate-200/90 bg-white p-5 md:p-6 shadow-sm">
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
            <span>🔔</span>
            <span>리마인드 자동 발송 규칙</span>
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            모든 예약에 공통 적용되며, 예약일시 전후 지정된 시점에 자동 발송됩니다.
          </p>
        </div>
        {!isAdding && (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="inline-flex items-center gap-1 rounded-xl bg-indigo-50 border border-indigo-200 px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100 transition-all"
          >
            <span>+</span>
            <span>규칙 추가</span>
          </button>
        )}
      </div>

      <div className="space-y-2.5">
        {rules.map((rule) => (
          <RuleRow key={rule.id} rule={rule} />
        ))}
        {rules.length === 0 && !isAdding && (
          <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center">
            <p className="text-xs font-medium text-slate-500">등록된 리마인드 규칙이 없습니다.</p>
            <p className="text-[11px] text-slate-400 mt-1">
              "규칙 추가" 버튼을 눌러 예약 전날 확인 문자나 당일 안내 규칙을 만들어 보세요.
            </p>
          </div>
        )}
      </div>

      {isAdding && <RuleForm onDone={() => setIsAdding(false)} />}
    </section>
  );
}
