import "server-only";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const mainSiteUrl = process.env.NEXT_PUBLIC_MAIN_SITE_URL ?? "https://buylife.xyz";
    const headerStore = await headers();
    const currentHost = headerStore.get("x-forwarded-host") ?? headerStore.get("host") ?? "ghost-scraper.buylife.xyz";
    const redirectUrl = `https://${currentHost}`;
    redirect(`${mainSiteUrl}/login?redirect=${encodeURIComponent(redirectUrl)}`);
  }

  return user;
}

export async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ?? null;
}
