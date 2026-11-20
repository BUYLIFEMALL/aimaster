"use server";

import { createHash } from "node:crypto";
import { requireProgramAccess } from "@/lib/access";

// C-1(2026-11-20): 고객관리로 후보를 넘길 때 두 창이 같은 계정인지 맞춰 보는 값.
// 로그인 세션 user.id의 SHA-256 앞 16자 — 원문 id·이메일은 내보내지 않는다.
// 서버 컴포넌트 prop으로 넘기지 않고(HTML에 남음) 버튼을 누를 때만 이 액션으로 받는다. 로그·저장 없음.
export async function getHandoffAcct(): Promise<string | null> {
  const user = await requireProgramAccess();
  if (!user?.id) return null;
  return createHash("sha256").update(user.id).digest("hex").slice(0, 16);
}
