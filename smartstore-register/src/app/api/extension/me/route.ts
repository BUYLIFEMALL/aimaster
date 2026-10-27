import { NextResponse } from "next/server";
import { emailOf, userFromExtension } from "@/lib/extension/token";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

/** 확장이 「어느 계정과 연결됐는지」 묻는다(이메일만, 2026-10-27 v1.16) */
export async function GET(req: Request) {
  const who = await userFromExtension(req);
  if (!who.ok) return NextResponse.json({ error: who.error }, { status: who.status });
  return NextResponse.json({ email: await emailOf(who.userId) });
}
