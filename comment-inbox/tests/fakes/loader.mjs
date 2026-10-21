// 자동 시험용 모듈 연결 장치(Node 모듈 사용자 지정 훅).
// - 시험 대상 .ts(게시 함수·받은편지함 서버 동작·데이터 읽기)는 Node 24 내장 TypeScript 형식 제거로 그대로 읽는다.
// - "server-only"·계정 읽기·토큰·플랫폼 호출·키 조회는 가짜(platform.mjs),
//   로그인·권한·DB·Next 기능(next/cache, react cache)은 가짜(app.mjs)로 바꿔 끼운다 → 실제 DB·플랫폼에 접속하지 않는다.
const ROOT = new URL("../../", import.meta.url).href; // comment-inbox/
const FAKE_PLATFORM = new URL("./platform.mjs", import.meta.url).href;
const FAKE_APP = new URL("./app.mjs", import.meta.url).href;
const EMPTY = new URL("./empty.mjs", import.meta.url).href;
const PLATFORM_FAKED = [
  /^@\/lib\/(instagram|threads|youtube|dmApp\/instagram)\/(memberAccount|token|client)$/,
  /^@\/lib\/apiKeys$/,
];
const APP_FAKED = new Set(["next/cache", "@/lib/access", "@/lib/supabase/server", "@/lib/supabase/admin", "@/lib/programAccess"]);
// 진짜 코드로 읽는 "@/" 모듈(시험 대상)
const REAL = [/^@\/lib\/comments\/(instagram|threads|youtube)Post$/, /^@\/lib\/dmApp\/dm\/post$/, /^@\/lib\/inbox\/load$/, /^@\/lib\/weekChart\/bucket$/];

export async function resolve(specifier, context, nextResolve) {
  if (specifier === "server-only") return { url: EMPTY, shortCircuit: true };
  if (specifier === "react" && context.parentURL?.includes("/lib/inbox/load.ts")) return { url: FAKE_APP, shortCircuit: true };
  if (APP_FAKED.has(specifier)) return { url: FAKE_APP, shortCircuit: true };
  if (PLATFORM_FAKED.some((re) => re.test(specifier))) return { url: FAKE_PLATFORM, shortCircuit: true };
  if (REAL.some((re) => re.test(specifier))) return { url: `${ROOT}${specifier.slice(2)}.ts`, shortCircuit: true };
  if (specifier.startsWith("@/")) throw new Error(`시험 연결 장치가 모르는 모듈: ${specifier} (시험 대상이 새 모듈을 쓰면 loader.mjs에 가짜를 추가)`);
  return nextResolve(specifier, context);
}

export async function load(url, context, nextLoad) {
  if (url.endsWith(".ts")) return nextLoad(url, { ...context, format: "module-typescript" });
  return nextLoad(url, context);
}
