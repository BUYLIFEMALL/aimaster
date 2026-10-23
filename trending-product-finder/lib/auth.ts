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
    // 딥링크로 바로 들어왔다면 로그인 후 그 페이지로 바로 이어지도록, middleware.ts가
    // 실어준 현재 경로를 /login의 ?redirect=로 넘긴다.
    const currentPath = (await headers()).get("x-pathname") ?? "/";
    redirect(`/login?redirect=${encodeURIComponent(currentPath)}`);
  }

  return user;
}
