import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" });
  const mainSiteUrl = process.env.NEXT_PUBLIC_MAIN_SITE_URL ?? "https://buylife.xyz";
  return NextResponse.redirect(`${mainSiteUrl}/login`);
}
