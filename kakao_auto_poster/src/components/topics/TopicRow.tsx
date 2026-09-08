"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/Button";
import {
  toggleTopicActiveAction,
  deleteTopicAction,
  generateReportAction,
  updateTopicScheduleAction,
  type GenerateReportState,
  type UpdateScheduleState,
} from "@/lib/actions/topics";
import { LOOKBACK_DAYS_OPTIONS } from "@/lib/validation";
import { SCHEDULE_INTERVAL_OPTIONS } from "@/lib/schedule";

interface TopicRowProps {
  id: string;
  topicName: string;
  keywords: string[];
  isActive: boolean;
  lookbackDays: number;
  scheduleEnabled: boolean;
  intervalMinutes: number | null;
}

const generateInitialState: GenerateReportState = {};
const scheduleInitialState: UpdateScheduleState = {};

export function TopicRow({ id, topicName, keywords, isActive, lookbackDays, scheduleEnabled, intervalMinutes }: TopicRowProps) {
  const [genState, genFormAction, isGenerating] = useActionState(generateReportAction, generateInitialState);
  const [scheduleState, scheduleFormAction, isSavingSchedule] = useActionState(updateTopicScheduleAction, scheduleInitialState);
  const [showSettings, setShowSettings] = useState(false);

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-neutral-900">{topicName}</p>
          <div className="mt-1 flex flex-wrap gap-1">
            {keywords.map((k) => (
              <span key={k} className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">
                {k}
              </span>
            ))}
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              isActive ? "bg-yellow-100 text-yellow-800" : "bg-neutral-100 text-neutral-500"
            }`}
          >
            {isActive ? "활성" : "비활성"}
          </span>
          {scheduleEnabled && (
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
              ⏰ 예약 켜짐
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-neutral-100 pt-3">
        <form action={genFormAction}>
          <input type="hidden" name="topicId" value={id} />
          <Button type="submit" variant="secondary" disabled={isGenerating}>
            {isGenerating ? "생성 중..." : "✨ 지금 생성"}
          </Button>
        </form>
        <form action={toggleTopicActiveAction}>
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="isActive" value={String(isActive)} />
          <Button type="submit" variant="ghost">
            {isActive ? "비활성화" : "활성화"}
          </Button>
        </form>
        <Button type="button" variant="ghost" onClick={() => setShowSettings((v) => !v)}>
          ⚙️ 조회 범위/예약 설정
        </Button>
        <form action={deleteTopicAction}>
          <input type="hidden" name="id" value={id} />
          <Button type="submit" variant="ghost" className="text-red-600 hover:bg-red-50">
            삭제
          </Button>
        </form>
      </div>
      {genState.error && <p className="mt-2 text-xs text-red-600">{genState.error}</p>}

      {showSettings && (
        <form action={scheduleFormAction} className="mt-3 space-y-3 rounded-lg border border-neutral-200 bg-neutral-50 p-3">
          <input type="hidden" name="id" value={id} />
          <div>
            <label className="mb-1 block text-xs font-semibold text-neutral-700">데이터 조회 범위</label>
            <select
              name="lookbackDays"
              defaultValue={lookbackDays}
              className="w-full rounded-lg border border-neutral-300 px-3 py-1.5 text-sm text-neutral-900 outline-none focus:border-neutral-900"
            >
              {LOOKBACK_DAYS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs font-semibold text-neutral-700">
              <input
                type="checkbox"
                name="scheduleEnabled"
                value="true"
                defaultChecked={scheduleEnabled}
                className="rounded border-neutral-300"
              />
              예약 발송 사용 (주기적으로 자동 생성)
            </label>
          </div>
          <p className="text-xs text-neutral-400">
            켜두면 아래 주기마다 자동으로 리포트를 생성합니다. 카카오톡 발송은 항상 별도
            승인이 필요합니다 — 텔레그램을 연동해두면 발행 전 검토 알림을 받을 수 있고,
            연동하지 않았다면 웹 화면에서 직접 확인 후 발송해주세요.
          </p>
          <div>
            <label className="mb-1 block text-xs font-semibold text-neutral-700">예약 주기</label>
            <select
              name="intervalMinutes"
              defaultValue={intervalMinutes ?? 1440}
              className="w-full rounded-lg border border-neutral-300 px-3 py-1.5 text-sm text-neutral-900 outline-none focus:border-neutral-900"
            >
              {SCHEDULE_INTERVAL_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {scheduleState.error && <p className="text-xs text-red-600">{scheduleState.error}</p>}
          <Button type="submit" disabled={isSavingSchedule}>
            {isSavingSchedule ? "저장 중..." : "저장"}
          </Button>
        </form>
      )}
    </div>
  );
}
