// 서버에서만 호출한다. 공개 UI는 config.ts만 참조하며, 키는 요청 인자로만 받고 저장/출력하지 않는다.
import { CompatibleChatError, endpointFor } from "./config";

export type CompatibleMessage = { role: "system" | "user" | "assistant"; content: string };
type Options = {
  provider: unknown; model: unknown; apiKey: string; accountId?: string;
  messages: CompatibleMessage[]; temperature?: number; maxTokens?: number;
  signal?: AbortSignal; timeoutMs?: number; onDelta?: (piece: string) => void;
};

function httpError(status: number) {
  if (status === 401 || status === 403) return new CompatibleChatError("선택한 AI의 본인 키·사용 권한을 확인해 주세요. [API키등록·플랫폼연동]에서 변경할 수 있습니다.", status, true);
  if (status === 402) return new CompatibleChatError("선택한 AI 계정의 크레딧을 확인해 주세요. 다른 키나 유료 모델로 자동 전환하지 않았습니다.", 402);
  if (status === 429) return new CompatibleChatError("선택한 AI의 요청/사용 한도에 도달했습니다. 공급자 콘솔에서 잔여량을 확인한 뒤 다시 시도해 주세요.", 429);
  return new CompatibleChatError(`선택한 AI 요청이 실패했습니다(${status}). 모델 지원과 공급자 상태를 확인해 주세요.`, status >= 500 ? 502 : 400);
}

/** 한 번 호출 또는 SSE. 자동 재시도·다른 모델/키 폴백은 하지 않는다. */
export async function compatibleChat(options: Options, fetcher: typeof fetch = fetch): Promise<{ text: string; model: string }> {
  const selected = endpointFor(options.provider, options.model, options.accountId);
  if (!options.apiKey?.trim()) throw new CompatibleChatError("선택한 AI의 본인 API 키를 등록해 주세요.", 400, true);
  const maxTokens = options.maxTokens ?? 2048;
  if (!Number.isInteger(maxTokens) || maxTokens < 1 || maxTokens > 8192) throw new CompatibleChatError("최대 출력 길이가 올바르지 않습니다.");
  const temperature = options.temperature ?? 0.3;
  if (!Number.isFinite(temperature) || temperature < 0 || temperature > 1) throw new CompatibleChatError("온도는 0~1 사이로 선택해 주세요.");
  const controller = new AbortController();
  const abort = () => controller.abort(options.signal?.reason);
  options.signal?.addEventListener("abort", abort, { once: true });
  if (options.signal?.aborted) abort();
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; controller.abort(); }, options.timeoutMs ?? 60_000);
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  try {
    const response = await fetcher(selected.url, {
      method: "POST",
      headers: { Authorization: `Bearer ${options.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: selected.model, messages: options.messages, temperature, stream: !!options.onDelta,
        ...(selected.provider === "groq" ? { max_completion_tokens: maxTokens } : { max_tokens: maxTokens }),
      }),
      signal: controller.signal,
    });
    if (!response.ok) throw httpError(response.status);
    let text = "";
    let model = selected.model;
    let finished = false;
    const accept = (data: { error?: unknown; model?: unknown; choices?: { finish_reason?: unknown; delta?: { content?: unknown }; message?: { content?: unknown } }[] }) => {
      if (data.error) throw new CompatibleChatError("AI 응답을 받는 중 오류가 발생했습니다. 자동으로 다시 요청하지 않았습니다.", 502);
      if (data.choices?.[0]?.finish_reason === "length") throw new CompatibleChatError("AI 출력 길이 한도에 도달해 답변이 잘렸습니다. 질문을 줄여 다시 시도해 주세요.", 502);
      if (data.choices?.[0]?.finish_reason === "content_filter") throw new CompatibleChatError("선택한 AI의 콘텐츠 필터로 답변이 중단되었습니다.", 502);
      if (data.choices?.[0]?.finish_reason === "stop") finished = true;
      if (typeof data.model === "string") model = data.model;
      const piece = options.onDelta ? data.choices?.[0]?.delta?.content : data.choices?.[0]?.message?.content;
      if (typeof piece === "string" && piece) { text += piece; options.onDelta?.(piece); }
    };
    if (!options.onDelta) accept(await response.json());
    else {
      if (!response.body) throw new CompatibleChatError("AI가 응답 스트림을 보내지 않았습니다.", 502);
      reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let dataLines: string[] = [];
      let doneEvent = false;
      const event = () => {
        if (!dataLines.length) return;
        const payload = dataLines.join("\n"); dataLines = [];
        if (payload.trim() === "[DONE]") { doneEvent = true; return; }
        try { accept(JSON.parse(payload)); }
        catch (error) {
          if (error instanceof CompatibleChatError) throw error;
          throw new CompatibleChatError("AI 응답 형식을 읽지 못했습니다. 자동으로 다시 요청하지 않았습니다.", 502);
        }
      };
      const line = (value: string) => {
        const current = value.endsWith("\r") ? value.slice(0, -1) : value;
        if (current === "") event();
        else if (current.startsWith("data:")) dataLines.push(current.slice(5).trimStart());
      };
      while (!doneEvent) {
        const next = await reader.read();
        buffer += decoder.decode(next.value, { stream: !next.done });
        if (buffer.length > 1_000_000) throw new CompatibleChatError("AI 응답 조각이 너무 커서 중단했습니다.", 502);
        let boundary: number;
        while (!doneEvent && (boundary = buffer.indexOf("\n")) >= 0) {
          line(buffer.slice(0, boundary)); buffer = buffer.slice(boundary + 1);
        }
        if (next.done) { if (buffer && !doneEvent) line(buffer); event(); break; }
      }
      if (!doneEvent && !finished) throw new CompatibleChatError("AI 응답이 완료되기 전에 연결이 끊겼습니다. 중단한 답변은 저장하지 않습니다.", 502);
    }
    controller.signal.throwIfAborted();
    if (!text.trim()) throw new CompatibleChatError("AI가 답변 본문을 보내지 않았습니다. 모델과 출력 길이를 확인해 주세요.", 502);
    return { text, model };
  } catch (error) {
    if (timedOut) throw new CompatibleChatError("AI 응답 제한 시간을 넘겨 중단했습니다. 자동 재시도하지 않았습니다.", 504);
    if (options.signal?.aborted) throw error;
    if (error instanceof CompatibleChatError) throw error;
    throw new CompatibleChatError("AI에 연결하지 못했습니다. 연결 상태를 확인해 주세요. 자동으로 다시 요청하지 않았습니다.", 502);
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener("abort", abort);
    if (reader) { await reader.cancel().catch(() => undefined); reader.releaseLock(); }
  }
}
