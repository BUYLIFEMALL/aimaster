// 연결 문 보안 — 우리 사이트에서 온 요청만 받고, 짝짓기로 받은 토큰이 있어야 생성을 맡긴다.
import { randomBytes, randomInt, randomUUID, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

// 엔진 0.8.1(D-3, 2026-11-09 주인님 「1안으로 진행해」): 이미지 자동화도 같은 엔진의 내 PC 그림을 쓴다 — 그림 주소만(imageSiteAllows)
export const IMAGE_SITE = "https://ai-image-studio.buylife.xyz";
export const SITE_ORIGINS = ["https://free-music-studio.buylife.xyz", IMAGE_SITE];
// IMG-P1 PR-A(2026-11-19): 새 그림 사이트 범위(토큰·대기열·결과를 기존과 나눠 저장)의 출처. 운영 등록은 PR-B에서 —
// 지금은 비워 두고 시험에서만 연결 문에 출처를 넣어 확인한다(새 출처를 단독으로 먼저 열지 않는다).
export const SCOPED_SITE_ORIGINS = Object.freeze([]);

const ART = /^\/image-art\/[0-9a-f-]{36}$/;
const CANCEL = /^\/queue\/[0-9a-f-]{36}\/cancel$/;
const JOB = /^\/queue\/[0-9a-f-]{36}$/;
const DEFAULT = /^\/image-models\/[A-Za-z0-9_.:-]{1,80}\/default$/;
/** 이미지 자동화에서 온 요청이 쓸 수 있는 주소 — 그림 판 목록·기본 판, 대기열(그림 작업만, 접수에서 한 번 더 확인), 그린 그림 받기, 취소·지우기 */
export function imageSiteAllows(method, pathname) {
  if (method === "GET") return pathname === "/image-models" || pathname === "/queue" || ART.test(pathname);
  if (method === "POST") return pathname === "/queue" || DEFAULT.test(pathname) || CANCEL.test(pathname);
  if (method === "DELETE") return JOB.test(pathname);
  return false;
}
// 개발 중 내 PC에서 띄운 웹(next dev)도 허용
const DEV_ORIGIN = /^http:\/\/(localhost|127\.0\.0\.1):\d{2,5}$/;

/** extra: 새 그림 사이트 범위 출처(연결 문이 넘김) — 기존 두 사이트·개발 주소 판정은 그대로 */
export function isAllowedOrigin(origin, extra = SCOPED_SITE_ORIGINS) {
  if (!origin) return false;
  return SITE_ORIGINS.includes(origin) || DEV_ORIGIN.test(origin) || extra.includes(origin);
}

export function corsHeaders(origin, extra = SCOPED_SITE_ORIGINS) {
  if (!isAllowedOrigin(origin, extra)) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type, Range, X-Offset",
    "Access-Control-Max-Age": "600",
    "Access-Control-Expose-Headers": "x-audio-format, content-range, accept-ranges",
    Vary: "Origin",
  };
}

/** 엔진 창에 보여 줄 6자리 짝짓기 코드 */
export const newPairCode = () => String(randomInt(0, 1_000_000)).padStart(6, "0");

export const newToken = () => randomBytes(32).toString("hex");

export function sameSecret(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** `Authorization: Bearer <토큰>`에서 토큰만 꺼낸다 */
export function bearer(header) {
  const m = /^Bearer\s+(\S+)$/i.exec(header ?? "");
  return m ? m[1] : null;
}

/**
 * 새 그림 사이트 범위 토큰(IMG-P1 PR-A) — 기존 paired.json과 따로 둔 파일(paired-scoped.json)에만 저장.
 * 토큰마다 발급 출처(origin)와 범위 번호(scope)를 적고, 발급 출처에서만 통한다. 이전 엔진은 이 파일을 읽지 않는다.
 * 파일이 있는데 읽지 못하면 닫힌다(broken): 어떤 토큰도 통하지 않고 새로 발급하지 않으며 원본을 덮어쓰지 않는다.
 */
export function createScopedTokens({ file, readFileImpl = readFile, writeFileImpl = writeFile, renameImpl = rename, mkdirImpl = mkdir } = {}) {
  let entries = [];
  let broken = "";
  let saving = Promise.resolve();
  const saveNow = async (list) => {
    await mkdirImpl(path.dirname(file), { recursive: true });
    const tmp = `${file}.tmp`;
    await writeFileImpl(tmp, JSON.stringify({ version: 1, tokens: list }, null, 2));
    await renameImpl(tmp, file); // 새 토큰 기록과 이전 토큰 폐기를 한 번에(이름 바꾸기 한 번)
  };
  const find = (token, origin) => (typeof token === "string" && origin ? entries.find((e) => e.origin === origin && sameSecret(e.token, token)) ?? null : null);
  return {
    async load() {
      let text = null;
      try {
        text = await readFileImpl(file, "utf8");
      } catch (e) {
        if (e?.code !== "ENOENT") broken = "읽기 실패";
      }
      if (broken || text == null) return;
      try {
        const data = JSON.parse(text);
        if (!Array.isArray(data?.tokens) || !data.tokens.every((t) => t && typeof t.token === "string" && typeof t.origin === "string" && typeof t.scope === "string")) throw new Error("형식");
        entries = data.tokens;
      } catch {
        entries = [];
        broken = "내용이 올바르지 않음";
      }
    },
    get broken() {
      return broken;
    },
    /** 이 출처에서 쓴 토큰의 범위 번호, 없거나 닫혔으면 null */
    scopeOf(token, origin) {
      if (broken) return null;
      return find(token, origin)?.scope ?? null;
    },
    get size() {
      return broken ? 0 : entries.length;
    },
    /**
     * 짝짓기로 새 토큰 발급(코드 확인은 부르는 쪽). prevToken이 같은 출처의 유효한 토큰이면 그 범위를 이어받고 이전 토큰은 폐기,
     * 아니면 새 범위. 닫혔으면 예외.
     */
    async issue({ origin, prevToken } = {}) {
      if (broken) throw Object.assign(new Error(`연결 기록 파일을 읽지 못해 새 연결을 만들 수 없습니다(${broken}). 파일은 그대로 두었습니다.`), { status: 503 });
      // 이전 토큰 찾기·목록 계산·저장을 한 줄로 세워(동시 짝짓기가 서로의 결과를 덮어쓰지 않게) 차례로 한다
      const run = saving.catch(() => {}).then(async () => {
        const prev = prevToken ? find(prevToken, origin) : null;
        const scope = prev ? prev.scope : randomUUID();
        const entry = { token: newToken(), origin, scope, createdAt: new Date().toISOString() };
        const next = [...entries.filter((e) => e !== prev), entry];
        await saveNow(next);
        entries = next;
        return { token: entry.token, scope, inherited: !!prev };
      });
      saving = run;
      return run;
    },
  };
}
