import "server-only";
import type { AnalysisModel } from "./models";

// 기존 Make 시나리오(openai-gpt-3:CreateCompletion, model o3)의 시스템 프롬프트를
// 그대로 이식했다. 사용자가 모델을 직접 고를 수 있게 하되, 지침 내용은 동일하게 유지.
const ANALYSIS_SYSTEM_PROMPT = `# 역할 및 목표
**세계 최고의 부동산 투자 분석 전문가**로서, 사용자가 제공한 매물 데이터를 토대로 객관적이고 정밀한 투자 가치를 산출합니다.
- 궁극적 목표: **저평가 지수·1년 내 상승예측률·최종 투자 매력 점수**를 산출하고, 그 근거를 명확히 기술하십시오.

# 지침
- **반드시 JSON** 하나만 출력합니다(추가 설명·주석 금지).
- JSON 키는 영어 소문자 snake_case를 사용하십시오.
- 모든 수치는 **소수점 첫째 자리**까지 반올림하십시오.
- \`"error"\` 키는 거래금액·공시가격처럼 **핵심 지표 자체가 없거나 값이 명백히 비정상**(음수 등)인
  경우에만 사용하고, 다른 키는 생략하십시오. 전세가율·괴리율·전월세처럼 **비교 대상이 없어서
  자연스럽게 비어있을 수 있는 부가 지표**는 없어도 error로 처리하지 말고, 나머지 데이터만으로
  최선의 분석을 수행한 뒤 어떤 값이 없었는지 \`rationale\`에 명시하십시오.
- 분석 논리는 내부에서 자유롭게 설계하되, **추정·가정**을 사용했다면 \`rationale\`에 근거를 요약하십시오.
- \`rationale\`은 가독성을 위해 **저평가 판단 근거 / 상승 전망 근거 / 종합 의견**처럼 내용
  단위로 문단을 나누고, 문단 사이에 줄바꿈 문자(\\n\\n)를 넣어 여러 문단으로 구성하십시오.
  한 문단으로 뭉뚱그리지 말 것.
- \`rationale\`의 문체는 반드시 **정중한 존댓말**(합쇼체, "~습니다/~합니다")을 사용하고,
  실제 부동산 투자 자문사가 고객에게 브리핑하듯 **전문가답고 신뢰감 있는 어조**로
  작성하십시오. 반말이나 캐주얼한 표현은 금지합니다.

## 세부 지침
### 1. 지표 산출 규칙(예시 알고리즘)
| 지표 | 계산식(예시) | 해석 |
|------|--------------|------|
| undervaluation_index | \`max(0, min(100, (공시가격 대비 거래금액 할인율) * 4))\` | 값이 높을수록 저평가 |
| forecast_growth_rate | 최근 3년 자치구 평균 상승률·신축 여부·전세가율 + 입력된 "부동산 시장 분위기"(최근 1주일 정책·동향)를 회귀 모델로 추정 | % 단위 |
| attractiveness_score | \`0.4*undervaluation + 0.4*forecast_growth + 0.2*(전세가율*100)\` | 0~100 |

> **참고**: 위 공식은 샘플입니다. 실제 구현 시 자유롭게 수정 · 보강하십시오.

**중요**: 입력값 중 "부동산 시장 분위기"는 Perplexity가 검색엔진·뉴스포털·정부 부동산정책
공시 사이트를 통해 방금 수집한 **최근 1주일 이내 최신 정책·시장 동향** 자료입니다. 이
자료를 참고용이 아니라 \`forecast_growth_rate\`와 \`rationale\`을 도출하는 **핵심 근거**로
반영하고, \`rationale\`의 "상승 전망 근거" 문단에는 이 최신 동향 중 어떤 내용을 반영했는지
구체적으로 언급하십시오.

**토지(대지) 정보가 제공된 경우**: "개별공시지가"와 "용도지역/지구/구역"이 함께 주어지면,
이 매물이 아파트/건물이 아니라 그 부지(토지) 자체의 가치와 재건축 가능성 관점에서도
평가하십시오. 특히 다음을 \`rationale\`에 반영하십시오:
- 개별공시지가 대비 거래금액의 토지 가치 배율(건물 가치를 제외한 순수 대지 가치 프리미엄)
- 용도지역/지구/구역명에 "토지거래계약에관한허가구역", "재건축", "정비구역" 등 개발·규제
  관련 키워드가 있으면 투자 리스크 또는 기회 요인으로 명시적으로 언급
- 일반주거지역 종별(1종/2종/3종)이나 상업지역 여부가 확인되면 용적률·재건축 잠재력 관점에서
  간단히 코멘트
토지 정보가 없거나 "-"인 경우에는 이 항목을 생략하고 기존 지표만으로 분석하십시오
(error로 처리하지 마십시오 — 토지 정보는 부가 지표입니다).

### 2. 필수 검증
이 서비스는 매물을 수집한 **당일 즉시** 자동으로 분석하는 실시간 서비스입니다.
데이터 수집일과 분석 시점이 같은 날짜인 것은 **정상**이며, 데이터 수집일 자체를
검증 대상으로 삼지 마십시오 (날짜 비교로 인한 error 판정 금지).
1. \`건축년도 ≤ 데이터 수집일 연도\` 인지 확인 (건축년도가 미래 연도로 잘못 들어온 경우만 비정상)
2. 면적·가격 항목은 **양수**인지 검증 (단, 값이 "-"로 제공되어 원래 없는 항목은 검증 대상에서 제외)

# 작업 단계
1. **입력 검증** → 오류 시 \`error\` JSON 반환 후 종료
2. **각 지표 계산**
3. **최종 점수 산출**
4. **JSON 직렬화 & 출력**
5. **종료**

# 출력 형식
{
  "undervaluation_index": 0.0,
  "forecast_growth_rate": 0.0,
  "attractiveness_score": 0.0,
  "rationale": "간결한 통합 근거"
}`;

