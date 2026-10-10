import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { getRegisteredApiKeys, type ApiKeyProvider, ALL_PROVIDERS } from "@/lib/apiKeys";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyYouTubeApiKey } from "@/lib/youtube/client";

export async function GET() {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const keys = await getRegisteredApiKeys(user.id);
    return NextResponse.json({ keys });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const { provider, apiKey } = await request.json();

    if (!ALL_PROVIDERS.includes(provider as ApiKeyProvider)) {
      return NextResponse.json({ error: "지원하지 않는 API 프로바이더입니다." }, { status: 400 });
    }

    if (!apiKey || typeof apiKey !== "string" || apiKey.trim().length === 0) {
      return NextResponse.json({ error: "API 키를 입력해주세요." }, { status: 400 });
    }

    const trimmedKey = apiKey.trim();

    // YouTube 키인 경우 실시간 유효성 검증
    if (provider === "youtube_api_key") {
      try {
        await verifyYouTubeApiKey(trimmedKey);
      } catch (err: any) {
        return NextResponse.json(
          { error: `API 키 검증 실패: ${err.message}` },
          { status: 400 }
        );
      }
    }

    const adminClient = createAdminClient();
    const { error } = await adminClient.from("user_api_keys").upsert(
      {
        user_id: user.id,
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
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const provider = searchParams.get("provider");

    if (!provider) {
      return NextResponse.json({ error: "삭제할 프로바이더를 지정해주세요." }, { status: 400 });
    }

    const adminClient = createAdminClient();
    const { error } = await adminClient
      .from("user_api_keys")
      .delete()
      .eq("user_id", user.id)
      .eq("provider", provider);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "API 키가 삭제되었습니다." });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
