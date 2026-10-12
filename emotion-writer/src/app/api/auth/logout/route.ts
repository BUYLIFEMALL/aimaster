import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function POST() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  const mainSiteUrl =
    process.env.NEXT_PUBLIC_MAIN_SITE_URL ?? "https://www.buylife.xyz";
  return NextResponse.redirect(`${mainSiteUrl}/login`, 303);
}
