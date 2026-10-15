import { GoogleGenAI, Type } from "@google/genai";
import { PromptFormData, GeneratedPromptResult } from "@/types/prompt";

function koreaNowRule(now = new Date()): string {
  const [year, month] = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit" }).format(now).split("-").map(Number);
  return `[기준 시점: 한국 시간으로 지금은 ${year}년 ${month}월입니다. 계절·시기 표현은 현재 월에 맞추고, 연도·계절은 불필요하게 덧붙이지 마세요.]`;
}

function wrapFeedback(promptText: string, feedback?: string): string {
  if (!feedback || !feedback.trim()) return promptText;
  return `
사용자가 이전 결과물에 대해 다음과 같은 피드백을 제공했습니다:
피드백 내용: "${feedback.trim()}"

위 피드백을 철저히 반영하여 프롬프트를 **수정 및 재작성**해주세요.
기존의 모드별 작성 규칙(정체성, 출력 형식 등)은 그대로 유지해야 합니다.
**수정된 결과물 또한 반드시 한국어로 작성되어야 합니다.**

원래 지시사항:
${promptText}
  `;
}

export function buildSystemPrompt(data: PromptFormData): string {
  const currentYear = new Date().getFullYear(); // Rule 9: 2026년 기준 연도 주입
  const { goal, role, task, structure, chain, mode, feedback, magicType } = data;

  let basePrompt = "";

  if (mode === "RTSC") {
    basePrompt = `
당신은 세계 최고의 프롬프트 엔지니어이자 '메타 프롬프트' 전문가입니다.
사용자가 제공한 RTSC(Role, Task, Structure, Chain) 정보를 바탕으로 LLM(ChatGPT, Claude, Gemini 등)이 최상의 답변을 내놓을 수 있는 완벽한 '메타 프롬프트'를 작성해주세요. (기준 연도: ${currentYear}년)

사용자 입력 정보:
1. 목적(Goal): ${goal}
2. 역할(Role): ${role || "이 작업에 가장 최적화된 전문가"}
3. 작업(Task): ${task || "목적 달성을 위한 상세 작업"}
4. 구조/형식(Structure): ${structure || "가독성 높은 구조화된 형식"}
5. 제약조건/체인(Chain): ${chain || "논리적이고 단계적인 사고"}

작성 규칙:
- 프롬프트는 명확하고 구체적이어야 합니다.
- 필요시 [Variable] 형태의 플레이스홀더를 포함시키세요.
- **최종 결과물(생성된 프롬프트)은 반드시 한국어로 작성되어야 합니다.** (전문 용어는 영어 병기 가능)
- RTSC 프레임워크를 적용하여 마크다운으로 구조화하세요.
    `;
  } else if (mode === "BUSINESS") {
    basePrompt = `
#### **1. 정체성 (Identity)**
* 너는 **'프롬프트 프레임워크 전문가(Prompt Framework Expert)'**다. (기준 연도: ${currentYear}년)
* 너의 핵심 목표는 사용자가 입력한 주제나 목표에 대해, 검증된 **비즈니스 및 기획 프레임워크(CO-STAR, RTF, RICE, PREP, SWOT, PAS 등)**를 적재적소에 활용하여 가장 논리적이고 구조화된 프롬프트를 생성해주는 것이다.

#### **2. 입력 정보**
* **사용자 목표/주제**: ${goal}
* **추가 상세 내용/작업**: ${task || "상세 비즈니스 목표"}

#### **3. 프롬프트 생성 프로세스 (반드시 준수)**
1단계: 목표 분석 및 프레임워크 선택 (기획안은 CO-STAR, 의사결정은 RICE, 설득/발표는 PREP, 보고서는 RTF 등)
2단계: 프롬프트 구성요소 채우기 (역할, 문맥, 지시, 제약 등)
3단계: 전문성 강화 (단순 질문이 아닌 전문가 수준 결과물을 얻도록 구체 지침 포함)
4단계: 구조화 및 최종 출력 (마크다운 가독성 극대화, 본문은 반드시 한국어)
    `;
  } else if (mode === "ARCHITECT") {
    basePrompt = `
## **1. 당신의 정체성 (Your Identity)**
* 당신은 세계 최고의 AI 프롬프트 설계자, **'프롬프트 아키텍트(Prompt Architect)'**입니다. (기준 연도: ${currentYear}년)
* 당신의 유일한 임무는 사용자가 제시하는 단순하고 모호한 '요청'을 분석하여, LLM의 성능을 100% 끌어낼 수 있는 명확하고 구조적인 **[실행용 프롬프트]**를 설계하고 생성하는 것입니다.
* **제로-퀘스천 원칙**: 사용자에게 되묻지 않고, 제공된 정보만으로 최적의 프롬프트를 완성하세요.

## **2. 입력 정보**
* **사용자 요청(Goal/Task)**: ${goal} ${task ? `(상세 내용: ${task})` : ""}

## **3. 작업 프로세스**
1. 요청 분석: 목표, 대상, 톤앤매너, 형식, 숨겨진 요구사항 추론.
2. 구성요소 설계: 역할, 상황, 과업, 지침, 제약조건, 출력형식 조합.
3. 최종 프롬프트 생성: **오직 한국어 프롬프트만 생성하세요.** (영어 버전 제외)
    `;
  } else if (mode === "VERTEX_XML") {
    basePrompt = `
## **1. 정체성 (Identity)**
당신은 **Google Cloud Vertex AI**의 프롬프트 엔지니어링 가이드라인을 완벽하게 준수하는 전문가입니다. (기준 연도: ${currentYear}년)
특히 Vertex AI 문서에서 권장하는 **XML 태그 구조**와 **명확성, 구체성** 원칙을 기반으로 프롬프트를 설계합니다.

## **2. 입력 정보**
* **목표(Goal)**: ${goal}
* **세부 작업/컨텍스트(Task)**: ${task || "목표 달성을 위한 상세 작업"}

## **3. 프롬프트 설계 규칙 (Vertex AI Style)**
다음 XML 태그 구조를 사용하여 프롬프트를 작성하세요.
**중요: XML 태그 이름(<INSTRUCTIONS> 등)은 영어로 유지하되, 태그 내부의 모든 콘텐츠(지시사항, 설명, 예시 등)는 반드시 한국어로 작성하세요.**

\`\`\`xml
<OBJECTIVE_AND_PERSONA>
(목표 및 페르소나 정의 - 한국어로 작성)
</OBJECTIVE_AND_PERSONA>

<INSTRUCTIONS>
(단계별 구체적인 지시사항 - 한국어로 작성)
</INSTRUCTIONS>

<CONSTRAINTS>
(제약 조건 - 한국어로 작성)
</CONSTRAINTS>

<CONTEXT>
(입력된 정보 기반의 배경 지식 - 한국어로 작성)
</CONTEXT>

<OUTPUT_FORMAT>
(명확한 출력 형식 - 한국어로 작성)
</OUTPUT_FORMAT>

<FEW_SHOT_EXAMPLES>
(필수: 입력된 목표에 적합한 1~2개의 예시 - Input/Output 쌍, 한국어)
</FEW_SHOT_EXAMPLES>

<RECAP>
(핵심 사항 재강조 - 한국어로 작성)
</RECAP>
\`\`\`
    `;
  } else if (mode === "COT_REASONING") {
    basePrompt = `
## **1. 정체성 (Identity)**
당신은 **논리적 추론(Chain of Thought)**과 **복잡한 작업 분해(Task Decomposition)**의 대가입니다. (기준 연도: ${currentYear}년)
'이유를 설명하도록 모델에 지시' 및 '복잡한 태스크 세분화' 섹션을 기반으로 프롬프트를 설계합니다.

## **2. 입력 정보**
* **해결 과제(Goal)**: ${goal}
* **상세 상황(Task)**: ${task || "분석 및 추론 대상"}

## **3. 프롬프트 설계 전략 (한국어 출력 필수)**
단순히 답을 요구하는 것이 아니라, 모델이 **"생각하는 과정(Thinking Process)"**을 거치도록 유도하는 프롬프트를 작성하세요.
모든 출력 결과는 반드시 한국어로 작성되어야 합니다.

**핵심 요소:**
1. 단계별 사고 유도: "단계별로 생각해보세요" 또는 "이유를 먼저 설명하세요" 같은 지시 포함.
2. 작업 분해: 복잡한 문제를 하위 태스크(Sub-tasks)로 쪼개어 순차적으로 해결하도록 설계.
3. 내부 독백(Internal Monologue): 최종 답변 전에 모델이 스스로 논리를 점검하도록 유도.
    `;
  } else if (mode === "QUICK_ENHANCE") {
    const magic = magicType || "INTERVIEW";
    let magicStrategy = "";
    if (magic === "INTERVIEW") {
      magicStrategy = `
전략: "역질문 유도형"
- 사용자가 입력한 내용을 분석하여, AI가 부족한 정보를 5가지 질문으로 되묻도록 하는 메타 프롬프트를 작성하세요.
- 출력 예시: "내가 입력한 주제: '${goal}'... 위 주제를 분석해서, 네가 더 완벽한 결과물을 만들 수 있도록 나에게 필요한 정보를 5가지만 질문해줘."
      `;
    } else if (magic === "AUTO_PERSONA") {
      magicStrategy = `
전략: "전문가 페르소나 자동 부여형 (Meta-Prompt Generator)"
[지시사항]
사용자의 목표('${goal}')를 직접 수행하는 명령이 아니라, **"이 목표를 달성하기 위한 최적의 프롬프트를 만들어달라"**고 요청하는 메타 명령문을 작성하세요.
[필수 포함 내용]
1. AI에게 이 작업에 가장 적합한 전문가 페르소나를 스스로 설정하라고 지시하세요.
2. 그 페르소나의 관점에서 작성된 '고도화된 프롬프트'를 설계해달라고 요청하세요.
[강력한 제약사항]
- 절대로 글을 써줘, 계획을 짜줘 등 직접 작업을 수행하지 말 것.
- 무조건 문장의 끝은 **"~하는 프롬프트를 작성해줘"** 또는 **"~하는 프롬프트를 설계해줘"**로 끝나야 합니다.
      `;
    } else {
      magicStrategy = `
전략: "비판적 개선 요청형"
- 사용자가 입력한 프롬프트를 RTF(Role, Task, Format) 프레임워크를 기반으로 비판하고 개선하도록 지시하는 메타 프롬프트를 작성하세요.
- 출력 예시: "방금 내 프롬프트('${goal}')의 가독성과 구체성을 높여서, [역할, 작업, 형식, 제약사항]이 포함된 최적의 프롬프트로 업그레이드해줘."
      `;
    }

    basePrompt = `
## **1. 정체성**
당신은 복잡한 프롬프트 엔지니어링 없이도, 단 한 줄의 지시만으로 프롬프트 성능을 극대화하는 **'마법의 프롬프트 생성기'**입니다. (기준 연도: ${currentYear}년)

## **2. 입력 정보**
* **사용자 원문**: ${goal}
* **선택된 마법 전략**: ${magicStrategy}

## **3. 작업 지시**
사용자가 선택한 전략에 맞춰, 다른 AI(ChatGPT, Claude 등)에게 붙여넣어 바로 사용할 수 있는 **'실행용 지시문(One-Shot Prompt)'**을 작성하세요.
- 결과물은 사용자가 복사해서 바로 쓸 수 있는 형태여야 합니다.
- **생성되는 프롬프트는 반드시 한국어로 작성하세요.**
    `;
  }

  // Capability Constraints
  if (data.excludedCapabilities && data.excludedCapabilities.length > 0) {
    let constraints = `\n\n[!!! 중요: 모델 기능 제한 (Capability Constraints) !!!]\n사용자가 생성될 프롬프트에 대해 다음 기능 사용 금지를 요청했습니다. 작성하는 프롬프트의 '제약 조건(Constraints)' 섹션에 이를 반드시 포함시키세요:\n`;
    data.excludedCapabilities.forEach((c) => {
      if (c === "WEB_SEARCH") constraints += `- [Web Browsing/검색 금지]: 외부 정보를 검색하지 말고, 모델이 가진 내부 지식만 사용하도록 지시하세요.\n`;
      if (c === "CODE_INTERPRETER") constraints += `- [Code Interpreter/코드 실행 금지]: Python 코드를 작성하거나 실행하지 말고, 텍스트로만 답변하도록 지시하세요.\n`;
      if (c === "IMAGE_GEN") constraints += `- [Image Generation/이미지 생성 금지]: DALL-E 등의 이미지 생성 도구를 호출하지 않도록 지시하세요.\n`;
      if (c === "NO_AI") constraints += `- **[AI 미적용/순수 논리 사용]**: 어떠한 AI 도구(검색, 코드, 플러그인 등)도 사용하지 말고, 오직 주어진 문맥과 모델의 순수 추론 능력만으로 답변하도록 강력하게 지시하세요.\n`;
    });
    basePrompt += constraints;
  }

  return wrapFeedback(`${basePrompt}\n${koreaNowRule()}`, feedback);
}

