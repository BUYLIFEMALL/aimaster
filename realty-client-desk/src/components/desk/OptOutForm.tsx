"use client";

import { useActionState } from "react";
import { optOutAction } from "@/lib/actions/listings";

const kst = (iso: string) => new Date(iso).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", dateStyle: "long", timeStyle: "short" });

// 버튼 한 번으로 끝(링크 미리보기 로봇이 열기만 해도 거부되지 않게 버튼을 눌러야 처리). 연락처 밖의 정보는 묻지 않는다.
export function OptOutForm({ token, officeName, already }: { token: string; officeName: string; already: string | null }) {
  const [state, action, pending] = useActionState<{ done?: string; error?: string }, FormData>(optOutAction, already ? { done: already } : {});
  if (state.done) {
    // 시행령 제62조의2: 전송자 명칭·수신거부 사실과 날짜·처리 결과를 알린다
    return (
      <div className="mx-card space-y-2 p-6 text-sm text-mx-text">
        <p className="text-lg font-bold">✅ 수신거부가 처리됐어요</p>
        <p>보낸 곳: <b>{officeName}</b></p>
        <p>수신거부한 날짜: {kst(state.done)}</p>
        <p>처리 결과: 이 번호로 {officeName}의 매물 안내(광고) 문자가 더 이상 가지 않아요. 상담 연락은 그대로 받으실 수 있어요.</p>
        <p className="text-xs text-mx-muted">이 화면을 저장해 두시면 처리 결과 안내로 쓰실 수 있어요.</p>
      </div>
    );
  }
  return (
    <form action={action} className="mx-card space-y-3 p-6 text-sm text-mx-text">
      <input type="hidden" name="token" value={token} />
      <p className="text-lg font-bold">📵 {officeName}의 매물 안내(광고) 문자를 그만 받을까요?</p>
      <p className="text-mx-muted">비용은 들지 않고, 다른 정보는 묻지 않아요. 아래 버튼만 누르면 끝나요.</p>
      {state.error && <p className="text-mx-danger">{state.error}</p>}
      <button type="submit" disabled={pending} className="mx-btn-primary min-h-[48px] w-full px-4 text-base disabled:opacity-60">{pending ? "처리 중…" : "광고 문자 그만 받기"}</button>
    </form>
  );
}
