// 한글→영문 변환의 서버 처리(순수 — 키 읽기와 fetch는 주입받는다. 그래서 설치 없이 시험할 수 있다).
// 흐름: 요청 검사 → 고른 모델의 플랫폼 본인 키 → **한 번** 호출 → 응답 전체 검사. 어느 단계든 실패하면 결과를 한 줄도 돌려주지 않는다.
// 서버는 한글 원문·영문 결과를 저장하지 않고 기록(log)에도 남기지 않는다.
import { callModel } from "./llm.ts";
import { CONVERT_MODELS, CONVERT_PROVIDER_ORDER, availableModels, findConvertModel, missingKeyMessage, pickDefaultModel, type ConvertProvider, type KeyStatus } from "./models.ts";
import { ConvertError, buildMessages, parseResponse, validateRequest, type ConvertedItem } from "./protocol.ts";

export type ConvertDeps = {
  /** 이 회원이 등록한 그 플랫폼 키. 없으면 null. **다른 플랫폼·운영자·다른 회원 키를 돌려주면 안 된다** */
  getKey: (provider: ConvertProvider) => Promise<string | null>;
  fetcher?: typeof fetch;
  signal?: AbortSignal;
  now?: () => Date;
};

export async function convertBatch(body: unknown, deps: ConvertDeps): Promise<{ model: string; items: ConvertedItem[] }> {
  const request = validateRequest(body); // 여기서 실패하면 키도 읽지 않는다
  const model = findConvertModel(request.model)!;
  const key = await deps.getKey(model.provider);
  if (typeof key !== "string" || !key.trim()) throw new ConvertError("needKey", missingKeyMessage(model.provider), 400);
  const { system, user } = buildMessages(request.items, (deps.now?.() ?? new Date()).getFullYear());
  const text = await callModel({ model, key: key.trim(), system, user, signal: deps.signal, fetcher: deps.fetcher }); // 한 번만
  return { model: model.id, items: parseResponse(text, request.items) };
}

/** 화면이 변환을 켤 때 보는 상태: 어느 플랫폼 키가 등록돼 있는지(값은 주지 않는다), 기본 모델, 고를 수 있는 모델 */
export function convertStatus(keys: KeyStatus) {
  const clean = Object.fromEntries(CONVERT_PROVIDER_ORDER.map((p) => [p, keys[p] === true])) as KeyStatus;
  return {
    keys: clean,
    defaultModel: pickDefaultModel(clean),
    models: availableModels(clean).map((m) => ({ id: m.id, provider: m.provider, tier: m.tier, label: m.label })),
    allModels: CONVERT_MODELS.length,
  };
}
