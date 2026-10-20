// 2026-10-20 병합 D: AI 유튜브 썸네일 프로(seo-thumbnail-pro)의 「대본 → A/B/C SEO 전략」을 서버로 옮긴 것.
// 프롬프트·결과 형식은 프로(src/lib/gemini.ts generateStrategies) 그대로, 호출은 이 앱의 TEXT_MODELS·회원 본인 키(서버)로 바꿨다.
// (프로는 키를 브라우저로 내려보내 브라우저에서 직접 호출했고, 예비 모델에 종료 예정 gemini-1.5-flash가 있었다.)
import "server-only";
import { GoogleGenAI } from "@google/genai";
import { AiError, TEXT_MODELS } from "@/lib/gemini";
import { parseJsonLoose } from "@/lib/tmb/strategy";

export interface SeoStrategy {
  strategy: string;
  title: string;
  description: string;
  tags: string;
  studioTags: string;
  pinnedComment: string;
  visualStrategy: string;
}
export interface SeoComprehensive {
  description: string;
  tags: string;
  keywords: string;
  pinnedComment: string;
}
export interface SeoResult {
  strategies: SeoStrategy[];
  comprehensive: SeoComprehensive;
}

function seoPrompt(script: string): string {
  const year = new Date().getFullYear();
  const [ky, km] = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit" })
    .format(new Date())
    .split("-")
    .map(Number);
  return `
당신은 유튜브 SEO 알고리즘 및 썸네일 클릭률(CTR) 극대화 전문 컨설턴트입니다.
현재 연도는 ${year}년입니다. 과거 연도(2023, 2024년 등)로 후퇴하지 말고 항상 최신 트렌드를 반영하세요.
[기준 시점: 한국 시간으로 지금은 ${ky}년 ${km}월입니다. 계절·시기 표현은 현재 월에 맞추고, 연도·계절은 불필요하게 덧붙이지 마세요.]

아래 유튜브 영상 대본/기획안/아이디어를 분석하여, A/B 테스트를 위한 3가지 차별화된 SEO 전략과 1개의 종합 공통 메타데이터를 작성해주세요.

[입력 콘텐츠]
${script}

[3대 전략 가이드라인]
1. 호기심 유발형 (High CTR): 미스터리, 질문, "왜 그랬을까?", 결말에 대한 궁금증 자극
2. 가치/혜택 중심형 (Value): 시청자가 영상을 보고 얻을 수 있는 핵심 정보, 팁, 실질적 이득 강조
3. 스토리/감성 후킹형 (Story/Connection): 서사적 몰입, 공감대 형성, 극적 상황 연출

반드시 아래 JSON 포맷으로만 응답하세요:
{
  "strategies": [
    {
      "strategy": "호기심 유발형",
      "title": "클릭률을 극대화하는 매력적인 유튜브 제목",
      "description": "영상 핵심과 호기심을 유도하는 300자 내외의 SEO 최적화 설명",
      "tags": "#핵심해시태그 #관련태그 #인기키워드 (5-8개)",
      "studioTags": "유튜브 스튜디오 태그란에 입력할 쉼표로 구분된 키워드 (500자 이내)",
      "pinnedComment": "시청자의 댓글 참여를 폭발시키는 유도 질문이나 소통 멘트",
      "visualStrategy": "썸네일에 배치할 시각적 요소, 인물 구도, 텍스트 배치 연출안"
    },
    ... (총 3개)
  ],
  "comprehensive": {
    "description": "3가지 전략을 모두 아우르는 공통의 포괄적인 영상 설명문",
    "tags": "#공통핵심해시태그1 #공통핵심해시태그2 (10-15개)",
    "keywords": "쉼표로 구분된 필수 핵심 키워드 목록",
    "pinnedComment": "최종 썸네일 선택 후 고정 댓글로 활용할 보완 전략"
  }
}
`;
}

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** AI 응답을 화면에 쓸 형태로 정리한다. 전략이 하나도 없으면 null. */
export function normalizeSeo(raw: unknown): SeoResult | null {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const list = Array.isArray(r.strategies) ? r.strategies : [];
  const strategies = list
    .map((x) => {
      const s = (x && typeof x === "object" ? x : {}) as Record<string, unknown>;
      return {
        strategy: str(s.strategy, 40),
        title: str(s.title, 150),
        description: str(s.description, 2000),
        tags: str(s.tags, 500),
        studioTags: str(s.studioTags, 500),
        pinnedComment: str(s.pinnedComment, 500),
        visualStrategy: str(s.visualStrategy, 600),
      };
    })
    .filter((s) => s.title)
    .slice(0, 3);
  if (!strategies.length) return null;
  const c = (r.comprehensive && typeof r.comprehensive === "object" ? r.comprehensive : {}) as Record<string, unknown>;
  return {
    strategies,
    comprehensive: {
      description: str(c.description, 3000),
      tags: str(c.tags, 600),
      keywords: str(c.keywords, 600),
      pinnedComment: str(c.pinnedComment, 600),
    },
  };
}

/** 대본 → 3가지 SEO 전략. 모델은 이 앱 TEXT_MODELS 순서(쓸 수 없는 모델이면 다음), JSON이 어긋나면 모델당 한 번 더. */
export async function makeSeoStrategies(apiKey: string, script: string): Promise<SeoResult> {
  const ai = new GoogleGenAI({ apiKey });
  let last: unknown;
  for (const model of TEXT_MODELS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await ai.models.generateContent({
          model,
          contents: seoPrompt(script),
          config: { temperature: 0.7, responseMimeType: "application/json" },
        });
        const out = normalizeSeo(parseJsonLoose(res.text));
        if (out) return out;
        last = new AiError("parse");
      } catch (e) {
        last = e;
        const raw = (e instanceof Error ? e.message : String(e ?? "")).toLowerCase();
        if (/not found|\b404\b|is not supported|unsupported model|does not exist/.test(raw)) break;
        if (!(e instanceof AiError)) throw e;
      }
    }
  }
  throw last ?? new AiError("unknown");
}
