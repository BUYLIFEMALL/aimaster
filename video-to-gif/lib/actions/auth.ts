"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const MAIN_SITE_URL = process.env.NEXT_PUBLIC_MAIN_SITE_URL ?? "https://www.buylife.xyz";

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(`${MAIN_SITE_URL}/login`);
}
