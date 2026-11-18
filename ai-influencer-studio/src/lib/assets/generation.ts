// 이미지 생성 요청 조정 계층 — 권한·키 확인 → 요청 검증 → (shadow일 때만) 용량 사전 검사 → 생성 → (shadow일 때만) 원본 저장.
// W01-A1 (2026-11-18, CC-SNS-01, Master msg_d61d73a0ed2a). 계약: docs/analysis-ai-influencer-20261118/W00_BASELINE.md §18-R1.
// 경로 별칭·Next 모듈을 쓰지 않는다(시험이 직접 불러온다). 실제 의존성은 라우트가 넘긴다.
//
// ★ 원본 저장 모드는 서버 코드 상수다. 기본 "off". 환경변수·요청 본문·머리글로 켤 수 없다.
//   "shadow"로 바꾸는 것은 DB migration·버킷 운영 적용과 함께 별도 승인 뒤의 코드 변경이다.
export type AssetsMode = "off" | "shadow";
export const AIF_ASSETS_MODE: AssetsMode = "off";

// 시간 예산: 라우트 한도 300초, 생성 호출 제한 240초(src/lib/gemini.ts). 남는 시간 안에 끝나도록 사전 검사·저장에 상한을 둔다.
// 상한을 넘기면 사전 검사는 「확인 불가」, 저장은 「불명」으로 처리하고 생성 결과는 그대로 돌려준다(저장 요청을 다시 보내지 않는다).
export const PRECHECK_TIMEOUT_MS = 10_000;
export const SAVE_TIMEOUT_MS = 20_000;

// 응답 크기 보호(W01x, 2026-11-18, 설계 W00_BASELINE §21). 플랫폼의 함수 응답 본문 한도(공식 문서 「4.5 MB」, 단위·바이트 수 미기재)보다
// 작게 잡은 우리 쪽 상한이다. 성공 응답을 JSON으로 직렬화한 UTF-8 바이트가 이 값을 넘으면 이미지를 싣지 않은 작은 응답으로 바꾼다.
//   * 넘지 않으면 본문은 예전과 바이트 단위로 같다(같은 객체를 그대로 돌려준다).
//   * 이것은 우리가 먼저 끊는 것일 뿐이다. 플랫폼이 실제로 어느 크기에서 무엇을 돌려주는지는 확인하지 못했다.
//   * 생성은 이미 끝났다. 공급자가 실제로 과금했는지는 여기서 확인하지 않으므로 문구는 「사용량이 차감됐을 수 있습니다」까지만 말한다. 다시 생성하지 않는다.
//   * 상태는 422다(Master msg_658ce1003e6f 정정). 처음에는 200에 imageOmitted만 실었는데, 배포 직후 옛 화면 코드가 남은 탭은 200이면
//     이미지가 없어도 캡션 호출·결과 표시로 넘어갔다. 옛 코드는 200이 아니면 본문의 error 문구를 보여 주고 멈추므로, 422 + 고정 한국어 error로 바꿨다.
//     새 화면은 imageOmitted + code 조합을 보고 「생성 실패」와 구분해 처리한다(src/lib/assets/generateResponse.ts).
export const RESPONSE_MAX_BYTES = 4_000_000;
export const RESPONSE_TOO_LARGE_CODE = "RESPONSE_TOO_LARGE";
export const RESPONSE_TOO_LARGE_STATUS = 422;
export const RESPONSE_TOO_LARGE_MESSAGE =
  "이미지는 생성됐지만 파일이 너무 커서 지금 화면으로 전달할 수 없습니다. 생성은 이미 진행됐으며, 사용량이 차감됐을 수 있습니다. 같은 설정으로 다시 생성하면 같은 일이 생길 수 있습니다.";

import { handleGenerateImageRequest } from "../referenceImage";
import { decodeGeneratedDataUrl, precheckGenerated, saveGeneratedOriginal, type AssetStoreDeps, type SaveResult } from "./store";

export type AccessResult = { allowed: true; user: { id: string } } | { allowed: false; error: string; status: number };
export type GenerateImagePostDeps = {
  mode: AssetsMode;
  checkAccess: () => Promise<AccessResult>;
  getApiKey: (userId: string) => Promise<string | null>;
  generate: (apiKey: string, config: Record<string, unknown>) => Promise<string>;
  /** shadow일 때만 불린다(off에서는 호출 0 → 관리자 클라이언트·저장소·RPC 생성 0) */
  getAssetDeps?: () => AssetStoreDeps;
  timeouts?: { precheckMs?: number; saveMs?: number };
};
export type HandlerResult = { status: number; body: Record<string, unknown> };

export const NEED_KEY_MESSAGE = "Google Gemini API 키가 등록되어 있지 않습니다. 우측 상단 'API 키 설정'에서 본인 키를 등록해주세요.";
const STORAGE_FULL_MESSAGE = "저장공간이 부족해 이미지를 생성하지 않았습니다. 저장공간을 정리하거나 용량을 늘린 뒤 다시 시도해 주세요.";
const PRECHECK_UNAVAILABLE_MESSAGE = "저장공간을 확인하지 못해 이미지를 생성하지 않았습니다. 잠시 뒤 다시 시도해 주세요.";

class PrecheckStop extends Error {
  code = "PRECHECK_STOP";
}

