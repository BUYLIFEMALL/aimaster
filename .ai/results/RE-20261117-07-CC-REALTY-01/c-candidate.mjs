// RE-20261117-07 후보 C — 「확실히 무관할 때만 뺀다」(분석 전용 순수 함수, 운영 코드 아님)
// 규칙: 아래 세 조건을 모두 만족할 때만 제외하고, 그 밖의 경우(애매함 포함)는 모두 유지한다.
//   1. 제목에 부동산 낱말(TITLE_WORDS)이 하나도 없다.
//   2. 요약 안에 지역 이름이 든 문장이 하나 이상 있다(없으면 판단 근거가 없으므로 유지).
//   3. 지역 이름이 든 문장이 전부 「행사 장소 문장」이다 — 장소 표현(VENUE)이 있고 강한 부동산 낱말(STRONG)이 없다.
// 낱말표는 RE-20261117-06 B′의 STRONG·TITLE_WORDS를 그대로 옮겼다(바꾸지 않음). 새로 정한 것은 VENUE 하나다.

export const PARAMS = Object.freeze({
  STRONG: Object.freeze(["재건축", "재개발", "재초환", "부담금", "분양", "청약", "집값", "아파트값", "시세", "매매", "거래", "호가", "낙폭", "하락", "상승",
    "정비", "토지거래허가", "토허", "규제지역", "조정대상", "투기과열", "리모델링", "입주", "착공", "준공", "용적률"]),
  TITLE_EXTRA: Object.freeze(["아파트", "부동산", "주택", "전세", "월세", "임대", "오피스텔", "단지", "가구", "세대", "평형", "국평", "급매", "매물", "조합", "공급", "분양가", "개발",
    "전셋값", "세입자", "역세권", "노선", "정거장", "GTX", "학군", "학령", "학급", "개교"]),
  // 지역 이름이 「일이 벌어진 장소」로만 쓰였음을 보여 주는 표현
  VENUE: Object.freeze(["에서 열린", "에서 열렸", "에서 열리는", "에서 진행", "기자간담회", "기자회견", "간담회", "캠페인", "빈소", "장례식장", "전시", "공연", "관측소",
    "본사에서", "사옥", "법회", "집회", "결의대회", "기념관", "기념행사", "발대식", "시민들이", "사진=", "newsis.com"]),
});

export const titleWords = () => [...PARAMS.STRONG, ...PARAMS.TITLE_EXTRA];

export function regionTokens(sgg) {
  const last = String(sgg).split(" ").pop();
  return [last, last.replace(/(구|시|군)$/, "")].filter((t) => t.length >= 2);
}

export function splitSentences(text) {
  return String(text || "").split(/(?<=[.!?…])\s+|\.\.\./).map((s) => s.trim()).filter(Boolean);
}

/** 반환: { decision: "keep" | "drop", reason } */
export function decideC({ sgg, title, snippet }) {
  if (titleWords().some((w) => String(title).includes(w))) return { decision: "keep", reason: "제목 부동산 낱말" };
  const toks = regionTokens(sgg);
  const regional = splitSentences(snippet).filter((s) => toks.some((t) => s.includes(t)));
  if (regional.length === 0) return { decision: "keep", reason: "지역 문장 없음(근거 부족)" };
  const allVenue = regional.every((s) => PARAMS.VENUE.some((v) => s.includes(v)) && !PARAMS.STRONG.some((w) => s.includes(w)));
  return allVenue ? { decision: "drop", reason: "지역이 행사 장소로만 쓰임" } : { decision: "keep", reason: "지역 문장이 장소 표현만은 아님" };
}
