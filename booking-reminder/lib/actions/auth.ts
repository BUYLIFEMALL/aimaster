"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export interface AuthActionState {
  error?: string;
}

/** "/"로 시작하는 내부 경로만 허용해서, 조작된 redirect 값으로 외부 사이트로 보내지는 것을 막는다. */
function sanitizeRedirect(path: string | null): string {
  if (!path || !path.startsWith("/") || path.startsWith("//")) return "/";
  return path;
}

// 이 프로젝트는 React 18(useFormState/useActionState 미탑재 버전)이라, prevState를
// 받는 useActionState 패턴 대신 클라이언트에서 직접 호출하는 단순한 형태로 둔다
// (app/(auth)/login/page.tsx 참고).
export async function signInAction(formData: FormData): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "이메일과 비밀번호를 입력해주세요." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "이메일 또는 비밀번호가 올바르지 않습니다." };
  }

  redirect(sanitizeRedirect(String(formData.get("redirect") ?? "")));
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
