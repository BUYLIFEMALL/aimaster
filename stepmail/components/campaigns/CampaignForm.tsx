"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createCampaignAction } from "@/lib/actions/campaigns";
import type { CampaignChannel, CampaignRecurrence, MobileType } from "@/types/database.types";
import { buildSmsText, smsBytes, SMS_MAX_BYTES, LMS_MAX_BYTES } from "@/lib/sms";

const TARGET_SEND_COUNT_OPTIONS = Array.from({ length: 5 }, (_, n) => n); // 0~4차까지 받은 리드 대상

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

const CHANNEL_OPTIONS: [CampaignChannel, string][] = [
  ["email", "📧 이메일"],
  ["sms", "📱 문자"],
  ["both", "📧+📱 둘 다"],
];

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
  hasSolapi,
  hasKakaoPf,
}: {
  drafts: DraftOption[];
  smtpAccounts: SmtpAccountOption[];
  defaultDraftId?: string;
  hasSolapi: boolean;
  /** v1.28 본인 카카오 채널 ID(pfId)를 등록했는지 — 없으면 카카오 선택지를 막는다 */
  hasKakaoPf: boolean;
}) {
  const router = useRouter();
  const [recurrence, setRecurrence] = useState<CampaignRecurrence>("once");
  // v1.27 문자(SMS·LMS) 차수 발송: 채널에 따라 이메일 칸과 문자 칸을 나눠 보여 준다.
  const [channel, setChannel] = useState<CampaignChannel>("email");
  const [smsText, setSmsText] = useState("");
  const [smsOptout, setSmsOptout] = useState("");
  // v1.28 휴대폰 발송 방식: 문자 또는 카카오 브랜드 메시지(본인 카카오 채널 등록 시에만)
  const [mobileType, setMobileType] = useState<MobileType>("sms");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const wantsEmail = channel !== "sms";
  const wantsSms = channel !== "email";
  const preview = buildSmsText(smsText || "본문을 입력하세요", smsOptout || "무료수신거부 080-000-0000", "홍길동");
  const previewBytes = smsBytes(preview);

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
        <label className="block text-sm font-semibold text-gray-700 mb-1">발송 채널</label>
        <div className="flex flex-wrap gap-2">
          {CHANNEL_OPTIONS.map(([value, label]) => (
            <label
              key={value}
              className={`flex min-h-[40px] cursor-pointer items-center gap-2 whitespace-nowrap rounded-lg border px-3 text-sm ${
                channel === value ? "border-blue-500 bg-blue-50 font-semibold text-blue-700" : "border-gray-200 text-gray-600"
              }`}
            >
              <input type="radio" name="channel" value={value} checked={channel === value} onChange={() => setChannel(value)} />
              {label}
            </label>
          ))}
        </div>
        <p className="mt-1 text-xs text-gray-400">
          문자는 전화번호가 있는 리드에게만 나갑니다. 「둘 다」는 메일·문자 중 하나라도 성공하면 다음 차수로 넘어갑니다.
        </p>
      </div>

      {wantsSms && (
        <div className="space-y-3 rounded-xl border border-blue-100 bg-blue-50/40 p-4">
          {!hasSolapi && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
              설정 → 「📱 SOLAPI 문자 계정」에서 본인 계정을 먼저 연결해 주세요(다른 AIMaster 프로그램에서 연결했다면 그대로 쓰입니다).
            </p>
          )}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">휴대폰 발송 방식</label>
            <div className="flex flex-wrap gap-2">
              {([
                ["sms", "📱 문자(SMS·LMS)"],
                ["kakao", "💬 카카오 브랜드 메시지"],
              ] as [MobileType, string][]).map(([value, label]) => {
                const disabled = value === "kakao" && !hasKakaoPf;
                return (
                  <label
                    key={value}
                    className={`flex min-h-[40px] items-center gap-2 whitespace-nowrap rounded-lg border px-3 text-sm ${
                      disabled ? "cursor-not-allowed border-gray-100 text-gray-300" : "cursor-pointer"
                    } ${mobileType === value ? "border-blue-500 bg-blue-50 font-semibold text-blue-700" : disabled ? "" : "border-gray-200 text-gray-600"}`}
                  >
                    <input
                      type="radio"
                      name="mobileType"
                      value={value}
                      checked={mobileType === value}
                      disabled={disabled}
                      onChange={() => setMobileType(value)}
                    />
                    {label}
                  </label>
                );
              })}
            </div>
            {!hasKakaoPf ? (
              <p className="mt-1 text-xs text-gray-400">
                카카오 브랜드 메시지는 설정 → 「📱 문자·카카오 (SOLAPI)」에서 본인 카카오 채널 ID(pfId)를 등록해야 쓸 수 있습니다.
              </p>
            ) : mobileType === "kakao" ? (
              <div className="mt-2 space-y-1">
                <label className="flex items-center gap-2 text-sm text-gray-600">
                  <input type="checkbox" name="kakaoFallbackSms" />
                  카카오로 못 받는 고객에게는 같은 내용을 문자로 대신 보내기
                </label>
                <p className="text-xs text-gray-400">
                  본인 카카오 채널을 친구로 추가한 고객에게만 카카오로 나갑니다. 대신 보내기를 켜면 나머지 고객은 문자 요금이 듭니다.
                </p>
              </div>
            ) : null}
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">{mobileType === "kakao" ? "메시지 본문" : "문자 본문"}</label>
            <textarea
              name="smsText"
              required
              rows={4}
              value={smsText}
              onChange={(e) => setSmsText(e.target.value)}
              placeholder="예: [상호명] {닉네임}님, 지난번 문의하신 상품 소식 전해 드려요. 자세히 보기 https://..."
              className="input"
            />
            <p className="mt-1 text-xs text-gray-400">
              {"{닉네임}"}은 리드 닉네임으로 바뀝니다(없으면 「고객」). 보내는 사람(상호명)을 본문 앞쪽에 넣어 주세요.
            </p>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">수신거부 안내 (필수)</label>
            <input
              name="smsOptout"
              required
              value={smsOptout}
              onChange={(e) => setSmsOptout(e.target.value)}
              placeholder="무료수신거부 080-000-0000"
              className="input"
            />
            <p className="mt-1 text-xs text-gray-400">
              광고 문자에는 「(광고)」 표시와 무료 수신거부 방법이 꼭 들어가야 합니다(정보통신망법). 「(광고)」는 자동으로 붙습니다.
            </p>
          </div>
          <div>
            <p className="mb-1 text-xs font-semibold text-gray-600">
              미리보기 · {previewBytes}바이트 ·{" "}
              {previewBytes <= SMS_MAX_BYTES ? "단문(SMS)" : previewBytes <= LMS_MAX_BYTES ? "장문(LMS)" : "너무 깁니다(2000바이트 이하)"}
            </p>
            <pre className="whitespace-pre-wrap rounded-lg border border-gray-200 bg-white p-3 text-sm text-gray-700">{preview}</pre>
          </div>
        </div>
      )}

      {wantsEmail && (
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
      )}

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

      {wantsEmail && (
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
      )}

      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

      <button
        type="submit"
        disabled={
          isPending ||
          (wantsEmail && (drafts.length === 0 || smtpAccounts.length === 0)) ||
          (wantsSms && (!hasSolapi || previewBytes > LMS_MAX_BYTES || (mobileType === "kakao" && !hasKakaoPf)))
        }
        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-60 text-white font-bold py-3 px-4 rounded-xl transition-all"
      >
        {isPending ? "저장 중..." : "캠페인 만들기"}
      </button>
    </form>
  );
}
