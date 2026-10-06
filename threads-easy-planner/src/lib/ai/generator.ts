import "server-only";
import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import Anthropic from "@anthropic-ai/sdk";
import type { AIProvider } from "@/lib/apiKeys";
import type { TopicSuggestion, ThreadPlanResult, HookVariant, RewriteMode } from "@/types/planner";
export type { TopicSuggestion, ThreadPlanResult, HookVariant, RewriteMode };

/**
 * 1. "오늘 뭐 쓰지?" 주제 10개 추천
 * 스레드 4대 심리(공감·손해회피·호기심·반전)와 5대 훅 유형 기반
 */
export async function suggestTopicsAI(params: {
  categoryName?: string;
  customKeyword?: string;
  aiConfig: { provider: AIProvider; apiKey: string; model?: string };
}): Promise<TopicSuggestion[]> {
  const { categoryName, customKeyword, aiConfig } = params;

  const targetDescription = customKeyword
    ? `사용자 입력 키워드/분야: "${customKeyword}"`
    : `선택된 타깃 카테고리: "${categoryName || "자취 / 생활꿀팁"}"`;

  const systemPrompt = `너는 대한민국 Threads(스레드)에서 실시간으로 수백 개의 댓글과 50만 뷰 이상 바이럴을 터뜨리는 탑티어 콘텐츠 디렉터야.
초보자도 바로 터지는 글을 쓸 수 있도록, 지금 스레드 알고리즘과 독자 심리를 완벽히 관통하는 매력적인 주제 10개를 뽑아줘.

[★ 실전 떡상 사례 벤치마킹]
- "넘더러워서 안 올리려다 올리는 세탁조 청소 썰 (조회수 52만 회 터진 실사례)"
- "비싼 건 줄 알았는데 알고 보니 가성비 종결템이었던 섀도 썰 (조회수 1.6만 회 바이럴)"

[스레드 4대 심리 자극 공식]
1. 공감: "나만 이런 줄 알았는데 다들 똑같더라", 숨겨진 찌질함이나 귀찮음 건드리기
2. 손해 회피: "워싱소다 백식초 다 소용없더라 제발 사지 마", "모르면 평생 헛돈 쓰는"
3. 호기심: "다 써보고 마지막으로 주문했는데 물색깔 보고 기절함....", "진짜 나만 알고 싶었던 꿀조합"
4. 반전: "이거 비싼건줄 알았는데;; 가성비템이었다니...", "섀도는 이거 하나로 종결 땅땅!"

[5대 훅 유형 분배]
10개 추천 주제는 자책형, 부정 명령형, 리얼 썰형, 논쟁형, 반전형을 골고루 배분해줘.
- 지루한 교과서 설명문 절대 금지: "20대 재테크 팁" (X) -> "통장에 100만원도 없던 내가 6개월 만에 1000만원 모은 강제 저축법" (O)
- 본문에는 제품명을 넣지 않고 호기심을 극대화하는 1인칭 날것의 썰 형태를 띨 것.

반드시 아래 JSON 객체 포맷으로만 응답해:
{
  "topics": [
    {
      "id": 1,
      "topic": "스레드 주제 제목",
      "hookPreview": "첫 문장으로 쓰기 좋은 1초 후킹 예시",
      "whyItWorks": "자극한 심리(공감·손해회피·호기심·반전)와 멈추게 하는 이유 1줄"
    }
  ]
}`;

  const userPrompt = `분야: ${targetDescription}\n이 타깃의 독자들이 스크롤을 멈추고 댓글을 달 수밖에 없는 스레드 주제 10개를 뽑아줘.`;

  const rawJson = await callLLM(aiConfig, systemPrompt, userPrompt);
  const parsed = parseJsonSafe<any>(rawJson, null);

  if (!parsed) return [];

  if (Array.isArray(parsed)) {
    return parsed as TopicSuggestion[];
  }

  const candidate =
    parsed.topics ||
    parsed.response ||
    parsed.data ||
    parsed.suggestions ||
    Object.values(parsed).find(Array.isArray);

  if (Array.isArray(candidate)) {
    return candidate as TopicSuggestion[];
  }

  return [];
}

/**
 * 사진이나 영상의 번호/순서 메타 표현("1번째 사진", "2번째 사진", "첫 번째 사진", "1번 사진", "영상 N초" 등)을 제거하고
 * 순수한 내용 중심의 자연스러운 문장으로 정제한다.
 */
