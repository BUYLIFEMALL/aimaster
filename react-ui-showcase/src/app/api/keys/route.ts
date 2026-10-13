import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getUserGeminiApiKey, saveUserGeminiApiKey, deleteUserGeminiApiKey } from "@/lib/apiKeys";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const key = await getUserGeminiApiKey(user.id);
    return NextResponse.json({
      hasKey: !!key,
      maskedKey: key ? `${key.substring(0, 4)}...${key.substring(key.length - 4)}` : null,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const { apiKey } = await req.json();
    if (!apiKey || !apiKey.trim()) {
      return NextResponse.json({ error: "API 키를 입력해주세요." }, { status: 400 });
    }

    const res = await saveUserGeminiApiKey(user.id, apiKey);
    if (!res.success) {
      return NextResponse.json({ error: res.error }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }

    const res = await deleteUserGeminiApiKey(user.id);
    if (!res.success) {
      return NextResponse.json({ error: res.error }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

