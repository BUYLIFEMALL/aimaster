import Link from "next/link";
import { TONE_PRESETS } from "@/lib/tonePresets";
import { REPLY_MODEL_OPTIONS, DEFAULT_REPLY_MODEL } from "@/lib/ai/models";
import { formatDateTimeKo } from "@/lib/formatDate";

export interface SettingsSummaryData {
  defaultLink: string | null;
  tonePreset: string | null;
  replyModel: string | null;
  autoApprove: boolean;
  botEnabled: boolean;
  botStartedAt: string | null;
}

export function SettingsSummary({ data }: { data: SettingsSummaryData }) {
  const toneLabel = TONE_PRESETS.find((p) => p.value === data.tonePreset)?.label ?? "직접 설정 안 함";
  const modelLabel =
    REPLY_MODEL_OPTIONS.find((o) => o.value === (data.replyModel ?? DEFAULT_REPLY_MODEL))?.label ?? data.replyModel;

  return (
    <div className="mb-6 grid gap-3 sm:grid-cols-2">
      <div className="rounded-2xl border border-ig-border bg-ig-surface p-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-bold text-ig-text">🔗 답장 기본 설정</h2>
          <Link href="/settings" className="text-xs text-ig-primary hover:underline">
            설정 바꾸기
          </Link>
        </div>
        <dl className="space-y-1 text-xs text-ig-muted">
          <div className="flex justify-between gap-2">
            <dt className="shrink-0">기본 링크</dt>
            <dd className="truncate text-right text-ig-text">{data.defaultLink ?? "미설정"}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="shrink-0">답장 톤</dt>
            <dd className="text-right text-ig-text">{toneLabel}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="shrink-0">AI 모델</dt>
            <dd className="text-right text-ig-text">{modelLabel}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="shrink-0">자동 발송</dt>
            <dd className={`text-right font-semibold ${data.autoApprove ? "text-ig-warn" : "text-ig-muted"}`}>
              {data.autoApprove ? "⚡ 켜짐(검토 없이 즉시 발송)" : "꺼짐"}
            </dd>
          </div>
        </dl>
      </div>

      <div className="rounded-2xl border border-ig-border bg-ig-surface p-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-bold text-ig-text">🤖 봇 상태</h2>
          <Link href="/settings" className="text-xs text-ig-primary hover:underline">
            설정 바꾸기
          </Link>
        </div>
        {data.botEnabled ? (
          <dl className="space-y-1 text-xs text-ig-muted">
            <div className="flex justify-between gap-2">
              <dt className="shrink-0">상태</dt>
              <dd className="text-right font-semibold text-ig-success">✅ 활성화됨(웹훅 실시간 수신)</dd>
            </div>
            {data.botStartedAt && (
              <div className="flex justify-between gap-2">
                <dt className="shrink-0">이 시점 이후 DM만</dt>
                <dd className="text-right text-ig-text">{formatDateTimeKo(data.botStartedAt)}</dd>
              </div>
            )}
          </dl>
        ) : (
          <p className="text-xs text-ig-muted">⏸ 꺼짐 — 설정에서 봇을 활성화해주세요.</p>
        )}
      </div>
    </div>
  );
}
