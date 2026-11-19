// 로그인 쿠키 갱신 처리의 본체. next·supabase를 직접 불러오지 않고 받아 쓰므로 설치 없이 시험한다(실제 연결은 src/proxy.ts).
type CookieToSet = { name: string; value: string; options?: Record<string, unknown> };

export type ProxyRequest = {
  headers: Headers;
  nextUrl: { pathname: string; search: string };
  cookies: { getAll(): { name: string; value: string }[]; set(name: string, value: string): unknown };
};
export type ProxyResponse = {
  headers: Headers;
  cookies: { set(name: string, value: string, options?: Record<string, unknown>): unknown };
};
export type ProxyDeps<Res extends ProxyResponse> = {
  /** 다음 단계로 넘길 요청 헤더로 응답을 만든다(NextResponse.next({ request: { headers } })). */
  next(headers: Headers): Res;
  /** Supabase 서버 클라이언트를 만들어 세션을 확인·갱신한다(auth.getUser()). */
  refresh(cookies: { getAll(): { name: string; value: string }[]; setAll(values: CookieToSet[], cacheHeaders?: Record<string, string>): void }): Promise<void>;
  /** 쿠키 도메인(buylife.xyz 계열이면 .buylife.xyz, 아니면 없음) */
  cookieDomain?: string;
};

export async function sessionProxy<Res extends ProxyResponse>(request: ProxyRequest, deps: ProxyDeps<Res>): Promise<Res> {
  /** 지금 요청의 헤더(갱신된 쿠키 포함)에 현재 경로를 덧붙여 다음 단계로 넘길 헤더를 만든다. 밖에서 보낸 x-pathname은 덮어쓴다. */
  const forwardHeaders = () => {
    const headers = new Headers(request.headers);
    headers.set("x-pathname", request.nextUrl.pathname + request.nextUrl.search);
    return headers;
  };
  let pending: CookieToSet[] = [];
  let cache: Record<string, string> = {};

  await deps.refresh({
    getAll: () => request.cookies.getAll(),
    setAll: (values, cacheHeaders) => {
      // 같은 요청의 다음 단계(레이아웃의 getUser)가 새 쿠키를 읽도록 요청 쪽을 먼저 고친다.
      values.forEach(({ name, value }) => request.cookies.set(name, value));
      pending = [...pending.filter((p) => !values.some((v) => v.name === p.name)), ...values];
      cache = { ...cache, ...(cacheHeaders ?? {}) };
    },
  });

  // 쿠키 갱신이 끝난 뒤의 요청 헤더로 응답을 한 번만 만든다(예전 쿠키가 담긴 헤더 사본을 넘기지 않는다).
  const response = deps.next(forwardHeaders());
  if (pending.length) {
    pending.forEach(({ name, value, options }) => response.cookies.set(name, value, deps.cookieDomain ? { ...options, domain: deps.cookieDomain } : options));
    // 세션 쿠키를 싣는 응답은 공유 캐시에 남으면 안 된다. Supabase가 준 캐시 헤더를 적용하고, 없으면 보수적으로 막는다.
    Object.entries(cache).forEach(([k, v]) => response.headers.set(k, v));
    const cc = response.headers.get("cache-control") ?? "";
    if (!/\bno-store\b/i.test(cc) || !/\bprivate\b/i.test(cc)) response.headers.set("Cache-Control", "private, no-cache, no-store, must-revalidate, max-age=0");
  }
  return response;
}
