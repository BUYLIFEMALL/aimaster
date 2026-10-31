"use server";

import { requireProgramAccess } from "@/lib/access";
import { getWingKeys } from "@/lib/data";
import { callBudgetBlock } from "@/lib/coupang/usage";
import { takeReadSlot } from "@/lib/readGap";
import { TODAY_READ_GAP_SECONDS } from "@/lib/readGapRule";
import { readTodayCounts } from "@/lib/coupang/todayRead";
import type { Count, TodayCounts } from "@/lib/coupang/summary";

// 플랜 A1 「오늘 할 일」: 버튼을 눌렀을 때만, 회원별 30초 간격(고정 IP 호출 보호). 읽는 내용은 lib/coupang/todayRead.ts

export type { Count };
export type TodayResult = ({ ok: true } & TodayCounts) | { ok: false; error: string };

export async function todaySummaryAction(): Promise<TodayResult> {
  const user = await requireProgramAccess();
  const keys = await getWingKeys(user.id);
  if (!keys) return { ok: false, error: "먼저 「API키등록·플랫폼연동」에서 키를 등록해 주세요." };
  const blocked = await callBudgetBlock(user.id);
  if (blocked) return { ok: false, error: blocked };
  const wait = await takeReadSlot(user.id, "coupang_today_read", TODAY_READ_GAP_SECONDS);
  if (wait > 0) return { ok: false, error: `조금 전에 불러왔습니다. ${wait}초 뒤에 다시 눌러 주세요.` };
  return { ok: true, ...(await readTodayCounts(keys)) };
}
