import "server-only";

// Upstage API(회원 본인 키). 공식 문서 확인 2026-10-19:
// - 답변: POST https://api.upstage.ai/v1/chat/completions (OpenAI 호환), 모델 solar-pro4 / solar-mini4
// - 임베딩: POST https://api.upstage.ai/v1/embeddings, solar-embedding-2-query / -passage (1024차원, 요청당 최대 100개)
//   (옛 embedding-query/-passage 별칭은 2026-12-31 종료 예정이라 쓰지 않음)
// - 문서 읽기: POST https://api.upstage.ai/v1/document-digitization, model=document-parse (동기 100쪽까지)
const BASE = "https://api.upstage.ai/v1";
export const ANSWER_MODEL = "solar-pro4";
export const ROUTER_MODEL = "solar-mini4";
export const EMBED_QUERY_MODEL = "solar-embedding-2-query";
export const EMBED_PASSAGE_MODEL = "solar-embedding-2-passage";
export const EMBED_DIM = 1024;

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/** Upstage 오류를 회원이 알아볼 수 있는 한국어 문장으로 바꾼다(키 값은 넣지 않음) */
async function upstageError(res: Response): Promise<Error> {
  const body = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
  const msg = body?.error?.message ?? "";
  if (res.status === 401 || res.status === 403) return new Error("Upstage API 키가 올바르지 않습니다. [API키등록·플랫폼연동]에서 키를 확인해 주세요.");
  if (res.status === 429) return new Error("Upstage 사용 한도에 걸렸습니다. 잠시 뒤 다시 시도하거나 Upstage 콘솔에서 크레딧을 확인해 주세요.");
  return new Error(`Upstage 요청이 실패했습니다(${res.status}). ${msg}`.trim());
}

/** 답변을 한 번에 받는다(라우터 판단 등 짧은 호출용) */
export async function chatOnce(apiKey: string, model: string, messages: ChatMessage[], maxTokens = 300): Promise<string> {
  const res = await fetch(`${BASE}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature: 0 }),
  });
  if (!res.ok) throw await upstageError(res);
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return data.choices?.[0]?.message?.content ?? "";
}

/** 답변을 조금씩 받아 onDelta로 넘긴다(SSE). 끝나면 전체 답변을 돌려준다 */
export async function chatStream(apiKey: string, messages: ChatMessage[], onDelta: (text: string) => void): Promise<string> {
  const res = await fetch(`${BASE}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: ANSWER_MODEL, messages, stream: true, temperature: 0.3 }),
  });
  if (!res.ok || !res.body) throw await upstageError(res);
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let full = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const t = line.trim();
      if (!t.startsWith("data:")) continue;
      const payload = t.slice(5).trim();
      if (payload === "[DONE]") continue;
      try {
        const j = JSON.parse(payload) as { choices?: { delta?: { content?: string } }[] };
        const piece = j.choices?.[0]?.delta?.content ?? "";
        if (piece) {
          full += piece;
          onDelta(piece);
        }
      } catch {
        /* 조각이 잘린 줄은 무시 */
      }
    }
  }
  return full;
}

/** 여러 문장을 임베딩한다(100개씩 나눠 요청) */
export async function embed(apiKey: string, texts: string[], kind: "query" | "passage"): Promise<number[][]> {
  const model = kind === "query" ? EMBED_QUERY_MODEL : EMBED_PASSAGE_MODEL;
  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += 100) {
    const batch = texts.slice(i, i + 100);
    const res = await fetch(`${BASE}/embeddings`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, input: batch }),
    });
    if (!res.ok) throw await upstageError(res);
    const data = (await res.json()) as { data?: { index: number; embedding: number[] }[] };
    const rows = (data.data ?? []).sort((a, b) => a.index - b.index).map((d) => d.embedding);
    if (rows.length !== batch.length || rows.some((r) => r.length !== EMBED_DIM)) throw new Error("Upstage 임베딩 결과가 예상과 다릅니다. 잠시 뒤 다시 시도해 주세요.");
    out.push(...rows);
  }
  return out;
}

/** PDF 등 문서를 Upstage Document Parse로 읽어 마크다운(없으면 텍스트)으로 돌려준다 */
export async function parseDocument(apiKey: string, file: Blob, fileName: string): Promise<string> {
  const form = new FormData();
  form.append("model", "document-parse");
  form.append("document", file, fileName);
  form.append("output_formats", JSON.stringify(["markdown", "text"]));
  const res = await fetch(`${BASE}/document-digitization`, { method: "POST", headers: { Authorization: `Bearer ${apiKey}` }, body: form });
  if (!res.ok) throw await upstageError(res);
  const data = (await res.json()) as { content?: { markdown?: string; text?: string; html?: string } };
  const c = data.content ?? {};
  const text = c.markdown || c.text || (c.html ?? "").replace(/<[^>]+>/g, " ");
  return text.replace(/[ \t]+\n/g, "\n").trim();
}
