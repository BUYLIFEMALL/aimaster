// 게시 함수 자동 시험용 모듈 연결 장치(Node 모듈 사용자 지정 훅).
// - 게시 함수(.ts)는 Node 24 내장 TypeScript 형식 제거로 그대로 읽는다.
// - "server-only"·계정 읽기·토큰·플랫폼 호출·키 조회는 가짜(platform.mjs)로 바꿔 끼운다 → 실제 DB·플랫폼에 접속하지 않는다.
const FAKE_PLATFORM = new URL("./platform.mjs", import.meta.url).href;
const EMPTY = new URL("./empty.mjs", import.meta.url).href;
const FAKED = [
  /^@\/lib\/(instagram|threads|youtube|dmApp\/instagram)\/(memberAccount|token|client)$/,
  /^@\/lib\/apiKeys$/,
];

export async function resolve(specifier, context, nextResolve) {
  if (specifier === "server-only") return { url: EMPTY, shortCircuit: true };
  if (FAKED.some((re) => re.test(specifier))) return { url: FAKE_PLATFORM, shortCircuit: true };
  if (specifier.startsWith("@/")) throw new Error(`시험 연결 장치가 모르는 모듈: ${specifier} (게시 함수가 새 모듈을 쓰면 loader.mjs에 가짜를 추가)`);
  return nextResolve(specifier, context);
}

export async function load(url, context, nextLoad) {
  if (url.endsWith(".ts")) return nextLoad(url, { ...context, format: "module-typescript" });
  return nextLoad(url, context);
}
