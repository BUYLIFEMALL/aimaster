"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { connectThreadsAction, disconnectThreadsAction } from "@/lib/actions/threads";

export function ThreadsConnectSection({
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

  // connectThreadsAction은 성공 시 서버에서 바로 redirect()하므로(next/navigation의 redirect는
  // 내부적으로 특수 예외를 던져 Next.js가 처리한다), 실패했을 때만 이 컴포넌트로 결과가 돌아온다.
  async function handleConnect(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsPending(true);
    try {
      // 누른 버튼(callback=new)도 함께 보낸다
      const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
      const result = await connectThreadsAction({}, new FormData(e.currentTarget, submitter));
      if (result?.error) setError(result.error);
    } finally {
      setIsPending(false);
    }
  }

  return (
    <section className="glass-card space-y-3 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-bold text-gray-900">🧵 쓰레드 계정 연결</h2>

      {needsReconnect && (
        <p className="rounded-lg border border-amber-300 bg-amber-50 p-2 text-xs font-medium text-amber-800">
          ⚠️ 쓰레드 연결이 만료되었습니다. 아래에서 다시 연결해주세요.
        </p>
      )}

      {connected && !needsReconnect ? (
        <div className="space-y-3">
          <p className="text-sm text-green-600">✅ @{username ?? "내 계정"}으로 연동되어 있어요.</p>
          <form action={disconnectThreadsAction}>
            <button type="submit" className="rounded-lg bg-red-50 px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-100">
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
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-xs font-bold text-gray-800 hover:bg-gray-50 disabled:opacity-60"
              >
                {isPending ? "연결 중..." : "새 주소로 다시 연결 (Meta 앱에 새 콜백 주소를 등록한 경우)"}
              </button>
              {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
            </form>
          )}
        </div>
      ) : (
        <form onSubmit={handleConnect} className="space-y-3">
          <input type="hidden" name="returnTo" value={pathname} />
          <p className="text-sm text-gray-500">
            위 Threads 앱 ID / Threads 앱 시크릿 코드를 먼저 등록한 뒤 연결해주세요. 연결 시 동의 화면에서 댓글 읽기/답글
            권한(<code className="text-xs">threads_read_replies</code>,{" "}
            <code className="text-xs">threads_manage_replies</code>)에 동의하셔야 합니다.
          </p>
          <button
            type="submit"
            disabled={isPending}
            className="w-full bg-gradient-to-r from-neutral-800 via-neutral-900 to-black hover:opacity-90 disabled:opacity-60 text-white font-bold py-3 px-4 rounded-xl transition-all"
          >
            {isPending ? "연결 중..." : connected ? "다시 연결하기" : "계정 연결하기"}
          </button>
          {showNewCallback && (
            <button
              type="submit"
              name="callback"
              value="new"
              disabled={isPending}
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-bold text-gray-800 hover:bg-gray-50 disabled:opacity-60"
            >
              새 주소로 연결 (Meta 앱에 새 콜백 주소를 등록한 경우)
            </button>
          )}
          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
        </form>
      )}
    </section>
  );
}
