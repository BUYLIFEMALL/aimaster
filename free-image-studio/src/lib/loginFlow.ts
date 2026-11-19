// 로그인 처리의 판단 부분. 서버 전용 모듈에 기대지 않아 시험에서 직접 부른다(실제 연결은 actions/auth.ts).
// 로그인 뒤 돌아갈 곳 검증 — 이 프로그램 안의 경로만 허용한다. 로그인 액션과 시험이 이 함수 하나를 쓴다.
const BASE = "https://same-origin.invalid";

/** 「/」로 시작하는 같은 출처 경로면 정규화한 경로를, 조금이라도 모호하면 「/」를 돌려준다. */
export function safeInternalPath(path: unknown): string {
  if (typeof path !== "string" || path.length > 2048) return "/";
  // 역슬래시·제어 문자·공백 문자는 브라우저가 주소를 다르게 읽을 수 있어 통째로 거절한다.
  if (!path.startsWith("/") || path.startsWith("//") || /[\\\u0000- \u007f]/.test(path)) return "/";
  try {
    const url = new URL(path, BASE);
    if (url.origin !== BASE || url.username || url.password) return "/";
    const out = url.pathname + url.search + url.hash;
    // 정규화하면 「/..//바깥」이 「//바깥」이 되어 다른 출처로 읽힌다. 정규화한 결과도 같은 출처인지 다시 본다.
    if (out.startsWith("//") || new URL(out, BASE).origin !== BASE) return "/";
    return out;
  } catch {
    return "/";
  }
}

export type LoginResult = { error: string } | { redirectTo: string };

/** signIn: 이메일·비밀번호로 로그인해 실패면 true를 돌려주는 함수(Supabase 호출을 감싼 것). */
export async function loginFlow(form: { email: unknown; password: unknown; redirect: unknown }, signIn: (email: string, password: string) => Promise<boolean>): Promise<LoginResult> {
  const email = typeof form.email === "string" ? form.email.trim() : "";
  const password = typeof form.password === "string" ? form.password : "";
  if (!email || !password) return { error: "이메일과 비밀번호를 모두 입력해주세요." };
  if (await signIn(email, password)) return { error: "이메일 또는 비밀번호가 올바르지 않습니다." };
  return { redirectTo: safeInternalPath(form.redirect) };
}