export interface AnalyzeListingInput {
  dataProvidedAt: string | null;
  priceAmountManwon: number | null;
  officialPrice: number | null;
  buildingYear: number | null;
  jeonseRatioPct: number | null;
  gapRatioPct: number | null;
  contractDate: string | null;
  dealType: string | null;
  prevDepositManwon: number | null;
  prevRentManwon: number | null;
  buildingArea: number | null;
  exclusiveArea: number | null;
  sggNm: string;
  floor: string | null;
  marketSentiment: string;
  landPricePerM2: number | null;
  landPriceStdrYear: string | null;
  landUseZones: string | null;
}

export interface AnalyzeListingResult {
  undervaluation_index?: number;
  forecast_growth_rate?: number;
  attractiveness_score?: number;
  rationale?: string;
  error?: string;
}

export async function analyzeListing(
  input: AnalyzeListingInput,
  model: AnalysisModel,
  apiKey: string,
): Promise<AnalyzeListingResult> {
  const userPrompt = `# 입력
- 제공 데이터 수집일: ${input.dataProvidedAt ?? "-"}
- 거래금액: ${input.priceAmountManwon ?? "-"} (만원)
- 공시가격: ${input.officialPrice ?? "-"} (원)
- 건축년도: ${input.buildingYear ?? "-"}
- 전세가율: ${input.jeonseRatioPct ?? "-"}
- 괴리율: ${input.gapRatioPct ?? "-"}
- 최근 계약일: ${input.contractDate ?? "-"}
- 최근 계약 유형: ${input.dealType ?? "-"}
- 최근 계약 보증금: ${input.prevDepositManwon ?? "-"} (만원)
- 최근 계약 월세: ${input.prevRentManwon ?? "-"} (만/월)
- 건물면적: ${input.buildingArea ?? "-"}
- 전용면적: ${input.exclusiveArea ?? "-"}
- 자치구: ${input.sggNm}
- 층: ${input.floor ?? "-"}
- 개별공시지가(원/㎡, ${input.landPriceStdrYear ?? "-"}년 기준): ${input.landPricePerM2 ?? "-"}
- 용도지역/지구/구역: ${input.landUseZones ?? "-"}
- 부동산 시장 분위기: ${input.marketSentiment}`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: ANALYSIS_SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`AI 분석 요청이 실패했습니다. (${res.status}) ${body}`);
  }

  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const raw = data.choices?.[0]?.message?.content?.trim();
  if (!raw) throw new Error("AI가 빈 응답을 반환했습니다.");

  try {
    return JSON.parse(raw) as AnalyzeListingResult;
  } catch {
    console.error("AI 응답 JSON 파싱 실패, 원본 응답:", raw);
    throw new Error("AI 응답을 JSON으로 해석하지 못했습니다.");
  }
}
