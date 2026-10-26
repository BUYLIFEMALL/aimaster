import type { Database } from "@/types/database.types";
import { COPY_TONES, type CopyTone } from "@/lib/detailBlocks";

type Product = Database["public"]["Tables"]["shop_products"]["Row"];

// v1.37(E3, 2026-10-26): 상품 문구 말투 5종 — 원본(PROHUB 카피라이팅 생성기)의 「톤 선택·블록별 복사」 아이디어만 가져왔다.
// 원본의 「데이터형(누적판매·만족도·임상 수치)」「긴급(한정·오늘만)」 톤과 지어낸 구매 후기는 기만 광고 위험이라 만들지 않는다.

/** 근거로 허용할 상품 정보 글(공백 제거) — 결과에서 위험 문장을 거를 때 「상품 정보에 실제로 있는 말」 확인용 */
export function productFacts(p: Product): string {
  return [p.name, p.product_label, p.category, p.key_features, p.specs, p.how_to_use, p.target_customer, p.sale_price != null ? String(p.sale_price) : ""]
    .filter(Boolean).join(" ").replace(/\s+/g, "");
}

export function buildCopyPrompt(p: Product, tone: CopyTone): string {
  const year = new Date().getFullYear();
  const price = (v: number | null) => (v != null ? `${v.toLocaleString()}${p.currency ?? "원"}` : "미입력");
  const hasSale = p.sale_price != null;
  return `당신은 한국 온라인 쇼핑몰(스마트스토어·쿠팡) 상품 카피라이터입니다. (기준 연도: ${year}년 — 연도가 필요하면 ${year}년만 쓰세요.)
아래 상품의 판매 문구를 「${COPY_TONES[tone].label}」 말투(${COPY_TONES[tone].hint})로 쓰세요.

# 반드시 지킬 규칙
1. JSON 한 개만 출력: {"names":["상품명 후보1","후보2","후보3"],"oneLine":"한 줄 소개(40자 안팎)","body":"상세 본문(3~5문장)","sns":["SNS 문구1(해시태그 3~5개 포함)","SNS 문구2"]}
2. **상품 정보에 없는 판매량·만족도·후기·별점·재구매율·임상·인증·특허·순위·수상을 쓰지 마세요.** 지어낸 숫자 금지 — 수치는 아래 스펙에 있는 것만.
3. **「한정 수량」「오늘만」「마감 임박」「품절 임박」「재입고」 같은 재촉 문구 금지.**
4. ${hasSale ? `할인가(${price(p.sale_price)})는 그대로만 언급할 수 있습니다.` : "할인가가 없으므로 가격·할인·특가·이벤트·사은품 문구를 쓰지 마세요."}
5. 의학적 효능·질병 치료·예방 표현 금지. 상품명 후보는 마켓 상품명 규칙에 맞게 50자 안, 특수문자 남발 금지.

# 상품 정보
- 상품명: ${p.name ?? p.product_label ?? "미입력"}
- 카테고리: ${p.category ?? "미입력"}
- 정상가: ${price(p.price)} / 할인가: ${price(p.sale_price)}
- 핵심 특징:
${p.key_features ?? "미입력"}
- 상세 스펙:
${p.specs ?? "미입력"}
- 사용 방법:
${p.how_to_use ?? "미입력"}
- 타겟 고객: ${p.target_customer ?? "미입력"}`;
}
