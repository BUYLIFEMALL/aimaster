"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { connectInstagramAction, disconnectInstagramAction } from "@/lib/actions/instagram";

export function InstagramConnectSection({
  connected,
  username,
  needsReconnect,
  bare,
}: {
  connected: boolean;
  username: string | null;
  needsReconnect: boolean;
  /** true면 카드 외곽선/제목 없이 내용만 렌더링한다(다른 섹션 안에 이어붙일 때 사용). */
  bare?: boolean;
}) {
  const pathname = usePathname();
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  // connectInstagramAction은 성공 시 서버에서 바로 redirect()하므로(next/navigation의 redirect는
  // 내부적으로 특수 예외를 던져 Next.js가 처리한다), 실패했을 때만 이 컴포넌트로 결과가 돌아온다.
  async function handleConnect(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsPending(true);
    try {
      const result = await connectInstagramAction({}, new FormData(e.currentTarget));
      if (result?.error) setError(result.error);
    } finally {
      setIsPending(false);
    }
  }

  const content = (
    <>
      {needsReconnect && (
        <p className="rounded-lg border border-amber-300 bg-amber-50 p-2 text-xs font-medium text-amber-800">
          ⚠️ 인스타그램 연결이 만료되었습니다. 아래에서 다시 연결해주세요.
        </p>
      )}

      {connected && !needsReconnect ? (
        <div className="space-y-3">
          <p className="text-sm text-green-600">✅ @{username ?? "내 계정"}으로 연동되어 있어요.</p>
          <form action={disconnectInstagramAction}>
            <button type="submit" className="rounded-lg bg-red-50 px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-100">
              연동 해제
            </button>
          </form>
        </div>
      ) : (
        <form onSubmit={handleConnect} className="space-y-3">
          <input type="hidden" name="returnTo" value={pathname} />
          <p className="text-sm text-gray-500">
            위 Meta App ID/Secret을 먼저 등록한 뒤 연결해주세요. 연결하려면 인스타그램
            <strong className="text-gray-700"> 비즈니스 또는 크리에이터(전문) 계정</strong>이어야
            합니다(개인 계정은 지원되지 않아요). 연결 시 동의 화면에서 DM 읽기/발송 권한
            (instagram_business_manage_messages)에 동의하셔야 합니다.
          </p>
          <button
            type="submit"
            disabled={isPending}
            className="w-full bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500 hover:opacity-90 disabled:opacity-60 text-white font-bold py-3 px-4 rounded-xl transition-all"
          >
            {isPending ? "연결 중..." : connected ? "다시 연결하기" : "계정 연결하기"}
          </button>
          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
        </form>
      )}
    </>
  );

  if (bare) return <div className="space-y-3">{content}</div>;

  return (
    <section className="glass-card space-y-3 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-bold text-gray-900">📸 인스타그램 계정 연결</h2>
      {content}
    </section>
  );
}
