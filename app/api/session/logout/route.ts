import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export async function POST() {
  const cookieStore = await cookies();
  const token = cookieStore.get("session_token")?.value;

  if (token) {
    const service = createServiceClient();
    await service.from("user_sessions").delete().eq("session_token", token);
    cookieStore.set("session_token", "", { maxAge: 0, path: "/" });
  }

  // Supabase 로그아웃
  const supabase = await createClient();
  await supabase.auth.signOut();

  return NextResponse.json({ success: true });
}
