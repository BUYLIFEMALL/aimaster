import { withBotInstructions, type BotDefinition } from "../bots/core";
import { buildRouterPrompt, buildSystemPrompt, type DocHit } from "./core";
import type { ChatMessage } from "./upstage";

type WebEvidence = { title: string; url: string; content: string; published?: string };

/** 원문은 JSON 값으로만 전달한다. 키·소유자·설정 사본 같은 내부 필드는 제외한다. */
export function buildAnswerMessages(today: string, docs: DocHit[], web: WebEvidence[], bot: BotDefinition | null, history: ChatMessage[], question: string): ChatMessage[] {
  return [
    { role: "system", content: withBotInstructions(buildSystemPrompt(today, docs, web), bot) },
    ...history.filter((message) => message.role === "user" || message.role === "assistant").map(({ role, content }) => ({ role, content })),
    { role: "user", content: JSON.stringify({
      input: question,
      reference_data: {
        documents: docs.map(({ document_name, content }) => ({ title: document_name, content })),
        web: web.map(({ title, url, content, published }) => ({ title, url, content, ...(published ? { published } : {}) })),
      },
    }) },
  ];
}

export function buildRouterMessages(question: string, today: string, docs: DocHit[], bot: BotDefinition | null): ChatMessage[] {
  return [
    { role: "system", content: buildRouterPrompt(today, docs.length > 0) },
    { role: "user", content: JSON.stringify({
      question,
      selected_bot: bot ? { name: bot.name, task: bot.instructions } : null,
      documents: docs.slice(0, 3).map(({ document_name, content }) => ({ title: document_name, content: content.replace(/\s+/g, " ").slice(0, 300) })),
    }) },
  ];
}

/** 기본 번역·요약은 원문 처리이므로 질문형 입력에도 자동 웹 검색을 시작하지 않는다. */
export function needsWebDecision(bot: BotDefinition | null): boolean {
  return bot?.id !== "preset-translate" && bot?.id !== "preset-summary";
}
