"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { connectKakaoAccountAction, disconnectKakaoAccountAction } from "@/lib/actions/kakaoAccount";

export interface KakaoAccountData {
  nickname: string | null;
}

/**
 * 카카오 로그인으로 "나에게 보내기" 무료 API를 연동하는 설정 섹션. 카카오톡 채널 개설이나
 * SOLAPI 계정 등록 없이, 로그인 동의 한 번이면 본인 "나와의 채팅방"으로 리포트를 받을 수 있다
 * — SOLAPI 연동(아래 섹션)을 대체하는 게 아니라 더 쉬운 대안으로 나란히 제공한다. 리포트
 * 발송 시 이 계정이 연동되어 있으면 이쪽을 우선 사용하고, 없으면 기존 SOLAPI 경로로 자동
 * 전환된다(lib/kakaoSend.ts).
 */
export function KakaoAccountSection({ account }: { account: KakaoAccountData | null }) {
  const router = useRouter();
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  async function handleConnect() {
    setIsConnecting(true);
    try {
      await connectKakaoAccountAction();
    } finally {
      setIsConnecting(false);
    }
  }

  async function handleDisconnect() {
    if (!confirm("카카오 로그인 연동을 해제할까요? 이후 발송은 SOLAPI 연동이 있을 때만 계속됩니다.")) return;
    setIsDisconnecting(true);
    try {
      await disconnectKakaoAccountAction();
      router.refresh();
    } finally {
      setIsDisconnecting(false);
    }
  }

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-bold text-neutral-900">💛 카카오 로그인으로 받기 (무료, 추천)</h2>
      <p className="text-xs text-neutral-500">
        카카오톡 채널이나 SOLAPI 계정 없이, 카카오 로그인만으로 리포트를 본인 카카오톡
        &quot;나와의 채팅방&quot;으로 무료로 받아볼 수 있습니다. 연동해두면 아래 SOLAPI
        연동보다 이 방식을 우선 사용합니다.
      </p>

      {account ? (
        <div className="space-y-3 rounded-lg border border-neutral-200 bg-neutral-50 p-4">
          <p className="text-sm text-green-600">✅ {account.nickname ?? "카카오 계정"}으로 연동되어 있어요.</p>
          <Button type="button" variant="ghost" className="text-red-600 hover:bg-red-50" onClick={handleDisconnect} disabled={isDisconnecting}>
            {isDisconnecting ? "해제 중..." : "연동 해제"}
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
          <Button type="button" onClick={handleConnect} disabled={isConnecting}>
            {isConnecting ? "연결 중..." : "💬 카카오 로그인으로 연동하기"}
          </Button>
        </div>
      )}
    </div>
  );
}
