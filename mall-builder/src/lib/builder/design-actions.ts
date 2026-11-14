"use server";

import { isStoreStaff } from "@/lib/store";
import { validateDoc } from "@/lib/blocks";
import { loadSlotData } from "@/lib/builder/slot-data";
import type { SlotData } from "@/app/s/[store]/home-slots";

// 디자인 빌더 D2-5 — 편집기 미리보기용 블록 데이터(읽기만). 운영자만, 블록은 저장 검사를 통과한 것만
// 편집기(클라이언트)에서 바로 부르므로 이동하지 않고 결과를 돌려준다

export async function previewSlotAction(storeId: string, block: unknown): Promise<{ ok: true; data: SlotData } | { ok: false; error: string }> {
  if (!(await isStoreStaff(storeId))) return { ok: false, error: "이 몰을 고칠 권한이 없습니다." };
  const v = validateDoc({ blocks: [block] });
  if (!v.ok) return { ok: false, error: v.error };
  return { ok: true, data: await loadSlotData(storeId, v.value.blocks[0]) };
}
