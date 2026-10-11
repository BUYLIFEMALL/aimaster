import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { getRegisteredApiKeys, type ApiKeyProvider, ALL_PROVIDERS } from "@/lib/apiKeys";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyYouTubeApiKey } from "@/lib/youtube/client";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET() {
  try {
    const access = await checkProgramAccessApi();
    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }
    const keys = await getRegisteredApiKeys(access.user.id);
    return NextResponse.json({ keys });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const access = await checkProgramAccessApi();
    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const { provider, apiKey } = await request.json();

    if (!ALL_PROVIDERS.includes(provider as ApiKeyProvider)) {
      return NextResponse.json({ error: "지원하지 않는 API 프로바이더입니다." }, { status: 400 });
    }
    if (!apiKey || typeof apiKey !== "string" || apiKey.trim().length === 0) {
      return NextResponse.json({ error: "API 키를 입력해주세요." }, { status: 400 });
    }

    const trimmedKey = apiKey.trim();

    // YouTube 키는 저장 전에 실제 YouTube 서버로 유효성을 검증한다.
    if (provider === "youtube_api_key") {
      try {
        await verifyYouTubeApiKey(trimmedKey);
      } catch (err) {
        return NextResponse.json({ error: `API 키 검증 실패: ${(err as Error).message}` }, { status: 400 });
      }
    }

    // user_id를 로그인한 회원 본인으로 고정해서 저장한다(서비스 키 사용 시 소유자 한정).
    const adminClient = createAdminClient();
    const { error } = await adminClient.from("user_api_keys").upsert(
      {
        user_id: access.user.id,
        provider,
        api_key: trimmedKey,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,provider" }
    );
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "API 키가 성공적으로 등록되었습니다." });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const access = await checkProgramAccessApi();
    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const provider = new URL(request.url).searchParams.get("provider");
    if (!provider || !ALL_PROVIDERS.includes(provider as ApiKeyProvider)) {
      return NextResponse.json({ error: "삭제할 프로바이더를 지정해주세요." }, { status: 400 });
    }

    const adminClient = createAdminClient();
    const { error } = await adminClient
      .from("user_api_keys")
      .delete()
      .eq("user_id", access.user.id)
      .eq("provider", provider);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "API 키가 삭제되었습니다." });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
