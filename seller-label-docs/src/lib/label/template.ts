// 라벨 한 칸에 들어갈 내용 틀. 글에는 「{열 이름}」을 넣어 엑셀 값으로 채운다.
import type { CodeType } from "./barcode";

export interface LabelTemplate {
  kind: "text" | "food";
  text: string;
  fontPt: number;
  align: "left" | "center";
  boldFirst: boolean;
  code: CodeType;
  codeValue: string;
  codePos: "right" | "bottom";
  codeSizeMm: number;
  paddingMm: number;
  food: { label: string; value: string }[];
}

/**
 * 식품 한글표시사항 틀 — 식품의약품안전처 「식품등의 표시기준」의 항목 이름만 담는다(값은 비워 둠).
 * 식품 유형마다 의무 항목이 다르므로 화면에서 「기준을 직접 확인하세요」 안내를 함께 보여 준다.
 */
export const FOOD_FIELDS = [
  "제품명",
  "식품유형",
  "내용량",
  "원재료명 및 함량",
  "알레르기 유발물질",
  "제조원(영업소 명칭·소재지)",
  "판매원",
  "소비기한",
  "보관방법",
  "포장재질",
  "주의사항",
];

export const DEFAULT_TEMPLATE: LabelTemplate = {
  kind: "text",
  text: "{상품명}\n{옵션}\n{가격}원",
  fontPt: 10,
  align: "left",
  boldFirst: true,
  code: "none",
  codeValue: "{바코드}",
  codePos: "right",
  codeSizeMm: 16,
  paddingMm: 2,
  food: FOOD_FIELDS.map((label) => ({ label, value: "" })),
};

export const SAMPLE_HEADERS = ["상품명", "옵션", "가격", "바코드"];
export const SAMPLE_ROWS = [
  ["유기농 사과즙 30포", "선물세트", "29900", "2000000000008"],
  ["제주 감귤 3kg", "가정용", "18900", "2000000000008"],
];
