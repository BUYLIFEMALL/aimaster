"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { authSchema } from "@/lib/validation";
import { IS_STANDALONE, SITE_URL } from "@/lib/deployment";

export interface AuthActionState {
  error?: string;
}

/** "/"로 시작하는 내부 경로만 허용해서, 조작된 redirect 값으로 외부 사이트로 보내지는 것을 막는다. */
function sanitizeRedirect(path: string | null): string {
  if (!path || !path.startsWith("/") || path.startsWith("//")) return "/dashboard";
  return path;
}

export async function signInAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = authSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return { error: "이메일 또는 비밀번호가 올바르지 않습니다." };
  }

  redirect(sanitizeRedirect(String(formData.get("redirect") ?? "")));
}

/**
 * 독립 운영 모드(강의용 설치 키트, 2026-10-18) 전용 회원가입. AIMaster 운영에서는 가입을 메인 사이트가 받으므로 막는다.
 * Supabase에서 Confirm email이 꺼져 있으면 바로 로그인돼 이동하고, 켜져 있으면 확인 메일 안내를 돌려준다.
 */
export async function signUpAction(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState & { notice?: string }> {
  if (!IS_STANDALONE) return { error: "회원가입은 AIMaster에서 진행됩니다." };
  const parsed = authSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요." };
  }
  const supabase = await createClient();
  // 확인 메일 링크가 Supabase 기본 Site URL(localhost)이 아니라 내 사이트로 돌아오게(2026-10-20). Supabase URL Configuration에도 이 주소를 허용해야 한다(마법사 마무리 단계).
  const emailRedirectTo = SITE_URL ? `${SITE_URL}/api/auth/confirm` : undefined;
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: emailRedirectTo ? { emailRedirectTo } : undefined,
  });
  if (error) {
    return { error: /already registered/i.test(error.message) ? "이미 가입된 이메일입니다. 로그인해 주세요." : `가입하지 못했습니다: ${error.message}` };
  }
  if (!data.session) {
    return { notice: "가입 확인 메일을 보냈습니다. 메일의 링크를 누른 뒤 로그인해 주세요. (설치자는 Supabase에서 Confirm email을 끄면 바로 로그인됩니다)" };
  }
  redirect(sanitizeRedirect(String(formData.get("redirect") ?? "")));
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
