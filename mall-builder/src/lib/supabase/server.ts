import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";
import { cookieDomainForHost } from "./cookieDomain";
import { SUPABASE_KEY, SUPABASE_URL } from "./env";

export async function createClient() {
  const cookieStore = await cookies();
  const domain = cookieDomainForHost((await headers()).get("host")); // 운영 *.buylife.xyz만 메인과 쿠키 공유
  return createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    ...(domain ? { cookieOptions: { domain } } : {}),
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // 서버 컴포넌트에서는 쿠키를 쓸 수 없다 — 브라우저 클라이언트가 세션을 갱신한다.
        }
      },
    },
  });
}