export function cleanMediaMetaPhrases(text: string): string {
  if (!text) return "";
  let cleaned = text;
  // 1. "1번째 사진만 보면", "1번째 사진 보면", "2번째 사진 보면", "첫 번째 사진 보면" 등
  cleaned = cleaned.replace(/(?:[0-9]+|첫|두|세|네|다섯)\s*번째\s*사진(?:만)?\s*(?:보면|보니까|에서|속|은|이|을|의|에)?\s*/g, "");
  // 2. "1번 사진", "2번 사진", "1번 컷", "2번 컷"
  cleaned = cleaned.replace(/(?:[0-9]+)\s*번\s*(?:사진|컷)(?:만)?\s*(?:보면|보니까|에서|속|은|이|을|의|에)?\s*/g, "");
  // 3. "영상 N초(쯤에/에서)"
  cleaned = cleaned.replace(/영상\s*[0-9]+\s*초(?:쯤에|에서|경|대)?\s*/g, "");
  // 4. 연속 빈 줄 정리
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n");
  return cleaned.trim();
}

/**
 * 2. 선택한 주제로 스레드 글 및 5대 훅 유형별 글 세트 자동 생성
 * - 황금 4단계 구조: 멈추게 하기 → 공감 쌓기 → 반전 한 방 → 질문 던지기
 * - 4~6줄 친근한 반말(친구/언니 카톡 톤), AI 티 완전 제거, 제품명 노출 금지
 * - 5대 훅 유형(자책형, 부정 명령형, 리얼 썰형, 논쟁형, 반전형) 대안 완비
 */
