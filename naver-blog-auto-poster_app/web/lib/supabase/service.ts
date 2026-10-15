import { createClient } from "@supabase/supabase-js";

/**
 * 서비스 롤 클라이언트 (RLS 우회)
 * 웹훅, 서버 사이드 관리 작업에만 사용
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, {
    // Next.js가 Server Component 안의 fetch 호출을 라우트 설정과 무관하게 캐시하는
    // 경우가 있어(회원 목록이 삭제 후에도 예전 데이터로 보이던 버그의 원인), 이 클라이
    // 언트가 만드는 모든 요청에 명시적으로 no-store를 강제한다.
    global: {
      fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
    },
  });
}
