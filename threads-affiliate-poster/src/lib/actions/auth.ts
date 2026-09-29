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

export interface SignUpActionState extends AuthActionState {
  message?: string;
}

/**
 * Standalone copies take their own sign-ups; in AIMaster mode sign-up happens on the AIMaster site
 * and this action is refused. Access is still decided by requireProgramAccess() afterwards.
 */
export async function signUpAction(
  _prevState: SignUpActionState,
  formData: FormData,
): Promise<SignUpActionState> {
  if (!IS_STANDALONE) return { error: "회원가입은 AIMaster 사이트에서 진행해주세요." };

  const parsed = authSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요." };
  }
  if (formData.get("agree") !== "on") {
    return { error: "이용약관과 개인정보처리방침에 동의해주세요." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { name: String(formData.get("name") ?? "").trim() },
      emailRedirectTo: SITE_URL ? `${SITE_URL}/auth/callback` : undefined,
    },
  });
  if (error) {
    return { error: "회원가입에 실패했습니다. 이미 가입된 이메일인지 확인해주세요." };
  }

  // With "Confirm email" off in Supabase the session starts right away.
  if (data.session) redirect("/dashboard");
  return { message: "가입 확인 메일을 보냈습니다. 메일의 링크를 누른 뒤 로그인해주세요." };
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
