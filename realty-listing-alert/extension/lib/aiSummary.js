// 🤖 AI 시세 요약(2026-10-25, v1.22 — 주인님 「회원 본인 키로 이번 주 시세 흐름을 한두 줄로 요약해 알림에 붙입니다」).
// 회원 PC에서 회원 본인 AI 키로 직접 부른다. 보내는 것은 통계 숫자뿐(단지 이름·매물 수·평균가·변동 건수·실거래 대비) — 중개사 번호·매물 목록은 보내지 않는다.
// 하루 1번(그날 첫 수집)만 만들고, 실패해도 알림은 평소대로 간다.

const DAY = 24 * 3600 * 1000;
export const AI_MAX_CHARS = 200;
const GEMINI_MODEL = "gemini-flash-lite-latest"; // 가장 최신 정식 Flash-Lite 별칭(ai-work-workspace geminiModels.ts와 같은 기준)
const CLAUDE_MODEL = "claude-haiku-5-5"; // Claude 가장 저렴한 최신 Haiku(ai-mastering-studio models.ts와 같은 이름)

/** 만 원 → 「10억 6,086만 원」(AI가 단위를 헷갈리지 않게 한국어 금액으로 보낸다 — 2026-10-25 「1억 600만 원대」로 잘못 쓴 사례) */
export function wonText(man) {
  const n = Math.round(Number(man));
  if (!Number.isFinite(n) || n <= 0) return null;
  const eok = Math.floor(n / 10000), rest = n % 10000;
  if (!eok) return `${rest.toLocaleString("ko-KR")}만 원`;
  return rest ? `${eok}억 ${rest.toLocaleString("ko-KR")}만 원` : `${eok}억 원`;
}

/** 최근 7일 기록(history) → 단지·매매별 변화 숫자. 비교할 기록이 없으면 null */
export function buildAiInput(history, now = Date.now()) {
  if (!Array.isArray(history) || !history.length) return null;
  const last = history[history.length - 1];
  const weekAgo = new Date(last.at).getTime() - 7 * DAY;
  const first = history.find((h) => new Date(h.at).getTime() >= weekAgo) || last;
  const recent = history.filter((h) => new Date(h.at).getTime() >= weekAgo);
  const complexes = (last.complexes || []).slice(0, 10).map((c) => {
    const before = (first.complexes || []).find((x) => x.name === c.name);
    const sale = c.trades?.["매매"];
    const saleBefore = before?.trades?.["매매"];
    const ev = { new: 0, priceDown: 0, priceUp: 0, gone: 0 };
    for (const h of recent) {
      const x = (h.complexes || []).find((y) => y.name === c.name);
      if (x?.events) for (const k of Object.keys(ev)) ev[k] += x.events[k] || 0;
    }
    return {
      단지: c.name,
      매물수: c.total,
      매물수변화: before ? c.total - before.total : null,
      매매평균가격: wonText(sale?.avg),
      매매평균변화퍼센트: sale?.avg && saleBefore?.avg ? Math.round(((sale.avg / saleBefore.avg) - 1) * 1000) / 10 : null,
      실거래대비퍼센트: sale?.tradeGapAvg ?? null,
      이번주_새매물: ev.new, 이번주_가격내림: ev.priceDown, 이번주_가격오름: ev.priceUp, 이번주_목록에서_내려감: ev.gone,
    };
  });
  return { 기간: `${new Date(first.at).toISOString().slice(0, 10)}~${new Date(last.at).toISOString().slice(0, 10)}`, 기록회수: recent.length, 단지들: complexes, now };
}

export function buildAiPrompt(input, year = new Date().getFullYear()) {
  return [
    `[기준 연도 엄수: 현재 연도는 ${year}년입니다. 모든 연도 표기는 ${year}년 기준으로 쓰고 과거 연도로 퇴행하지 마세요.]`,
    "너는 부동산 매물 알림 비서야. 아래는 회원이 감시하는 아파트 단지들의 최근 7일 네이버 매물 통계야. 가격은 「10억 6,086만 원」처럼 이미 한국어 금액으로 적혀 있으니 그대로 옮겨 쓰고, 단위를 바꾸거나 다시 계산하지 마.",
    "이번 주 시세 흐름을 한국어 존댓말 1~2문장, 200자 이내로 요약해. 가장 눈에 띄는 단지·변화(호가 오름/내림, 새 매물, 실거래 대비)를 숫자와 함께 짚고, 투자 권유·단정은 하지 마. 제목·#·굵은 글씨·목록 기호 없이 평범한 문장으로만 써. 「목록에서_내려감」은 광고를 내린 것일 수도 있으니 「거래됐다」고 단정하지 마.",
    "기록이 1~2회뿐이면 「아직 기록이 적어」라고 짧게 밝혀.",
    JSON.stringify(input),
  ].join("\n");
}

