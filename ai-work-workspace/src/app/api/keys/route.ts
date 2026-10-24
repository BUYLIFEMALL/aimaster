// U3·U4: 「API키등록·플랫폼연동」 화면용 — 회원 본인 OpenAI·Claude·Gemini 키를 공용 표 user_api_keys에 저장·삭제한다.
// 메인 사이트 「API 설정」과 같은 표·같은 제공자 이름(openai·anthropic·gemini)이라 한 번 등록하면 다른 프로그램도 그대로 쓴다.
// 키 값은 돌려주지 않고 앞 몇 글자만 보여 준다(기록에도 남기지 않음).
import { NextResponse, type NextRequest } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { forgetMemberAiKeys } from "@/server/memberAiKeys";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const NO_STORE = { "Cache-Control": "private, no-store" };
const PROVIDERS = ["openai", "anthropic", "gemini"] as const;
type Provider = (typeof PROVIDERS)[number];
const isProvider = (v: unknown): v is Provider => typeof v === "string" && (PROVIDERS as readonly string[]).includes(v);
const mask = (k: string) => (k.length <= 8 ? "••••" : `${k.slice(0, 7)}••••${k.slice(-4)}`);

function sameSite(request: NextRequest) {
  const site = request.headers.get("sec-fetch-site");
  return !site || site === "same-origin" || site === "none";
}

export async function GET() {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ message: access.error }, { status: access.status, headers: NO_STORE });
  const { data, error } = await createAdminClient().from("user_api_keys").select("provider, api_key").eq("user_id", access.user.id).in("provider", [...PROVIDERS]);
  if (error) return NextResponse.json({ message: "등록 상태를 불러오지 못했습니다." }, { status: 503, headers: NO_STORE });
  const keys: Record<Provider, string | null> = { openai: null, anthropic: null, gemini: null };
  for (const row of data ?? []) if (isProvider(row.provider) && typeof row.api_key === "string" && row.api_key.trim()) keys[row.provider] = mask(row.api_key.trim());
  return NextResponse.json({ keys }, { headers: NO_STORE });
}

export async function POST(request: NextRequest) {
  if (!sameSite(request)) return NextResponse.json({ message: "다른 사이트에서 보낸 요청은 받지 않습니다." }, { status: 403 });
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ message: access.error }, { status: access.status, headers: NO_STORE });
  const body = await request.json().catch(() => ({}));
  const provider = body?.provider;
  const apiKey = typeof body?.apiKey === "string" ? body.apiKey.trim() : "";
  if (!isProvider(provider)) return NextResponse.json({ message: "지원하지 않는 키 종류입니다." }, { status: 400, headers: NO_STORE });
  if (apiKey.length < 20 || apiKey.length > 300 || /\s/.test(apiKey)) return NextResponse.json({ message: "API 키 형식이 올바르지 않습니다. 복사한 키 전체를 붙여 넣어 주세요." }, { status: 400, headers: NO_STORE });
  if (provider === "anthropic" && !apiKey.startsWith("sk-ant-")) return NextResponse.json({ message: "Claude API 키는 sk-ant- 로 시작합니다." }, { status: 400, headers: NO_STORE });
  // Gemini 키는 AIza… 와 새 형식 AQ.… 이 함께 쓰이므로 앞부분은 검사하지 않는다(OpenAI·Claude 키 오입력만 막음)
  if (provider === "gemini" && /^sk-/.test(apiKey)) return NextResponse.json({ message: "OpenAI·Claude 키가 아니라 Google AI Studio에서 받은 Gemini 키를 붙여 넣어 주세요." }, { status: 400, headers: NO_STORE });
  if (provider === "openai" && !apiKey.startsWith("sk-")) return NextResponse.json({ message: "OpenAI API 키는 sk- 로 시작합니다." }, { status: 400, headers: NO_STORE });
  const { error } = await createAdminClient().from("user_api_keys").upsert({ user_id: access.user.id, provider, api_key: apiKey }, { onConflict: "user_id,provider" });
  if (error) return NextResponse.json({ message: "저장하지 못했습니다. 잠시 후 다시 시도해 주세요." }, { status: 503, headers: NO_STORE });
  forgetMemberAiKeys(access.user.id);
  return NextResponse.json({ ok: true, masked: mask(apiKey) }, { headers: NO_STORE });
}

export async function DELETE(request: NextRequest) {
  if (!sameSite(request)) return NextResponse.json({ message: "다른 사이트에서 보낸 요청은 받지 않습니다." }, { status: 403 });
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ message: access.error }, { status: access.status, headers: NO_STORE });
  const provider = request.nextUrl.searchParams.get("provider");
  if (!isProvider(provider)) return NextResponse.json({ message: "지원하지 않는 키 종류입니다." }, { status: 400, headers: NO_STORE });
  const { error } = await createAdminClient().from("user_api_keys").delete().eq("user_id", access.user.id).eq("provider", provider);
  if (error) return NextResponse.json({ message: "삭제하지 못했습니다. 잠시 후 다시 시도해 주세요." }, { status: 503, headers: NO_STORE });
  forgetMemberAiKeys(access.user.id);
  return NextResponse.json({ ok: true }, { headers: NO_STORE });
}
