"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  addCafeTargetAction,
  updateCafeTargetAction,
  deleteCafeTargetAction,
  type TargetActionState,
} from "@/lib/actions/accounts";
import type { CafeTarget } from "@/types/post";

const initialState: TargetActionState = {};

function EditTargetRow({ target, onCancel }: { target: CafeTarget; onCancel: () => void }) {
  const [state, formAction, isPending] = useActionState(updateCafeTargetAction, initialState);
  const [label, setLabel] = useState(target.label);
  const [clubId, setClubId] = useState(target.club_id);
  const [menuId, setMenuId] = useState(target.menu_id);

  return (
    <li className="space-y-2 rounded-lg border border-neutral-300 bg-neutral-50 p-3">
      <form action={formAction} className="space-y-2">
        <input type="hidden" name="targetId" value={target.id} />
        <Input name="label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="카페 이름" required />
        <div className="flex gap-2">
          <Input name="clubId" value={clubId} onChange={(e) => setClubId(e.target.value)} placeholder="club_id" required />
          <Input name="menuId" value={menuId} onChange={(e) => setMenuId(e.target.value)} placeholder="menu_id" required />
        </div>
        <div className="flex gap-2">
          <Button type="submit" variant="secondary" disabled={isPending}>
            {isPending ? "저장 중..." : "저장"}
          </Button>
          <Button type="button" variant="ghost" onClick={onCancel}>
            취소
          </Button>
        </div>
        {state.error && <p className="text-xs text-red-600">{state.error}</p>}
      </form>
    </li>
  );
}

export function CafeTargetManager({ targets }: { targets: CafeTarget[] }) {
  const [state, formAction, isPending] = useActionState(addCafeTargetAction, initialState);
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      {targets.length > 0 && (
        <ul className="space-y-2">
          {targets.map((target) =>
            editingId === target.id ? (
              <EditTargetRow key={target.id} target={target} onCancel={() => setEditingId(null)} />
            ) : (
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
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setEditingId(target.id)}
                    className="text-xs text-neutral-600 hover:underline"
                  >
                    수정
                  </button>
                  <form action={deleteCafeTargetAction}>
                    <input type="hidden" name="targetId" value={target.id} />
                    <button type="submit" className="text-xs text-red-600 hover:underline">
                      삭제
                    </button>
                  </form>
                </div>
              </li>
            ),
          )}
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
