"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toggleCampaignActiveAction, deleteCampaignAction, runCampaignNowAction } from "@/lib/actions/campaigns";
import type { CampaignRecurrence } from "@/types/database.types";

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];
const RECURRENCE_LABEL: Record<CampaignRecurrence, string> = { once: "한 번만", daily: "매일", weekly: "매주" };

function targetSendCountLabel(n: number): string {
  return n === 0 ? "1차 발송 (아직 못 받은 리드)" : `${n + 1}차 발송 (${n}차까지 받은 리드)`;
}

export interface CampaignCardData {
  id: string;
  name: string;
  target_send_count: number;
  quantity_per_run: number;
  send_hour: number;
  recurrence: CampaignRecurrence;
  weekly_day: number | null;
  is_active: boolean;
  last_run_at: string | null;
  stepmail_email_drafts: { subject: string } | null;
}

export function CampaignCard({ campaign }: { campaign: CampaignCardData }) {
  const router = useRouter();
  const [isRunning, setIsRunning] = useState(false);
  const [runResult, setRunResult] = useState<string | null>(null);
  const [runError, setRunError] = useState<string | null>(null);
  const [isToggling, setIsToggling] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleRunNow() {
    setRunError(null);
    setRunResult(null);
    setIsRunning(true);
    try {
      const result = await runCampaignNowAction(campaign.id);
      if (result.error) {
        setRunError(result.error);
      } else {
        setRunResult(`발송 완료: 성공 ${result.sentCount}건, 실패 ${result.failedCount}건`);
        router.refresh();
      }
    } finally {
      setIsRunning(false);
    }
  }

  async function handleToggle() {
    setIsToggling(true);
    try {
      await toggleCampaignActiveAction(campaign.id, !campaign.is_active);
      router.refresh();
    } finally {
      setIsToggling(false);
    }
  }

  async function handleDelete() {
    setIsDeleting(true);
    try {
      await deleteCampaignAction(campaign.id);
      router.refresh();
    } finally {
      setIsDeleting(false);
    }
  }

  const scheduleText =
    campaign.recurrence === "weekly" && campaign.weekly_day != null
      ? `매주 ${WEEKDAY_LABELS[campaign.weekly_day]}요일 ${campaign.send_hour}시`
      : `${RECURRENCE_LABEL[campaign.recurrence]} ${campaign.send_hour}시`;

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2 mb-1">
        <p className="text-sm font-bold text-gray-900">{campaign.name}</p>
        <span
          className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
            campaign.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
          }`}
        >
          {campaign.is_active ? "활성" : "중지됨"}
        </span>
      </div>
      <p className="text-xs text-gray-500 truncate">📧 {campaign.stepmail_email_drafts?.subject ?? "(삭제된 초안)"}</p>
      <p className="text-xs text-gray-500">🎯 {targetSendCountLabel(campaign.target_send_count)} · 최대 {campaign.quantity_per_run}건</p>
      <p className="text-xs text-gray-500">⏰ {scheduleText}</p>
      <p className="text-xs text-gray-400 mt-1">
        마지막 실행: {campaign.last_run_at ? new Date(campaign.last_run_at).toLocaleString("ko-KR") : "아직 없음"}
      </p>

      {runResult && <p className="mt-2 text-xs text-green-600">{runResult}</p>}
      {runError && <p className="mt-2 text-xs text-red-600">{runError}</p>}

      <div className="mt-3 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleRunNow}
          disabled={isRunning}
          className="text-xs font-semibold text-blue-600 hover:underline disabled:opacity-60"
        >
          {isRunning ? "발송 중..." : "▶ 지금 실행"}
        </button>
        <button
          type="button"
          onClick={handleToggle}
          disabled={isToggling}
          className="text-xs font-semibold text-gray-600 hover:underline disabled:opacity-60"
        >
          {campaign.is_active ? "일시 중지" : "다시 활성화"}
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={isDeleting}
          className="text-xs font-semibold text-red-500 hover:underline disabled:opacity-60"
        >
          {isDeleting ? "삭제 중..." : "삭제"}
        </button>
      </div>
    </div>
  );
}
