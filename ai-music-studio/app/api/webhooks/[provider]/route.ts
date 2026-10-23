import { NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import { createAdminClient } from "@/lib/supabase/server";
import { getUserApiKey } from "@/lib/access";
import { PROVIDERS } from "@/lib/providers/catalog";
import { advance, type GenerationRow } from "@/lib/generations";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
// 응답은 바로 보내고(공급자 재전송 방지) 결과 확인·저장은 waitUntil로 뒤에서 한다
export const maxDuration = 300;

// v1.03 공급자 완료 신호(웹훅) — 화면을 닫아도 곡이 완성 처리되게 한다.
// 웹훅에는 서명이 없거나 공급자마다 달라, 본문 내용(결과 주소·성공/실패)은 믿지 않고 「이 작업 번호가 끝났다」는 신호로만 쓴다.
// 저장·실패 판정은 회원 본인 키로 공급자에 다시 조회한 결과로만 한다(advance — 음악(SUNO)자동화 v1.37과 같은 방식).
// 로그인 세션이 없는 외부 요청이라 권한 검사 대신 작업 번호가 진행 중인 행과 맞는지로만 찾는다(모르는 번호는 무시).
type Hook = "fal" | "replicate" | "suno";

function taskIdOf(provider: Hook, body: Record<string, unknown>): string | null {
  const s = (v: unknown) => (typeof v === "string" && v.length <= 200 ? v : null);
  if (provider === "fal") return s(body.request_id) ?? s(body.gateway_request_id);
  if (provider === "replicate") return s(body.id);
  const data = body.data as Record<string, unknown> | undefined;
  return s(data?.task_id) ?? s(data?.taskId);
}

export async function POST(request: Request, { params }: { params: { provider: string } }) {
  const provider = params.provider as Hook;
  if (!["fal", "replicate", "suno"].includes(provider)) return NextResponse.json({ ok: false }, { status: 404 });
  let body: Record<string, unknown>;
  try {
    const raw = await request.text();
    if (raw.length > 200_000) return NextResponse.json({ ok: false }, { status: 413 });
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400 });
  }
  const taskId = taskIdOf(provider, body);
  if (!taskId) return NextResponse.json({ ok: true, ignored: "no task id" });

  const admin = createAdminClient();
  const { data } = await admin
    .from("ams_generations")
    .select("*")
    .eq("provider", provider)
    .eq("provider_task_id", taskId)
    .eq("status", "running")
    .maybeSingle();
  const row = data as GenerationRow | null;
  if (!row) return NextResponse.json({ ok: true, ignored: "unknown or finished" });

  waitUntil(
    (async () => {
      try {
        const key = await getUserApiKey(row.user_id, PROVIDERS[row.provider].keyProvider);
        await advance(admin, row, key);
      } catch (e) {
        console.error("[webhook] 처리 실패:", provider, e instanceof Error ? e.message : e);
      }
    })(),
  );
  return NextResponse.json({ ok: true });
}
