"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { connectInstagramAction, disconnectInstagramAction } from "@/lib/actions/instagram";

export function InstagramConnectSection({
  connected,
  username,
  needsReconnect,
  showNewCallback = false,
}: {
  connected: boolean;
  username: string | null;
  needsReconnect: boolean;
  showNewCallback?: boolean;
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
      // 누른 버튼(callback=new)도 함께 보낸다
      const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
      const result = await connectInstagramAction({}, new FormData(e.currentTarget, submitter));
      if (result?.error) setError(result.error);
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="space-y-3 rounded-xl border border-ig-border bg-ig-raised p-4">
      <p className="text-sm font-semibold text-ig-text">OAuth 연결</p>

      {needsReconnect && (
        <p className="rounded-lg border border-ig-warn/40 bg-ig-warn/10 p-2 text-xs font-medium text-ig-warn">
          ⚠️ 인스타그램 연결이 만료되었습니다. 아래에서 다시 연결해주세요.
        </p>
      )}

      {connected && !needsReconnect ? (
        <div className="space-y-3">
          <p className="text-sm text-ig-success">✅ @{username ?? "내 계정"}으로 연동되어 있어요.</p>
          <form action={disconnectInstagramAction}>
            <button type="submit" className="rounded-lg bg-ig-danger/10 px-4 py-2 text-xs font-bold text-ig-danger hover:bg-ig-danger/15">
              연동 해제
            </button>
          </form>
          {showNewCallback && (
            <form onSubmit={handleConnect} className="space-y-2">
              <input type="hidden" name="returnTo" value={pathname} />
              <button
                type="submit"
                name="callback"
                value="new"
                disabled={isPending}
                className="rounded-lg border border-ig-border bg-ig-surface px-4 py-2 text-xs font-bold text-ig-text hover:bg-ig-hover disabled:opacity-60"
              >
                {isPending ? "연결 중..." : "새 주소로 다시 연결 (Meta 앱에 새 콜백 주소를 등록한 경우)"}
              </button>
              {error && <p className="text-sm text-ig-danger bg-ig-danger/10 rounded-lg px-3 py-2">{error}</p>}
            </form>
          )}
        </div>
      ) : (
        <form onSubmit={handleConnect} className="space-y-3">
          <input type="hidden" name="returnTo" value={pathname} />
          <p className="text-sm text-ig-muted">
            위 Instagram 앱 ID / Instagram 앱 시크릿 코드를 먼저 등록한 뒤 연결해주세요. 연결하려면 인스타그램
            <strong className="text-ig-text"> 비즈니스 또는 크리에이터(전문) 계정</strong>이어야
            합니다(개인 계정은 지원되지 않아요). 연결 시 동의 화면에서 댓글 읽기/답글 권한
            (instagram_business_manage_comments)에 동의하셔야 합니다.
          </p>
          <button
            type="submit"
            disabled={isPending}
            className="w-full disabled:opacity-60 text-white font-bold py-3 px-4 rounded-full transition-all bg-ig-primary hover:bg-ig-primary-hover"
          >
            {isPending ? "연결 중..." : connected ? "다시 연결하기" : "계정 연결하기"}
          </button>
          {showNewCallback && (
            <button
              type="submit"
              name="callback"
              value="new"
              disabled={isPending}
              className="w-full rounded-xl border border-ig-border bg-ig-surface px-4 py-2.5 text-sm font-bold text-ig-text hover:bg-ig-hover disabled:opacity-60"
            >
              새 주소로 연결 (Meta 앱에 새 콜백 주소를 등록한 경우)
            </button>
          )}
          {error && <p className="text-sm text-ig-danger bg-ig-danger/10 rounded-lg px-3 py-2">{error}</p>}
        </form>
      )}
    </div>
  );
}
