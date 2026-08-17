"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createCampaignAction } from "@/lib/actions/campaigns";
import type { CampaignRecurrence } from "@/types/database.types";

const TARGET_SEND_COUNT_OPTIONS = Array.from({ length: 5 }, (_, n) => n); // 0~4차까지 받은 리드 대상

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

export interface DraftOption {
  id: string;
  subject: string;
}

export interface SmtpAccountOption {
  id: string;
  label: string;
  is_active: boolean;
}

export function CampaignForm({
  drafts,
  smtpAccounts,
  defaultDraftId,
}: {
  drafts: DraftOption[];
  smtpAccounts: SmtpAccountOption[];
  defaultDraftId?: string;
}) {
  const router = useRouter();
  const [recurrence, setRecurrence] = useState<CampaignRecurrence>("once");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsPending(true);
    try {
      const result = await createCampaignAction(new FormData(e.currentTarget));
      if (result.error) {
        setError(result.error);
      } else {
        router.push("/campaigns");
      }
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">캠페인 이름</label>
        <input name="name" required placeholder="예: 신규 리드 1차 발송" className="input" />
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">보낼 이메일</label>
        <select name="draftId" required defaultValue={defaultDraftId ?? ""} className="input">
          <option value="" disabled>
            초안을 선택하세요
          </option>
          {drafts.map((d) => (
            <option key={d.id} value={d.id}>
              {d.subject}
            </option>
          ))}
        </select>
        {drafts.length === 0 && (
          <p className="mt-1 text-xs text-amber-600">
            저장된 이메일 초안이 없습니다. 먼저 이메일 작성 메뉴에서 초안을 만들어주세요.
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">발송 대상 (차수)</label>
        <select name="targetSendCount" defaultValue={0} className="input">
          {TARGET_SEND_COUNT_OPTIONS.map((n) => (
            <option key={n} value={n}>
              {n === 0 ? "1차 발송 (아직 못 받은 리드 대상)" : `${n + 1}차 발송 (${n}차까지 받은 리드 대상)`}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">실행당 발송 수량</label>
          <input name="quantityPerRun" type="number" min={1} max={500} defaultValue={50} required className="input" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">반복 주기</label>
          <select
            name="recurrence"
            value={recurrence}
            onChange={(e) => setRecurrence(e.target.value as CampaignRecurrence)}
            className="input"
          >
            <option value="once">한 번만</option>
            <option value="daily">매일</option>
            <option value="weekly">매주</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">발송 시각 (시)</label>
          <select name="sendHour" defaultValue={9} className="input">
            {Array.from({ length: 24 }, (_, h) => (
              <option key={h} value={h}>
                {h}시
              </option>
            ))}
          </select>
        </div>
        {recurrence === "weekly" && (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">요일</label>
            <select name="weeklyDay" defaultValue={1} className="input">
              {WEEKDAY_LABELS.map((label, idx) => (
                <option key={idx} value={idx}>
                  {label}요일
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
      <p className="text-xs text-gray-400">
        정각 기준으로 매시 확인해서 실행합니다(분 단위 정밀도는 지원하지 않습니다).
      </p>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">발송에 사용할 이메일 계정 (여러 개 선택 가능)</label>
        {smtpAccounts.length === 0 ? (
          <p className="text-xs text-amber-600">등록된 이메일 계정이 없습니다. 먼저 이메일 계정 메뉴에서 등록해주세요.</p>
        ) : (
          <div className="space-y-2">
            {smtpAccounts.map((account) => (
              <label key={account.id} className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" name="smtpAccountIds" value={account.id} disabled={!account.is_active} />
                {account.label} {!account.is_active && <span className="text-xs text-gray-400">(사용 중지됨)</span>}
              </label>
            ))}
          </div>
        )}
        <p className="mt-1 text-xs text-gray-400">여러 계정을 선택하면 발송할 때 순서대로 돌려가며 나눠 보냅니다.</p>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

      <button
        type="submit"
        disabled={isPending || drafts.length === 0 || smtpAccounts.length === 0}
        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-60 text-white font-bold py-3 px-4 rounded-xl transition-all"
      >
        {isPending ? "저장 중..." : "캠페인 만들기"}
      </button>
    </form>
  );
}
