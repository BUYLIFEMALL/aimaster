import "server-only";
import { GoogleGenAI, Type } from "@google/genai";
import { COMPONENT_TYPES, type CanvasSize, type DesignSpec } from "@/lib/canvas/types";
import { TOOLBOX } from "@/lib/canvas/constants";

const MODEL = "gemini-2.5-flash";

/** 사용자에게 보여줄 한국어 메시지로 바꾼다(키 값은 절대 포함하지 않는다). */
export function friendlyAiError(error: unknown): { message: string; status: number } {
  const raw = error instanceof Error ? error.message : String(error ?? "");
  const lower = raw.toLowerCase();
  if (lower.includes("api key") || lower.includes("api_key") || lower.includes("permission") || lower.includes("401") || lower.includes("403")) {
    return { message: "등록한 Gemini API 키가 올바르지 않거나 권한이 없습니다. [API키등록·플랫폼연동]에서 키를 다시 확인해 주세요.", status: 400 };
  }
  if (lower.includes("quota") || lower.includes("429") || lower.includes("rate")) {
    return { message: "Gemini 사용 한도를 초과했습니다. 잠시 후 다시 시도하거나 본인 Google AI 계정의 한도를 확인해 주세요.", status: 429 };
  }
  if (lower.includes("timeout") || lower.includes("deadline") || lower.includes("503") || lower.includes("unavailable")) {
    return { message: "AI 서버가 일시적으로 응답하지 않습니다. 잠시 후 다시 시도해 주세요.", status: 503 };
  }
  return { message: "AI 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.", status: 500 };
}

function yearGuard() {
  const year = new Date().getFullYear();
  const [koreaYear, koreaMonth] = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit" }).format(new Date()).split("-").map(Number);
  return `[기준 연도 엄수: 현재 연도는 ${year}년입니다. 연도를 쓸 때는 반드시 ${year}년(당해 연도)을 기준으로 하고 과거 연도로 퇴행하지 마세요.] [기준 시점: 한국 시간으로 지금은 ${koreaYear}년 ${koreaMonth}월입니다. 계절·시기 표현은 현재 월에 맞추고, 연도·계절은 불필요하게 덧붙이지 마세요.]`;
}

const specSchema = {
  type: Type.OBJECT,
  properties: {
    appName: { type: Type.STRING, description: "애플리케이션의 이름" },
    appDescription: { type: Type.STRING, description: "목적, 주요 기능, 대상 사용자를 포함한 상세 설명" },
    screenDescription: { type: Type.STRING, description: "현재 화면의 역할과 동작 방식 설명" },
  },
  required: ["appName", "appDescription", "screenDescription"],
};

function parseJson(text: string | undefined): unknown {
  if (!text) throw new Error("empty response");
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");
  return JSON.parse(cleaned);
}

function asSpec(value: unknown): DesignSpec {
  const v = (value ?? {}) as Record<string, unknown>;
  return {
    appName: String(v.appName ?? "").slice(0, 200),
    appDescription: String(v.appDescription ?? "").slice(0, 8000),
    screenDescription: String(v.screenDescription ?? "").slice(0, 8000),
  };
}

/** 캔버스 컴포넌트 요약 → 앱 이름/설명/화면 설명 */
export async function suggestSpec(apiKey: string, summary: unknown): Promise<DesignSpec> {
  const ai = new GoogleGenAI({ apiKey });
  const prompt = `${yearGuard()}
다음은 UI 디자인 편집기로 만든 웹 애플리케이션 화면의 컴포넌트 목록입니다.
이 정보를 바탕으로 이 애플리케이션의 이름, 상세 설명(목적, 주요 기능, 대상 사용자 포함), 그리고 현재 화면의 역할 및 동작 방식을 한국어로 제안해주세요.
결과는 반드시 지정된 JSON 형식으로만 응답해야 합니다.

컴포넌트 정보:
${JSON.stringify(summary, null, 2)}`;
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: prompt,
    config: { responseMimeType: "application/json", responseSchema: specSchema },
  });
  return asSpec(parseJson(response.text));
}

