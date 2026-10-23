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
    // proxy.ts가 대부분의 경로를 이미 막아주지만("/" 등 일부는 예외), 이 백스톱도
    // 동일하게 딥링크 복귀를 지원하도록 proxy.ts가 실어준 현재 경로를 ?redirect=로 넘긴다.
    const currentPath = (await headers()).get("x-pathname") ?? "/candidates";
    redirect(`/login?redirect=${encodeURIComponent(currentPath)}`);
  }

  return user;
}
