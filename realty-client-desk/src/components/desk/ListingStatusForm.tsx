"use client";

// 2026-11-20: 매물 상태 바꾸기 — 결과(성공·실패)를 그 줄 옆에 보여 준다. 예전에는 실패해도 문구가 없었다(C-1 E12).
// 응답이 분명하지 않으면(연결 끊김) 자동으로 다시 보내지 않고 새로고침을 안내한다.
// 보완(Mac 검수 msg_e76ff8708dd4): 부모는 key를 매물 ID로만 준다 — 상태가 바뀌어도 폼을 다시 만들지 않아 성공 문구가 남는다.
// 선택 상자는 제어형으로 두고 lib/desk/statusForm.ts 규칙으로 실제 상태와 맞춘다(오류면 저장된 값으로 되돌림).
import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { updateListingStatusAction, type ListingState } from "@/lib/actions/listings";
import { LISTING_STATUSES } from "@/lib/desk/adRules";
import { makeSyncUpdater, selectedAfter } from "@/lib/desk/statusForm";

export function ListingStatusForm({ id, status }: { id: string; status: string }) {
  const [selected, setSelected] = useState(status);
  const lastStatus = useRef(status);
  const chosen = useRef(status);
  const [state, action, pending] = useActionState<ListingState, FormData>(async (prev, fd) => {
    chosen.current = String(fd.get("status") ?? status);
    try {
      return await updateListingStatusAction(prev, fd);
    } catch {
      return { error: "바뀌었는지 확인하지 못했어요. 새로고침해서 상태를 확인해 주세요." };
    }
  }, {});

  // 서버가 목록을 새로 그려 실제 상태가 바뀌면 선택값을 맞춘다
  useEffect(() => {
    const prev = lastStatus.current; // updater가 늦게 실행돼도 쓰도록 지금 값을 붙잡는다
    lastStatus.current = status;
    setSelected(makeSyncUpdater(prev, status));
  }, [status]);
  // 응답이 오면 오류는 저장된 값으로 되돌리고, 성공은 고른 값 유지
  useEffect(() => {
    if (state.error || state.success) {
      const next = selectedAfter(state, lastStatus.current, chosen.current); // 지금 값으로 바로 계산(늦게 읽지 않음)
      setSelected(next);
    }
  }, [state]);

  return (
    // 2026-11-20 운영 실화면(v1.12 R2): <form action>은 저장이 끝나면 React가 폼을 초기화해 선택 상자가 첫 값 「광고 중」으로 보였다
    // (상태는 「후보」인데 다시 「상태 저장」하면 광고 중으로 바뀔 위험). 제출을 직접 처리해 자동 초기화를 막는다.
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => action(fd));
      }}
      className="flex flex-wrap items-center gap-1"
    >
      <input type="hidden" name="id" value={id} />
      <select name="status" value={selected} onChange={(e) => setSelected(e.target.value)} aria-label="상태" className="mx-input min-h-[40px] w-auto py-1">
        {LISTING_STATUSES.map((s) => <option key={s}>{s}</option>)}
      </select>
      <button type="submit" disabled={pending} className="mx-btn-ghost min-h-[40px] px-3 text-xs disabled:opacity-60">{pending ? "저장 중…" : "상태 저장"}</button>
      {state.error && <span role="alert" className="text-xs text-mx-danger">{state.error}</span>}
      {state.success && <span role="status" className="text-xs text-mx-success">{state.success}</span>}
    </form>
  );
}