const componentSchema = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING },
    type: { type: Type.STRING, enum: TOOLBOX.map((t) => t.type) },
    position: { type: Type.OBJECT, properties: { x: { type: Type.NUMBER }, y: { type: Type.NUMBER } }, required: ["x", "y"] },
    size: { type: Type.OBJECT, properties: { width: { type: Type.NUMBER }, height: { type: Type.NUMBER } }, required: ["width", "height"] },
    props: {
      type: Type.OBJECT,
      properties: {
        text: { type: Type.STRING },
        placeholder: { type: Type.STRING },
        tabs: { type: Type.ARRAY, items: { type: Type.STRING } },
        activeTab: { type: Type.INTEGER },
      },
    },
    description: { type: Type.STRING },
  },
  required: ["name", "type", "position", "size", "props", "description"],
};

/** UI 스크린샷 → 디자인 명세 + 컴포넌트 목록(원시 값. 정규화는 호출 측에서) */
export async function imageToDesign(
  apiKey: string,
  image: { data: string; mimeType: string },
  canvas: CanvasSize,
): Promise<{ spec: DesignSpec; components: unknown[] }> {
  const ai = new GoogleGenAI({ apiKey });
  const types = COMPONENT_TYPES.filter((t) => t !== "Group");
  const prompt = `${yearGuard()}
당신은 UI 스크린샷의 기능적 구조를 분석하는 UI/UX 아키텍트입니다. 제공된 이미지를 분석해 화면의 디자인 명세와 컴포넌트 배열을 담은 단일 JSON 객체로 응답하세요.

사용 가능한 컴포넌트 타입: ${JSON.stringify(types)}
최종 목표 작업 영역 크기: ${canvas.width}px 너비, ${canvas.height}px 높이

지침:
1. designSpec
   - appName: 이미지에 보이는 이름을 그대로 쓰지 말고, 본질을 담은 새로운 한국어 앱 이름을 지어주세요.
   - appDescription: 핵심 가치, 주요 사용자 여정, 대상 사용자를 포함해 한국어로 상세히 작성하세요.
   - screenDescription: 이 화면의 목표, 사용자의 상호작용 흐름, 예상 결과를 설명하세요.
2. components
   - 헤더, 사이드바, 본문, 카드, 폼 같은 논리적 영역은 반드시 'Container' 타입으로 감싸 구조화하세요(중첩 가능).
   - 모든 위치(x,y)와 크기(width,height)는 위 작업 영역 크기에 비례해 맞추고, 화면 밖으로 벗어나지 않게 하세요.
   - 컴포넌트 name은 "Header_NavButton_Home"처럼 계층적이고 명확하게, description에는 역할·상태·상호작용을 쓰세요.
   - props에는 의미에 맞게 text/placeholder/tabs/activeTab만 넣으세요. 스타일은 복제하지 않아도 됩니다.
   - 이미지에 사람이 등장하더라도 컴포넌트 설명에는 인물 묘사를 넣지 마세요.
3. JSON 외의 설명·마크다운은 출력하지 마세요. 최상위 키는 designSpec, components 두 개입니다.`;
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: { parts: [{ text: prompt }, { inlineData: { mimeType: image.mimeType, data: image.data } }] },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: { designSpec: specSchema, components: { type: Type.ARRAY, items: componentSchema } },
        required: ["designSpec", "components"],
      },
    },
  });
  const parsed = parseJson(response.text) as { designSpec?: unknown; components?: unknown };
  if (!parsed || typeof parsed !== "object" || !parsed.designSpec || !Array.isArray(parsed.components)) {
    throw new Error("AI 응답 형식이 올바르지 않습니다.");
  }
  return { spec: asSpec(parsed.designSpec), components: parsed.components.slice(0, 300) };
}
