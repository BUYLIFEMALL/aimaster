"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { connectTelegramAction, disconnectTelegramAction, reregisterTelegramWebhookAction } from "@/lib/actions/telegram";

export interface TelegramLinkData {
  bot_username: string | null;
}

/**
 * "카카오톡으로 발송 전에 텔레그램으로 한 번 검토 후 발행 여부를 결정"하는 기능의 설정
 * 섹션. 연동해두면 리포트가 생성될 때마다(수동 "지금 생성" / 예약 자동 생성 모두) 텔레그램으로
 * "✅ 카카오로 발행 / ❌ 발행 안 함" 버튼과 함께 요약이 오고, 버튼을 눌러 바로 결정할 수 있다.
 * youtube-auto-reply의 "답변승인" 텔레그램 연동과 동일한 구조를 이 프로젝트 팔레트로 재구성했다.
 */
export function TelegramSection({ link }: { link: TelegramLinkData | null }) {
  const router = useRouter();
  const [botToken, setBotToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isReregistering, setIsReregistering] = useState(false);

  async function handleConnect(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsPending(true);
    try {
      const result = await connectTelegramAction({}, new FormData(e.currentTarget));
      if (result.error) {
        setError(result.error);
      } else {
        setSuccess(result.success ?? "연동이 완료됐어요.");
        setBotToken("");
        router.refresh();
      }
    } finally {
      setIsPending(false);
    }
  }

  async function handleDisconnect() {
    if (!confirm("텔레그램 연동을 해제할까요? 앞으로 리포트 생성 시 카카오 발행 전 검토 알림이 오지 않습니다.")) return;
    setIsDisconnecting(true);
    try {
      await disconnectTelegramAction();
      router.refresh();
    } finally {
      setIsDisconnecting(false);
    }
  }

  async function handleReregister() {
    setIsReregistering(true);
    try {
      await reregisterTelegramWebhookAction();
      router.refresh();
    } finally {
      setIsReregistering(false);
    }
  }

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-bold text-neutral-900">📮 텔레그램 사전 검토 (카카오 발행 전)</h2>
      <p className="text-xs text-neutral-500">
        연동해두면 리포트가 생성될 때마다 텔레그램으로 요약을 보내드리고, &quot;✅ 카카오로
        발행 / ❌ 발행 안 함&quot; 버튼으로 그 자리에서 발행 여부를 결정할 수 있습니다.
        연동하지 않으면 지금처럼 웹 화면에서 직접 확인 후 발송 버튼을 누르면 됩니다(필수 아님).
      </p>

      {link ? (
        <div className="space-y-3 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
          <p className="text-sm text-green-600">✅ @{link.bot_username ?? "내 봇"}으로 연동되어 있어요.</p>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="ghost" onClick={handleReregister} disabled={isReregistering}>
              {isReregistering ? "재등록 중..." : "🔄 웹훅 재등록"}
            </Button>
            <Button type="button" variant="ghost" className="text-red-600 hover:bg-red-50" onClick={handleDisconnect} disabled={isDisconnecting}>
              {isDisconnecting ? "해제 중..." : "연동 해제"}
            </Button>
          </div>
          <p className="text-xs text-neutral-400">버튼이 응답하지 않으면 웹훅 재등록을 눌러보세요.</p>
        </div>
      ) : (
        <div className="space-y-3 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
          <ol className="list-decimal space-y-1 pl-4 text-xs text-neutral-600">
            <li>텔레그램에서 @BotFather를 찾아 /newbot으로 봇을 만들고 토큰을 받으세요.</li>
            <li>만든 봇을 열어 아무 메시지나 1개 보내주세요.</li>
            <li>아래 입력창에 토큰을 붙여넣고 &quot;연동 확인하기&quot;를 눌러주세요.</li>
          </ol>
          <form onSubmit={handleConnect} className="space-y-3">
            <Input
              name="botToken"
              value={botToken}
              onChange={(e) => setBotToken(e.target.value)}
              placeholder="봇 토큰 (예: 123456:AAF...)"
              required
              autoComplete="off"
            />
            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}
            {success && <p className="text-xs text-green-600">{success}</p>}
            <Button type="submit" disabled={isPending}>
              {isPending ? "확인 중..." : "연동 확인하기"}
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
