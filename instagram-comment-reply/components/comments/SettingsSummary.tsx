import Link from "next/link";
import { TONE_PRESETS } from "@/lib/tonePresets";
import { REPLY_MODEL_OPTIONS, DEFAULT_REPLY_MODEL } from "@/lib/ai/models";
import { MONITORING_INTERVAL_OPTIONS } from "@/lib/schedule";
import { formatDateTimeKo } from "@/lib/formatDate";

export interface SettingsSummaryData {
  defaultLink: string | null;
  tonePreset: string | null;
  replyModel: string | null;
  monitoringEnabled: boolean;
  monitoringIntervalMinutes: number | null;
  monitoringStartedAt: string | null;
  lastRunAt: string | null;
}

export function SettingsSummary({ data }: { data: SettingsSummaryData }) {
  const toneLabel = TONE_PRESETS.find((p) => p.value === data.tonePreset)?.label ?? "직접 설정 안 함";
  const modelLabel =
    REPLY_MODEL_OPTIONS.find((o) => o.value === (data.replyModel ?? DEFAULT_REPLY_MODEL))?.label ?? data.replyModel;
  const intervalLabel = MONITORING_INTERVAL_OPTIONS.find((o) => o.value === data.monitoringIntervalMinutes)?.label;

  return (
    <div className="mb-6 grid gap-3 sm:grid-cols-2">
      <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-900">🔗 답글 기본 설정</h2>
          <Link href="/settings" className="text-xs text-blue-600 hover:underline">
            설정 바꾸기
          </Link>
        </div>
        <dl className="space-y-1 text-xs text-gray-500">
          <div className="flex justify-between gap-2">
            <dt className="shrink-0">기본 링크</dt>
            <dd className="truncate text-right text-gray-700">{data.defaultLink ?? "미설정"}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="shrink-0">답글 톤</dt>
            <dd className="text-right text-gray-700">{toneLabel}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="shrink-0">AI 모델</dt>
            <dd className="text-right text-gray-700">{modelLabel}</dd>
          </div>
        </dl>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-900">⏱ 예약 모니터링</h2>
          <Link href="/settings" className="text-xs text-blue-600 hover:underline">
            설정 바꾸기
          </Link>
        </div>
        {data.monitoringEnabled ? (
          <dl className="space-y-1 text-xs text-gray-500">
            <div className="flex justify-between gap-2">
              <dt className="shrink-0">상태</dt>
              <dd className="text-right font-semibold text-green-600">✅ 실행 중</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="shrink-0">확인 주기</dt>
              <dd className="text-right text-gray-700">{intervalLabel ?? `${data.monitoringIntervalMinutes}분`}</dd>
            </div>
            {data.monitoringStartedAt && (
              <div className="flex justify-between gap-2">
                <dt className="shrink-0">이 시점 이후 댓글만</dt>
                <dd className="text-right text-gray-700">{formatDateTimeKo(data.monitoringStartedAt)}</dd>
              </div>
            )}
            {data.lastRunAt && (
              <div className="flex justify-between gap-2">
                <dt className="shrink-0">마지막 확인</dt>
                <dd className="text-right text-gray-700">{formatDateTimeKo(data.lastRunAt)}</dd>
              </div>
            )}
          </dl>
        ) : (
          <p className="text-xs text-gray-400">⏸ 꺼짐 — 아래 버튼으로 수동 확인하거나, 설정에서 켤 수 있어요.</p>
        )}
      </div>
    </div>
  );
}