export async function generateThreadPlanAI(params: {
  topic: string;
  additionalNote?: string;
  templateInput?: import("@/types/planner").ThreadPlannerTemplateInput;
  personaPrompt?: string;
  mediaData?: import("@/types/planner").MediaPayload;
  aiConfig: { provider: AIProvider; apiKey: string; model?: string };
}): Promise<ThreadPlanResult> {
  const { topic, additionalNote, templateInput, personaPrompt, mediaData, aiConfig } = params;

  let mediaGuideline = "";
  let imagesForLLM: { data: string; mimeType: string }[] | undefined = undefined;

  if (mediaData && mediaData.base64List && mediaData.base64List.length > 0) {
    const isVideo = mediaData.type === "video";
    const imageCount = mediaData.base64List.length;

    if (isVideo) {
      mediaGuideline = `
[★ 첨부된 동영상 종합 시각 분석 지침 (※ 사진/영상 번호나 시간 지칭 절대 금지)]
- 사용자가 첨부한 동영상의 시작부터 전개, 절정, 결과까지 전체 흐름과 디테일을 면밀히 분석해줘.
- 영상 속에서 일어난 상태 변화(오염/얼룩이 싹 지워지는 과정, 거품/제형 반응, 색상 변화, 극적인 반전 등)와 시각적 디테일(손동작, 도구의 형태, 현장의 리얼한 반응)을 바탕으로 글을 작성해줘.
- 【절대 불변 원칙: 메타 발언 일체 금지】: 본문이나 첫 문장에 "영상 3초", "1번 컷", "마지막 장면에서" 같은 영상 프레임/시간/컷 지칭 문구를 절대 쓰지 말 것!
- 독자는 글쓴이가 직접 현장에서 겪고 느낀 생생한 1인칭 리얼 경험담("직접 해보고 기절할 뻔함", "치이익 소리 나면서 싹 닦여나가는데 카타르시스 오짐")으로 읽혀야 해.
`;
    } else if (imageCount > 1) {
      mediaGuideline = `
[★ 첨부된 ${imageCount}장의 사진 종합 시각 분석 지침 (※ "1번째 사진", "2번째 사진" 등 사진 번호 지칭 일체 금지)]
- 사용자가 첨부한 ${imageCount}장의 사진 전체를 종합하여, 제품의 외관·구조적 디테일(뚜껑, 입구, 마감, 재질 등)과 실제 사용 과정 및 전후의 변화(오염 제거, 사용감, 편리함 등)를 완벽하게 종합 분석해줘.
- 【절대 불변 원칙: "1번째 사진", "2번째 사진" 등 사진 번호 지칭 일체 금지 (초특급 중요)】:
  * ❌ 절대 금지: "1번째 사진만 보면 평범한데", "2번째 사진 보면 뚜껑이 대박", "첫 번째 사진에서는 ~", "2번째 사진에서 ~"
  * ⭕ 올바른 방식: 사진 번호를 일체 언급하지 않고, 순수하게 사진 속 '내용과 구조적 디테일, 사용 경험'에만 집중하여 글쓴이가 직접 써보고 놀란 1인칭 썰로 녹여낼 것!
  * 모범 예시: "그냥 흔한 세제인 줄 알고 샀다가 뚜껑 열어보고 진심 감탄함... 펌프 줄줄 새서 손 묻고 끈적거리던 거 극혐이었는데 이건 뚜껑 구조부터 손 안 묻게 딱 떨어지네. 이런 사소한 디테일 하나에 살림 짬바 갈리는 거 알지? 치니들 세제 유목민이면 무조건 갈아타라."
- 사진 속 시각 정보를 통해 확인된 '제품의 특징, 구조, 사용감, 극적인 결과'만을 100% 자연스러운 글쓴이의 찐경험 썰로 승화시켜 작성해줘.
`;
    } else {
      mediaGuideline = `
[★ 첨부된 사진 정밀 시각 분석 지침 (※ 사진 언급 절대 금지)]
- 사용자가 첨부한 사진 속 제품, 상황, 구조적 디테일, 색감, 현장 상태를 면밀히 분석해줘.
- 【절대 불변 원칙】: "사진 보면", "첨부된 사진처럼" 같은 사진 메타 언급 없이, 글쓴이가 직접 눈앞에서 제품을 보거나 현장을 겪고 있는 듯한 생생한 1인칭 썰로 작성할 것!
- 사진 속에서 포착된 사실적 디테일(패키지 구조, 질감, 상황)이 본문의 썰에 100% 자연스럽게 녹아들게 해줘.
`;
    }

    imagesForLLM = mediaData.base64List.map((b64) => ({
      data: b64,
      mimeType: mediaData.mimeType || "image/jpeg",
    }));
  }

  const systemPrompt = `너는 Threads(스레드)에서 실제 50만 회 이상 폭발적 조회수와 댓글을 터뜨리는 실전 탑티어 인플루언서야.
${personaPrompt ? `\n[★ 지정된 글쓴이 페르소나 & 역할/말투]\n${personaPrompt}\n반드시 위 페르소나의 상황, 직업, 고민, 독특한 어조를 100% 반영해서 생생한 1인칭 썰로 글을 전개해줘.\n` : ""}
${mediaGuideline}
독자가 피드를 내리다 첫 문장에서 손가락을 멈추고, 끝까지 몰입해 읽은 뒤 무조건 댓글을 달거나 자댓글 링크를 클릭하게 만드는 스레드 포스팅 세트를 작성해줘.

[★ 실전 52만회 & 1.6만회 바이럴 떡상글 벤치마킹 분석]
우리가 실제 터뜨린 베스트 레퍼런스 글의 스타일과 구조를 100% 흡수해서 작성할 것:

■ 레퍼런스 1 (살림/일상 썰 - 조회수 52만 회 터진 글):
"넘더러워서 안올리려고 했는데
추천해준 스치니한테 고마워서 올림

워싱소다 백식초 이런거 다 써봐도 효과 없길래
치니 추천글보고 마지막으로 주문했거든??

물색깔 보고 기절함....
얼마 안쓴건데 이래ㅠㅠ
이거 하니까 바로 수건 쉰내 싹 없어지더라"
(첫 댓글/CTA: "그냥 세탁기안에 넣으면돼 엘지짱짱 [링크]")

■ 레퍼런스 2 (뷰티/가성비템 - 조회수 1.6만 회 터진 글):
"이거 비싼건줄 알았는데;;
가성비템이었다니...

과하지도 않고 엄청 자연스러워
중요한건 버릴색이 1도 없다...
섀도는 이거 하나로 종결 땅땅!"
(첫 댓글/CTA: "엑셀 진짜 강추야... [링크]")

[스레드 실전 떡상글 불변 핵심 원칙 (주인님 표준 규격)]
1. 분량 및 말투:
   - 4~6줄 (모바일 한눈에 꽂히는 분량). 1~2문장마다 반드시 빈 줄(\\n\\n)을 넣어 단락을 띄울 것.
   - 친한 언니 일상 반말 (AI 티 100% 제거, 교과서 문체 및 존댓말 금지).
   - 스레드 날것의 감정 부호(';;', '...', '??', 'ㅠㅠ', '!')와 스치니 호칭 자연스럽게 활용.
2. 상품명/제품명 노출 절대 금지:
   - 본문에는 특정 상품명이나 브랜드명을 절대 쓰지 말고 "이거", "치니 추천템", "가성비템", "이 조합" 등으로만 지칭해 호기심 극대화할 것.
3. 황금 4단계 전개 구조 & 마지막 질문 필수 (대표 글 및 5대 훅 글 5개 모두 공통):
   - 구조: 【멈추게 하기 → 공감 쌓기 → 반전 한 방 → 질문 던지기】
   - [멈추게 하기]: 솔직한 치부 고백, 의외의 착각, 강한 후회 ("넘더러워서 안 올리려다...", "비싼 건 줄 알았는데;;")
   - [공감 쌓기]: 남들 다 해본 뻔한 방법의 실패 경험 ("워싱소다 백식초 다 써봐도 안 되길래", "과하지도 않고 자연스러워")
   - [반전 한 방]: 시각적·감정적 충격과 찐후기 ("물색깔 보고 기절함.... 얼마 안 쓴 건데 이래ㅠㅠ", "버릴 색이 1도 없다...")
   - [질문 던지기]: ★본문의 마지막 문장은 무조건 독자 댓글 참여를 유도하는 질문으로 끝낼 것! ("치니들은 뭐 써??", "솔직히 나만 이럼??", "스치니들도 이런 경험 있음?")
4. 거짓 경험/효과 사건 날조 절대 금지:
   - 내 실제 경험(또는 첨부 미디어)에 없는 과장된 효과나 가짜 사건은 절대 지어내지 말 것.
5. 원문 문장 복제 금지:
   - 참고할 터진 글이나 레퍼런스 문장은 그대로 쓰지 말고, 뼈대(구조/심리)만 차용하여 내 소재에 맞는 새로운 일상 언어로 재창작할 것.
6. 첨부 사진/영상 번호 지칭 절대 금지:
   - 첫 문장(hook), 본문(content), 5대 훅 대안(hookVariants) 어디에도 "1번째 사진", "2번째 사진", "영상 N초" 같은 사진/영상 번호나 프레임 지칭 문구를 절대 쓰지 말 것!
7. 각 글마다 "이 글의 첫 줄이 멈추게 하는 이유" 1줄 필수 설명:
   - 대표 글의 whyHookWorks, 5대 훅 글 5개의 whyItWorks에 각각 "자극한 심리(공감·손해회피·호기심·반전)와 1초 만에 멈추게 하는 이유"를 명확히 1줄로 작성할 것.

[5대 훅 유형별 실전 대안]
1) 자책형: "아 나 진짜 멍청하게 왜 여태...", "넘더러워서 안 올리려고 했는데...", 솔직한 자책과 현실 고백
2) 부정 명령형: "워싱소다 백식초 이런 거 다 소용없더라 제발 사지 마", "비싼 거라고 다 좋은 거 아님;;", 손해 회피
3) 리얼 썰형: "다 써봐도 안 되길래 치니 추천글 보고 주문했거든?? 물색깔 보고 기절함....", 1인칭 리얼 경험담
4) 논쟁형: "솔직히 A vs B 뭐가 맞음?", "수건 쉰내 백식초로 잡힌다는 사람 나와봐;;", 댓글 토론 유발
5) 반전형: "이거 비싼건줄 알았는데;; 가성비템이었다니...", "비싼 거 다 필요 없고 이거 하나로 종결 땅땅!", 상식 파괴

반드시 아래 JSON 규격으로만 응답해:
{
  "topic": "${topic}",
  "hook": "가장 반응 좋은 대표 첫 문장 후킹",
  "hookType": "자책형 | 부정 명령형 | 리얼 썰형 | 논쟁형 | 반전형",
  "whyHookWorks": "이 첫 줄이 피드를 멈추게 하는 이유 1줄 (자극한 심리: 공감·손해회피·호기심·반전)",
  "content": "가독성 빈 줄(\\n\\n)이 포함된 4~6줄 친근한 반말 전체 본문 (hook 포함, 마지막은 질문으로 마무리)",
  "cta": "댓글을 부르는 질문 또는 첫 댓글용 추천 멘트",
  "followUpIdeas": [
    "후속 아이디어 1",
    "후속 아이디어 2",
    "후속 아이디어 3",
    "후속 아이디어 4",
    "후속 아이디어 5"
  ],
  "hookVariants": [
    {
      "type": "자책형",
      "hook": "자책형 첫 문장 훅",
      "whyItWorks": "이 글의 첫 줄이 멈추게 하는 이유 1줄",
      "content": "4~6줄 친한 언니 반말 본문 (빈 줄 \\n\\n 포함, 마지막은 질문으로 마무리)"
    },
    {
      "type": "부정 명령형",
      "hook": "부정 명령형 첫 문장 훅",
      "whyItWorks": "이 글의 첫 줄이 멈추게 하는 이유 1줄",
      "content": "4~6줄 친한 언니 반말 본문 (빈 줄 \\n\\n 포함, 마지막은 질문으로 마무리)"
    },
    {
      "type": "리얼 썰형",
      "hook": "리얼 썰형 첫 문장 훅",
      "whyItWorks": "이 글의 첫 줄이 멈추게 하는 이유 1줄",
      "content": "4~6줄 친한 언니 반말 본문 (빈 줄 \\n\\n 포함, 마지막은 질문으로 마무리)"
    },
    {
      "type": "논쟁형",
      "hook": "논쟁형 첫 문장 훅",
      "whyItWorks": "이 글의 첫 줄이 멈추게 하는 이유 1줄",
      "content": "4~6줄 친한 언니 반말 본문 (빈 줄 \\n\\n 포함, 마지막은 질문으로 마무리)"
    },
    {
      "type": "반전형",
      "hook": "반전형 첫 문장 훅",
      "whyItWorks": "이 글의 첫 줄이 멈추게 하는 이유 1줄",
      "content": "4~6줄 친한 언니 반말 본문 (빈 줄 \\n\\n 포함, 마지막은 질문으로 마무리)"
    }
  ]
}`;

  let userPrompt = `주제: ${topic}`;
  if (templateInput) {
    const tParts: string[] = [];
    if (templateInput.product) tParts.push(`- 연결할 상품/핵심 소재: ${templateInput.product}`);
    if (templateInput.experience) tParts.push(`- 내 실제 경험/상황: ${templateInput.experience}`);
    if (templateInput.targetAudience) tParts.push(`- 타깃 독자: ${templateInput.targetAudience}`);
    if (templateInput.persona) tParts.push(`- 나의 역할/페르소나: ${templateInput.persona}`);
    if (templateInput.benchmarkPost) {
      tParts.push(`- 참고할 터진 글(벤치마킹 뼈대):\n${templateInput.benchmarkPost}\n(위 터진 글을 보고 ① 훅 방식 ② 자극한 심리(공감·손해회피·호기심·반전) ③ 전개 순서(멈추게 하기 → 공감 쌓기 → 반전 한 방 → 질문 던지기) ④ 마지막 질문을 뼈대로 정리하고, 그 뼈대에 내 소재를 넣어 원문 문장은 그대로 쓰지 말고 4~6줄 친한 언니 반말 새 글 5개로 창작할 것)`);
    }
    if (tParts.length > 0) {
      userPrompt += `\n\n[실전 기획 템플릿 입력 정보]\n${tParts.join("\n")}`;
    }
  }
  if (additionalNote) {
    userPrompt += `\n\n추가 요청사항: ${additionalNote}`;
  }
  if (mediaData) {
    const isVideo = mediaData.type === "video";
    userPrompt += `\n\n[첨부 미디어 파일: ${mediaData.fileName} (${isVideo ? "동영상 핵심 프레임" : "사진 이미지"})]\n위 첨부된 시각 자료의 '내용과 디테일'만 종합 분석하여 글 속에 생생하게 녹여내줘. (※ 주의: "1번째 사진", "2번째 사진", "영상 N초" 같은 사진/영상 번호나 프레임 지칭 문구는 절대 쓰지 말고, 순수한 글쓴이의 1인칭 사용 경험 썰로만 작성할 것!)`;
  }
  userPrompt += `\n\n위 정보를 바탕으로 실전 떡상 스타일의 스레드 글 1세트와 5대 훅 유형별 글 5개를 생성해줘.`;

  const rawJson = await callLLM(aiConfig, systemPrompt, userPrompt, imagesForLLM);
  const parsed = parseJsonSafe<any>(rawJson, null);

  const root = parsed?.plan || parsed?.result || parsed?.data || parsed || {};

  const hookVariants: HookVariant[] = Array.isArray(root.hookVariants)
    ? root.hookVariants.map((v: any) => ({
        type: String(v.type || "리얼 썰형"),
        hook: cleanMediaMetaPhrases(String(v.hook || "")),
        whyItWorks: cleanMediaMetaPhrases(String(v.whyItWorks || "호기심과 공감을 자극해 스크롤을 멈춤")),
        content: cleanMediaMetaPhrases(String(v.content || "")),
      }))
    : [];

  return {
    topic: String(root.topic || topic).trim(),
    hook: cleanMediaMetaPhrases(String(root.hook || "솔직히 나만 이런 줄 알았는데 아니더라.")),
    hookType: String(root.hookType || "리얼 썰형").trim(),
    whyHookWorks: cleanMediaMetaPhrases(String(root.whyHookWorks || "일상 속 공감과 호기심을 자극해 1초 만에 스크롤을 멈추게 함")),
    content: cleanMediaMetaPhrases(String(root.content || "스레드 본문이 생성되었습니다.")),
    cta: cleanMediaMetaPhrases(String(root.cta || "여러분은 어떠신가요? 댓글로 알려줘요!")),
    followUpIdeas: Array.isArray(root.followUpIdeas)
      ? root.followUpIdeas.map(String)
      : [
          "같은 주제의 2탄 심화 이야기",
          "초보자가 흔히 저지르는 실수 3가지",
          "실제 적용 후 달라진 변화 후기",
          "댓글 반응 모아보는 Q&A 썰",
          "놓치면 아쉬운 핵심 3줄 요약",
        ],
    hookVariants: hookVariants.length > 0 ? hookVariants : undefined,
  };
}

