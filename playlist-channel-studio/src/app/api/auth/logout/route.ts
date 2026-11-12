import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" }); // 이 브라우저만(2026-11-13 로그인 정책)
  const mainSiteUrl = process.env.NEXT_PUBLIC_MAIN_SITE_URL ?? "https://buylife.xyz";
  return NextResponse.redirect(`${mainSiteUrl}/login`);
}