export async function generateMetaPrompt(
  apiKey: string,
  formData: PromptFormData
): Promise<GeneratedPromptResult> {
  const ai = new GoogleGenAI({ apiKey });
  const promptText = buildSystemPrompt(formData);

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      generatedPrompt: {
        type: Type.STRING,
        description: "The complete markdown meta prompt, written in Korean.",
      },
      explanation: {
        type: Type.STRING,
        description: "Detailed explanation of why this prompt works and design logic.",
      },
      tips: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "3 actionable tips to get the best results with this prompt.",
      },
    },
    required: ["generatedPrompt", "explanation", "tips"],
  };

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: promptText,
    config: {
      responseMimeType: "application/json",
      responseSchema,
      temperature: 0.7,
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error("AI 응답이 비어 있습니다. 잠시 후 다시 시도해주세요.");
  }

  return JSON.parse(text) as GeneratedPromptResult;
}

export type SuggestType = "enhance_goal" | "recommend_roles" | "draft_task" | "suggest_structure" | "suggest_chain";

export async function generateFieldSuggestion(
  apiKey: string,
  type: SuggestType,
  context: { goal: string; role?: string; task?: string }
): Promise<string[] | string> {
  const currentYear = new Date().getFullYear();
  const ai = new GoogleGenAI({ apiKey });

  if (type === "enhance_goal") {
    const prompt = `당신은 프롬프트 엔지니어링 전문가입니다. (기준 연도: ${currentYear}년)
사용자가 입력한 거친 아이디어를 바탕으로, LLM이 배경과 의도를 명확히 파악할 수 있도록 구체적인 목적(Goal) 문장으로 정교하게 확장·개선해주세요.
원문 아이디어: "${context.goal}"

지시:
- 원문의 의도를 해치지 않으면서 구체적인 상황, 목적, 달성하고자 하는 가치를 포함하세요.
- 불필요한 서론/결론 없이 오직 개선된 목적 문장만 간결하게 2~3문장 이내 한국어로 출력하세요.`;

    const res = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `${prompt}\n${koreaNowRule()}`,
      config: { temperature: 0.6 },
    });
    return res.text?.trim() || "";
  }

  if (type === "recommend_roles") {
    const prompt = `당신은 프롬프트 엔지니어링 전문가입니다. (기준 연도: ${currentYear}년)
다음 사용자의 목적을 완벽히 달성하기 위해 가장 적합한 AI 페르소나(전문가 역할) 5가지를 추천해주세요.
목적: "${context.goal}"

응답 형식: 정확히 5개의 짧고 전문적인 역할 명칭(예: "10년 차 B2B 전략 기획자", "글로벌 테크 테크니컬 라이터" 등)을 JSON 문자열 배열로만 응답하세요.`;

    const res = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `${prompt}\n${koreaNowRule()}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
      },
    });
    return JSON.parse(res.text || "[]");
  }

  if (type === "draft_task") {
    const prompt = `당신은 프롬프트 엔지니어링 전문가입니다. (기준 연도: ${currentYear}년)
다음 목적과 역할에 맞추어 AI가 수행해야 할 상세 작업(Task) 지시사항을 단계별로 작성해주세요.
목적: "${context.goal}"
역할: "${context.role || "해당 분야 전문가"}"

지시:
- AI가 혼선 없이 수행할 수 있도록 명확한 3~4단계 작업 실행 지침을 불렛포인트 형태로 한국어로 작성하세요.
- 불필요한 군더더기 없이 작업 지시문 본문만 반환하세요.`;

    const res = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `${prompt}\n${koreaNowRule()}`,
      config: { temperature: 0.7 },
    });
    return res.text?.trim() || "";
  }

  if (type === "suggest_structure") {
    const prompt = `당신은 프롬프트 엔지니어링 전문가입니다.
다음 목적과 작업에 최적화된 결과물 출력 형식(Structure) 가이드 4가지를 추천해주세요.
목적: "${context.goal}"
작업: "${context.task || ""}"

응답 형식: 각 항목은 1~2문장의 간결한 포맷 지침(예: "표(Table) 형태: 항목, 중요도, 실행계획 열로 구성", "마크다운 요약 보고서: 핵심 요약, 상세 분석, 체크리스트 순서")으로 된 JSON 배열로 응답하세요.`;

    const res = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `${prompt}\n${koreaNowRule()}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
      },
    });
    return JSON.parse(res.text || "[]");
  }

  if (type === "suggest_chain") {
    const prompt = `당신은 프롬프트 엔지니어링 전문가입니다.
다음 목적과 작업에 적합한 제약 조건 및 사고 체인(Chain/Constraints) 가이드 4가지를 추천해주세요.
목적: "${context.goal}"

응답 형식: 각 항목은 1문장의 간결한 제약/사고 지침(예: "답변 전 <thought> 태그 내에서 논리적 근거를 먼저 검토할 것", "추측성 정보는 배제하고 검증된 사실만 답변할 것")으로 된 JSON 배열로 응답하세요.`;

    const res = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `${prompt}\n${koreaNowRule()}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
      },
    });
    return JSON.parse(res.text || "[]");
  }

  return "";
}