/**
 * 3. 7종 "다시 써줘" 원클릭 리라이팅
 * 4~6줄 친근한 반말, 제품명 배제, 마지막 열린 질문 원칙 유지
 */
export async function rewriteThreadPlanAI(params: {
  currentPlan: ThreadPlanResult;
  mode: RewriteMode;
  aiConfig: { provider: AIProvider; apiKey: string; model?: string };
}): Promise<ThreadPlanResult> {
  const { currentPlan, mode, aiConfig } = params;

  const modeInstructions: Record<RewriteMode, string> = {
    provocative: "더 자극적으로: 손해 회피와 부정 명령을 극대화하고, 궁금해서 안 읽고는 못 배기게 도발적인 1인칭 톤으로 고쳐줘.",
    natural: "더 자연스럽게: AI 냄새를 100% 제거하고, 친한 친구나 동네 언니에게 카톡으로 털어놓듯 가장 편안하고 리얼한 구어체 반말로 고쳐줘.",
    shorter: "더 짧게: 사족을 전부 쳐내고 핵심만 3~4줄로 군더더기 없이 임팩트 있게 압축해줘.",
    expert: "더 전문적으로: 신뢰도 높은 인사이트와 설득력 있는 시각을 친근한 구어체 안에 담아 논리 정연하게 재구성해줘.",
    funny: "더 웃기게: 피식 웃음이 나오는 위트, 짤방 감성의 유머, 찰진 자조적 드립을 녹여내줘.",
    no_ad: "광고 느낌 빼기: 제품명이나 홍보성 단어를 완전히 지우고, 내돈내산 100% 솔직한 찐경험담 느낌으로 바꿔줘.",
    hooks_only: "후킹 집중 개선: 본문 내용은 유지하되, 첫 문장 후킹(hook)을 1초 만에 뇌리에 꽂히는 5가지 대안 중 가장 파괴력 있는 문장으로 업그레이드해줘.",
  };

  const systemPrompt = `너는 스레드 글을 실전 52만 떡상글 스타일의 맛과 톤으로 완벽하게 변신시키는 리라이팅 전문가야.
기존 스레드 글을 사용자가 선택한 요청에 맞춰 다시 써줘.

[스레드 실전 떡상글 불변 규칙]
1. 4~6줄 내외의 압축적 분량, 모바일 가독성을 위해 1~2문장마다 빈 줄(\\n\\n) 필수
2. 친근한 날것의 일상 반말 (교과서식 설명문, 존댓말 금지)
3. 스레드 감성 부호 적극 활용: ';;', '...', '??', 'ㅠㅠ', '땅땅!' 및 스레드 호칭('스치니', '치니') 자연스럽게 활용
4. 본문 내 특정 상업적 제품명이나 브랜드명 노출 절대 금지 ("이거", "가성비템", "추천글" 등으로만 호기심 유도)
5. 마지막 줄 또는 첫 댓글(CTA)은 독자의 반응/댓글을 부르는 질문 또는 찰진 추천 멘트로 마무리

[리라이팅 요청 사항]
${modeInstructions[mode]}

반드시 아래 JSON 규격으로만 응답해:
{
  "topic": "${currentPlan.topic}",
  "hook": "수정된 첫 문장 후킹",
  "hookType": "${currentPlan.hookType || "리얼 썰형"}",
  "whyHookWorks": "수정된 첫 줄이 피드를 멈추게 하는 이유 1줄",
  "content": "수정된 전체 본문 (4~6줄 가독성 줄바꿈 포함)",
  "cta": "수정된 댓글 유도 열린 질문",
  "followUpIdeas": ${JSON.stringify(currentPlan.followUpIdeas)}
}`;

  const userPrompt = `[기존 글]
첫 문장: ${currentPlan.hook}
본문:
${currentPlan.content}

댓글/질문: ${currentPlan.cta}

위 글을 "${modeInstructions[mode]}" 방향으로 다시 작성해줘.`;

  const rawJson = await callLLM(aiConfig, systemPrompt, userPrompt);
  const parsed = parseJsonSafe<any>(rawJson, null);
  const root = parsed?.plan || parsed?.result || parsed?.data || parsed || {};

  return {
    topic: currentPlan.topic,
    hook: cleanMediaMetaPhrases(String(root.hook || currentPlan.hook)),
    hookType: String(root.hookType || currentPlan.hookType || "리얼 썰형").trim(),
    whyHookWorks: cleanMediaMetaPhrases(String(root.whyHookWorks || currentPlan.whyHookWorks || "호기심과 공감을 자극해 스크롤을 멈춤")),
    content: cleanMediaMetaPhrases(String(root.content || currentPlan.content)),
    cta: cleanMediaMetaPhrases(String(root.cta || currentPlan.cta)),
    followUpIdeas: Array.isArray(root.followUpIdeas) ? root.followUpIdeas.map(String) : currentPlan.followUpIdeas,
    hookVariants: currentPlan.hookVariants,
  };
}