function withTimeout<T>(p: Promise<T>, ms: number, onTimeout: () => T): Promise<T> {
  return new Promise<T>((resolve) => {
    let done = false;
    const timer = setTimeout(() => { if (!done) { done = true; resolve(onTimeout()); } }, ms);
    p.then(
      (v) => { if (!done) { done = true; clearTimeout(timer); resolve(v); } },
      () => { if (!done) { done = true; clearTimeout(timer); resolve(onTimeout()); } },
    );
  });
}

/** 성공 응답이 상한을 넘으면 이미지를 뺀 작은 422 응답으로 바꾼다. 원본 저장 결과(assetSaved·assetId·assetCode)는 받은 뜻 그대로 옮긴다. */
export function limitResponseBody(r: HandlerResult): HandlerResult {
  if (r.status !== 200) return r;
  if (new TextEncoder().encode(JSON.stringify(r.body)).length <= RESPONSE_MAX_BYTES) return r;
  const b = r.body;
  const small: Record<string, unknown> = { error: RESPONSE_TOO_LARGE_MESSAGE, imageOmitted: true, code: RESPONSE_TOO_LARGE_CODE };
  // 값의 모양이 정해진 것만 옮긴다(큰 값이 다시 실리지 않게)
  if (b.assetSaved === true || b.assetSaved === false || b.assetSaved === "unknown") small.assetSaved = b.assetSaved;
  for (const k of ["assetId", "assetCode"] as const) {
    const v = b[k];
    if (typeof v === "string" && v.length > 0 && v.length <= 64) small[k] = v;
  }
  return { status: RESPONSE_TOO_LARGE_STATUS, body: small };
}

/** POST /api/generate-image 처리. 라우트는 이 결과를 그대로 JSON으로 돌려준다. */
export async function handleGenerateImagePost(req: Request, deps: GenerateImagePostDeps): Promise<HandlerResult> {
  const auth = await deps.checkAccess();
  if (!auth.allowed) return { status: auth.status, body: { error: auth.error } };
  const userId = auth.user.id;

  const apiKey = await deps.getApiKey(userId);
  if (!apiKey) return { status: 400, body: { error: NEED_KEY_MESSAGE, needApiKey: true } };

  // off: 예전과 완전히 같은 경로(요청 검증 → 생성 1회 → 응답). 자산 의존성은 만들지도 부르지도 않는다.
  if (deps.mode !== "shadow") return limitResponseBody(await handleGenerateImageRequest(req, (config) => deps.generate(apiKey, config)));

  // shadow
  let stop: HandlerResult | null = null;
  let save: SaveResult | null = null;
  const result = await handleGenerateImageRequest(req, async (config) => {
    // 요청 검증을 통과한 뒤, 유료 생성 전에 용량 사전 검사.
    // fail-closed: 확인 불가(unavailable — DB 함수 없음·오류·시간 초과·의존성 생성 실패)면 생성하지 않는다.
    //   이유: shadow는 「생성하면 원본을 저장한다」는 모드라, 저장 가능 여부를 모르는 채 과금되는 생성을 시작하지 않는다.
    let assetDeps: AssetStoreDeps | null = null;
    try {
      assetDeps = deps.getAssetDeps ? deps.getAssetDeps() : null;
    } catch {
      assetDeps = null;
    }
    const pre = assetDeps
      ? await withTimeout(precheckGenerated(assetDeps, userId, config.quality), deps.timeouts?.precheckMs ?? PRECHECK_TIMEOUT_MS, () => ({ status: "unavailable" as const }))
      : { status: "unavailable" as const };
    if (pre.status === "denied") { stop = { status: 507, body: { error: STORAGE_FULL_MESSAGE, code: "STORAGE_LIMIT" } }; throw new PrecheckStop(); }
    if (pre.status !== "allowed" || !assetDeps) { stop = { status: 503, body: { error: PRECHECK_UNAVAILABLE_MESSAGE, code: "ASSET_PRECHECK_UNAVAILABLE" } }; throw new PrecheckStop(); }

    const imageUrl = await deps.generate(apiKey, config);   // 유료 생성 — 정확히 1회

    // 생성 뒤 원본 저장. 어떤 결과든 생성 결과는 그대로 돌려준다(재생성·재저장 없음).
    const storeDeps = assetDeps;
    save = await withTimeout(
      (async (): Promise<SaveResult> => {
        const bytes = decodeGeneratedDataUrl(imageUrl);
        if (!bytes) return { assetSaved: false, code: "ASSET_FORMAT" };
        return saveGeneratedOriginal(storeDeps, { userId, bytes });
      })(),
      deps.timeouts?.saveMs ?? SAVE_TIMEOUT_MS,
      () => ({ assetSaved: false, code: "SAVE_TIMEOUT" }) as unknown as SaveResult,
    );
    return imageUrl;
  });

  if (stop) return stop;
  if (result.status !== 200 || !save) return limitResponseBody(result);
  const s = save as SaveResult;
  // 저장 시간 초과는 어디까지 진행됐는지 모르므로 「불명」으로 알린다
  const timedOut = (s as { code?: string }).code === "SAVE_TIMEOUT";
  return limitResponseBody({
    status: 200,
    body: {
      ...result.body,
      assetSaved: timedOut ? "unknown" : s.assetSaved,
      ...("assetId" in s && s.assetId ? { assetId: s.assetId } : {}),
      ...("code" in s && s.code ? { assetCode: s.code } : {}),
    },
  });
}
