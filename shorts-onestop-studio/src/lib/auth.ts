import "server-only";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { platformConfigured } from "@/lib/config";

export async function requireUser() {
  if (!platformConfigured()) redirect("/setup");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const currentPath = (await headers()).get("x-pathname") ?? "/topic";
    redirect(`/login?redirect=${encodeURIComponent(currentPath)}`);
  }

  return user;
}

export async function getUser() {
  if (!platformConfigured()) return null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ?? null;
}