// ======================== LLM Call Core ========================

export function formatAIErrorMessage(err: unknown, provider: AIProvider): string {
  const rawMsg = err instanceof Error ? err.message : String(err);

  // 1. Anthropic Workspace 미지정 키 (sk-ant-usr-... 등) 에러
  if (
    rawMsg.includes("not scoped to a workspace") ||
    rawMsg.includes("anthropic-workspace-id")
  ) {
    return "등록하신 Claude API 키가 워크스페이스에 연결되지 않은 키(sk-ant-usr-...)입니다. Anthropic 콘솔(console.anthropic.com)의 [Workspaces] 메뉴에서 기본 워크스페이스(Default)를 선택한 후 API 키(sk-ant-api03-...)를 새로 발급받아 등록해주세요. (또는 OpenAI / Gemini 키를 등록하시면 즉시 정상 이용하실 수 있습니다.)";
  }

  // 2. 크레딧 부족 / 결제 문제
  if (
    rawMsg.includes("credit balance is too low") ||
    rawMsg.includes("insufficient_quota") ||
    rawMsg.includes("billing_hard_limit_reached") ||
    rawMsg.includes("quota exceeded")
  ) {
    const providerName = provider === "openai" ? "OpenAI" : provider === "anthropic" ? "Anthropic" : "Google";
    return `${providerName} API의 사용 크레딧(잔액)이 부족합니다. 해당 AI 사이트에서 결제 및 크레딧 충전을 확인하시거나 다른 AI(OpenAI, Gemini) 키를 등록해주세요.`;
  }

  // 3. 유효하지 않은 API 키 / 인증 실패
  if (
    rawMsg.includes("invalid_api_key") ||
    rawMsg.includes("Incorrect API key") ||
    rawMsg.includes("authentication_error") ||
    rawMsg.includes("API_KEY_INVALID") ||
    rawMsg.includes("401")
  ) {
    return "등록하신 API 키가 올바르지 않거나 인증에 실패했습니다. 키를 복사할 때 앞뒤 공백이 들어가지 않았는지 확인 후 다시 등록해주세요.";
  }

  // 4. Rate Limit (호출 한도 초과)
  if (rawMsg.includes("rate_limit") || rawMsg.includes("429")) {
    return "AI 호출 한도(Rate Limit)를 일시적으로 초과했습니다. 1~2분 후 다시 시도해주세요.";
  }

  // 5. JSON 파싱 실패 또는 500 계열
  return `AI 글 생성 중 오류가 발생했습니다: ${rawMsg.slice(0, 150)}`;
}

