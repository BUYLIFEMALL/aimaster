"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { addCafeTargetAction, deleteCafeTargetAction, type TargetActionState } from "@/lib/actions/accounts";
import type { CafeTarget } from "@/types/post";

const initialState: TargetActionState = {};

export function CafeTargetManager({ targets }: { targets: CafeTarget[] }) {
  const [state, formAction, isPending] = useActionState(addCafeTargetAction, initialState);

  return (
    <div className="space-y-3">
      {targets.length > 0 && (
        <ul className="space-y-2">
          {targets.map((target) => (
            <li
              key={target.id}
              className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white p-3"
            >
              <div>
                <p className="text-sm font-medium text-neutral-900">{target.label}</p>
                <p className="text-xs text-neutral-500">
                  club_id: {target.club_id} · menu_id: {target.menu_id}
                </p>
              </div>
              <form action={deleteCafeTargetAction}>
                <input type="hidden" name="targetId" value={target.id} />
                <button type="submit" className="text-xs text-red-600 hover:underline">
                  삭제
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}

      <form action={formAction} className="space-y-2 rounded-lg border border-dashed border-neutral-300 p-3">
        <p className="text-xs font-medium text-neutral-700">카페 게시판 추가</p>
        <p className="text-xs text-neutral-500">
          네이버 카페 관리 화면(PC 웹)에서 게시판 URL의 쿼리스트링에 있는 clubid/menuid 값을
          그대로 입력해주세요. 네이버 오픈API에는 카페 목록을 자동으로 불러오는 기능이 없어
          직접 입력이 필요합니다.
        </p>
        <Input name="label" placeholder="카페 이름 (예: 우리 스터디 카페 - 공지 게시판)" required />
        <div className="flex gap-2">
          <Input name="clubId" placeholder="club_id" required />
          <Input name="menuId" placeholder="menu_id" required />
        </div>
        <Button type="submit" variant="secondary" disabled={isPending}>
          {isPending ? "추가 중..." : "추가"}
        </Button>
        {state.error && <p className="text-xs text-red-600">{state.error}</p>}
      </form>
    </div>
  );
}
