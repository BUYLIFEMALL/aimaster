import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { ReportSnapshot } from "@/components/report/ReportBody";

// B2 주소 리포트 AI 총평(2026-11-03). 회원 본인 Claude 키로 1회만 부른다(폴백·재시도 없음 — 회원 키 이중 과금 방지).
// 모델은 docs/AI_MODEL_CATALOG.md 「중가 균형」 기본값. 보내는 것은 리포트 숫자·호가뿐(개인정보 없음).
export const REPORT_SUMMARY_MODEL = "claude-sonnet-5-5";

const won = (manwon: number | null | undefined) => (manwon ? `${(manwon / 10000).toLocaleString("ko-KR", { maximumFractionDigits: 2 })}억` : "자료 없음");

export function reportFactsText(title: string, subtitle: string | null, r: ReportSnapshot, askingManwon: number | null): string {
  const assessed = r.assessedPrice === "대상 아님" ? "대상 아님(오피스텔)" : r.assessedPrice ? won(r.assessedPrice / 10000) : "자료 없음";
  const lines = [
    `물건: ${title}${subtitle ? ` (${subtitle})` : ""}`,
    `유형: ${r.type ?? "모름"} · 기간: 최근 ${r.months}개월 국토부 신고 기준`,
    `매매: ${r.sale.count}건, 중간값 ${won(r.sale.median)}, 범위 ${won(r.sale.min)}~${won(r.sale.max)}, 가장 최근 ${won(r.sale.latest?.amount)}${r.sale.latest ? ` (${r.sale.latest.day}, ${r.sale.latest.floor || "-"}층)` : ""}`,
    `월별 매매 중간값: ${r.sale.byMonth.map((m) => `${m.ym} ${won(m.median)}(${m.count}건)`).join(", ") || "없음"}`,
    `전세: ${r.jeonse.count}건, 중간값 ${won(r.jeonse.median)} · 전세가율 ${r.jeonseRatio ?? "-"}% · 월세 ${r.monthlyCount}건`,
    `공동주택 공시가격: ${assessed}`,
    `개별공시지가: ${r.land?.pricePerM2 ? `${r.land.pricePerM2.toLocaleString("ko-KR")}원/㎡` : "자료 없음"} · 용도지역: ${r.land?.zones.join(", ") || "자료 없음"}`,
    r.building
      ? `건물: 사용승인 ${r.building.approvalDay ?? "-"}(약 ${r.building.ageYears ?? "-"}년 차), 용적률 ${r.building.floorAreaRatio ?? "-"}%, 건폐율 ${r.building.coverageRatio ?? "-"}%, 주차 ${r.building.parking ?? "-"}대, 세대 ${r.building.households ?? "-"}, 최고 ${r.building.topFloor ?? "-"}층`
      : "건물: 자료 없음",
    ...(r.nonres
      ? [
          `상가·건물(최근 ${r.nonres.buildingMonths}개월): 같은 지번 거래 ${r.nonres.sameLot.length}건${r.nonres.sameLot[0] ? `(최근 ${won(r.nonres.sameLot[0].amount)}, ${r.nonres.sameLot[0].category})` : ""}, 같은 동 용도별 ${r.nonres.buildingGroups.slice(0, 4).map((g) => `${g.label} ${g.count}건 평당 ${g.median ? `${Math.round(g.median).toLocaleString("ko-KR")}만` : "표본 부족"}`).join(", ") || "없음"}`,
          `토지(최근 ${r.nonres.landMonths}개월): ${r.nonres.landGroups.slice(0, 4).map((g) => `${g.label}(${g.scope}) ${g.count}건 평당 ${g.median ? `${Math.round(g.median).toLocaleString("ko-KR")}만` : "표본 부족"}`).join(", ") || "없음"}`,
        ]
      : []),
    `회원이 아는 호가: ${askingManwon ? won(askingManwon) : "입력 안 함"}`,
  ];
  return lines.join("\n");
}

export async function summarizeReport(apiKey: string, factsText: string): Promise<string> {
  const year = new Date().getFullYear();
  const client = new Anthropic({ apiKey, timeout: 60_000, maxRetries: 0 });
  const res = await client.messages.create({
    model: REPORT_SUMMARY_MODEL,
    max_tokens: 1500,
    system:
      `당신은 한국 부동산 공공 자료를 읽어 주는 분석 보조입니다. 현재 연도는 ${year}년입니다. 모든 연도 표기와 판단은 ${year}년 기준으로 하고 과거 연도를 현재처럼 쓰지 마세요.\n` +
      "주어진 숫자만 근거로 쓰고, 자료에 없는 사실(개발 호재·학군·시세 전망 등)을 지어내지 마세요.\n" +
      "투자 권유, 매수·매도 추천, 수익이나 가격 상승 단정, 「급매」 「신고가」 같은 표현은 쓰지 마세요.\n" +
      "쉬운 한국어 존댓말로, 아래 세 제목을 그대로 쓰고 각 제목 아래 2~4줄의 「- 」 목록으로 답하세요. 다른 머리말·맺음말은 쓰지 마세요.\n" +
      "■ 자료로 확인된 것\n■ 해석(추정)\n■ 현장·서류로 더 확인할 것",
    messages: [{ role: "user", content: `<report>\n${factsText}\n</report>` }],
  });
  if (res.stop_reason === "refusal") throw new Error("AI가 이 요청을 처리하지 않았습니다.");
  const text = res.content
    .filter((b) => b.type === "text")
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("\n")
    .trim();
  if (!text) throw new Error("AI 응답이 비었습니다.");
  return text;
}
