"use server";

import { createHash } from "node:crypto";
import { requireProgramAccess } from "@/lib/access";

// C-1(2026-11-20): 매물 알림에서 후보를 받을 때 두 창이 같은 계정인지 맞춰 보는 값(매물 알림과 같은 계산).
// 로그인 세션 user.id의 SHA-256 앞 16자 — 원문 id·이메일은 내보내지 않는다. prop·저장·로그 없음.
export async function getHandoffAcct(): Promise<string | null> {
  const user = await requireProgramAccess();
  if (!user?.id) return null;
  return createHash("sha256").update(user.id).digest("hex").slice(0, 16);
}