/** AI 글 정리: 제목 #·굵은 글씨·목록 기호를 지우고 한 줄 200자(2026-10-26 Claude가 「# 📊 …」 제목 서식으로 답한 사례) */
export function cleanAiText(s, max = AI_MAX_CHARS) {
  return String(s || "").replace(/^\s{0,3}#{1,6}\s*/gm, "").replace(/\*\*|__|`/g, "").replace(/^\s*[-*•]\s+/gm, "").replace(/\s+/g, " ").trim().slice(0, max);
}
// 호출 함수는 길이를 자르지 않고 돌려주고(주간 리포트는 400자), 부르는 쪽이 cleanAiText로 자른다
const clip = (t) => String(t || "");

async function callGemini(apiKey, prompt, model) {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model || GEMINI_MODEL}:generateContent`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { maxOutputTokens: 900 } }),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Gemini ${res.status} ${j?.error?.message || ""}`.trim());
  return clip(j?.candidates?.[0]?.content?.parts?.map((p) => p.text).join(""));
}

/** 회원 키로 볼 수 있는 채팅 모델 중 가장 저렴한 축(nano → mini)을 고른다(음성·실시간·검색·이미지 제외) */
export function pickOpenAiModel(ids) {
  const ok = (ids || []).filter((id) => /^gpt-/.test(id) && !/(audio|realtime|search|tts|transcribe|image|instruct|preview)/.test(id) && !/-\d{4}-\d{2}-\d{2}$/.test(id));
  const sorted = (re) => ok.filter((id) => re.test(id)).sort().reverse();
  return sorted(/nano/)[0] || sorted(/mini/)[0] || null;
}

async function callOpenAI(apiKey, prompt, chosen) {
  if (chosen) return callOpenAIModel(apiKey, prompt, chosen);
  const list = await fetch("https://api.openai.com/v1/models", { headers: { authorization: `Bearer ${apiKey}` } });
  const lj = await list.json().catch(() => ({}));
  if (!list.ok) throw new Error(`OpenAI ${list.status} ${lj?.error?.message || ""}`.trim());
  const model = pickOpenAiModel((lj.data || []).map((m) => m.id));
  if (!model) throw new Error("OpenAI: 쓸 수 있는 저렴한 모델(nano·mini)을 찾지 못했어요");
  return callOpenAIModel(apiKey, prompt, model);
}

async function callOpenAIModel(apiKey, prompt, model) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages: [{ role: "user", content: prompt }], max_completion_tokens: 1200 }),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`OpenAI ${res.status} ${j?.error?.message || ""}`.trim());
  return clip(j?.choices?.[0]?.message?.content);
}

// 확장(회원 PC)에서 바로 부르므로 Anthropic의 브라우저 직접 호출 머리글이 필요하다 — 키는 회원 본인 것
async function callClaude(apiKey, prompt, model) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
    body: JSON.stringify({ model: model || CLAUDE_MODEL, max_tokens: 900, messages: [{ role: "user", content: prompt }] }),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Claude ${res.status} ${j?.error?.message || ""}`.trim());
  return clip((j?.content || []).filter((c) => c.type === "text").map((c) => c.text).join(""));
}

/** ai: { provider: "gemini"|"openai"|"claude", apiKey } → 요약 글(200자). 실패하면 예외 */
export async function makeAiSummary(ai, history, { buildPrompt = buildAiPrompt, max = AI_MAX_CHARS } = {}) {
  const input = buildAiInput(history);
  if (!input) throw new Error("통계 기록이 아직 없어요");
  const prompt = buildPrompt(input);
  const raw = ai.provider === "openai" ? await callOpenAI(ai.apiKey, prompt, ai.model) : ai.provider === "claude" ? await callClaude(ai.apiKey, prompt, ai.model) : await callGemini(ai.apiKey, prompt, ai.model);
  const text = cleanAiText(raw, max);
  if (!text) throw new Error("AI가 빈 답을 돌려줬어요");
  return text;
}
