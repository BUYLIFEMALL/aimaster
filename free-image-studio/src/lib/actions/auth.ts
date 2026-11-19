"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loginFlow } from "@/lib/loginFlow";

export interface AuthActionState {
  error?: string;
}

export async function signInAction(_prevState: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const supabase = await createClient();
  // 돌아갈 곳 검증은 loginFlow 안의 safeInternalPath 한 곳에서만 한다(같은 출처의 내부 경로만).
  const result = await loginFlow({ email: formData.get("email"), password: formData.get("password"), redirect: formData.get("redirect") }, async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return !!error;
  });
  if ("error" in result) return { error: result.error };
  redirect(result.redirectTo);
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" }); // 이 브라우저만 로그아웃(다른 기기·다른 프로그램은 유지)
  redirect("/login");
}