async function callLLM(
  config: { provider: AIProvider; apiKey: string; model?: string },
  systemPrompt: string,
  userPrompt: string,
  images?: { data: string; mimeType: string }[],
): Promise<string> {
  const { provider, apiKey, model } = config;

  try {
    if (provider === "gemini") {
      const genAI = new GoogleGenerativeAI(apiKey);
      const selectedModel = model || "gemini-2.0-flash";
      const geminiModel = genAI.getGenerativeModel({
        model: selectedModel,
        systemInstruction: systemPrompt,
      });

      const parts: any[] = [{ text: userPrompt }];
      if (images && images.length > 0) {
        for (const img of images) {
          parts.push({
            inlineData: {
              data: img.data,
              mimeType: img.mimeType,
            },
          });
        }
      }

      const result = await geminiModel.generateContent({
        contents: [{ role: "user", parts }],
        generationConfig: { responseMimeType: "application/json" },
      });
      return result.response.text();
    }

    if (provider === "anthropic") {
      const anthropic = new Anthropic({ apiKey });
      const selectedModel = model || "claude-sonnet-5";

      let content: any = userPrompt;
      if (images && images.length > 0) {
        const blocks: any[] = [];
        for (const img of images) {
          const safeMime = ["image/jpeg", "image/png", "image/gif", "image/webp"].includes(img.mimeType)
            ? (img.mimeType as any)
            : "image/jpeg";
          blocks.push({
            type: "image",
            source: {
              type: "base64",
              media_type: safeMime,
              data: img.data,
            },
          });
        }
        blocks.push({ type: "text", text: userPrompt });
        content = blocks;
      }

      const res = await anthropic.messages.create({
        model: selectedModel,
        max_tokens: 2000,
        system: systemPrompt,
        messages: [{ role: "user", content }],
      });
      const firstBlock = res.content[0];
      return firstBlock && "text" in firstBlock ? firstBlock.text : "";
    }

    // 기본: OpenAI
    const openai = new OpenAI({ apiKey });
    const selectedModel = model || "gpt-4.1";

    let userContent: any = userPrompt;
    if (images && images.length > 0) {
      const blocks: any[] = [{ type: "text", text: userPrompt }];
      for (const img of images) {
        const mime = img.mimeType || "image/jpeg";
        blocks.push({
          type: "image_url",
          image_url: {
            url: `data:${mime};base64,${img.data}`,
          },
        });
      }
      userContent = blocks;
    }

    const completion = await openai.chat.completions.create({
      model: selectedModel,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
      response_format: { type: "json_object" },
    });
    return completion.choices[0]?.message?.content ?? "";
  } catch (err) {
    throw new Error(formatAIErrorMessage(err, provider));
  }
}

function parseJsonSafe<T>(raw: string, fallback: T): T {
  if (!raw || !raw.trim()) return fallback;
  try {
    const cleaned = raw.replace(/^```json/m, "").replace(/^```/m, "").replace(/```$/m, "").trim();
    return JSON.parse(cleaned) as T;
  } catch {
    try {
      const match = raw.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
      if (match) {
        return JSON.parse(match[0]) as T;
      }
    } catch {
      // ignore
    }
    return fallback;
  }
}
