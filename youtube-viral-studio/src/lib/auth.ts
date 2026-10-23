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
    const currentPath = (await headers()).get("x-pathname") ?? "/viral-shorts";
    redirect(`/login?redirect=${encodeURIComponent(currentPath)}`);
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
