// D29 AI 상품 등록 도우미 — 응답 형식·프롬프트·정리(node --test 대상, DB·SDK 없음)
// 확장자(.ts)까지 적는다 — `node --test`가 이 파일을 바로 읽기 때문

import { z } from "zod";

export const ProductDraftSchema = z.object({
  name: z.string().describe("상품 이름(검색에 잘 걸리게, 100자 이내)"),
  summary: z.string().describe("목록에 보일 한 줄 소개(80자 안팎)"),
  description: z.string().describe("상세 설명(일반 글, 줄바꿈으로 단락 구분, HTML 금지)"),
  options: z.array(z.object({ name: z.string(), values: z.array(z.string()) })).describe("옵션 후보 묶음(없으면 빈 배열)"),
  cautions: z.array(z.string()).describe("운영자가 꼭 확인할 것(메모·사진만으로 확실하지 않은 내용)"),
});
export type ProductDraft = z.infer<typeof ProductDraftSchema>;

export const MAX_MEMO = 2000;

export function buildProductPrompt(input: { memo: string; storeName: string; categoryNames: string[]; hasImage: boolean; year: number }) {
  const system = [
    "당신은 한국 온라인 쇼핑몰(사업자 도매·소매 겸용)의 상품 등록 도우미입니다.",
    `[기준 연도 엄수: 현재 연도는 ${input.year}년입니다. 연도를 쓸 때는 ${input.year}년 기준으로 쓰고 과거 연도로 퇴행하지 마세요.]`,
    "운영자가 준 메모와 사진에 있는 사실만 씁니다. 메모·사진에 없는 수치(용량·무게·치수)·성분·인증·원산지·효능은 지어내지 말고, 필요하면 cautions에 「확인 필요」로 적습니다.",
    "의학적 효능, 최고·유일·1위 같은 단정, 다른 회사 상표를 쓰지 않습니다.",
    "name: 핵심 품목명이 앞에 오게 100자 이내. summary: 80자 안팎 한 문장.",
    "description: 일반 글로 3~6단락(특징 → 쓰임새 → 규격·구성 → 보관·주의). 줄바꿈으로 단락을 나누고 HTML·마크다운 기호를 쓰지 않습니다. 1500자 이내.",
    "options: 메모나 사진에 색상·크기·용량 같은 선택지가 보일 때만 0~3묶음. 없으면 빈 배열.",
  ].join("\n");
  const user = [
    `쇼핑몰: ${input.storeName}`,
    input.categoryNames.length ? `이 몰의 카테고리: ${input.categoryNames.slice(0, 40).join(", ")}` : "",
    input.hasImage ? "첨부한 사진은 이 상품의 대표 사진입니다." : "사진은 없습니다.",
    "운영자 메모:",
    input.memo.slice(0, MAX_MEMO),
  ]
    .filter(Boolean)
    .join("\n");
  return { system, user };
}

const clip = (s: unknown, n: number) => (typeof s === "string" ? s.replace(/\r\n/g, "\n").trim().slice(0, n) : "");

/** 칸 길이·옵션 개수 맞추기(저장은 운영자가 하므로 여기서는 화면에 넣을 값만 정리) */
export function cleanDraft(d: ProductDraft): ProductDraft {
  const options = (d.options ?? [])
    .map((g) => ({ name: clip(g.name, 20), values: [...new Set((g.values ?? []).map((v) => clip(v, 30)).filter(Boolean))].slice(0, 20) }))
    .filter((g) => g.name && g.values.length >= 2)
    .slice(0, 3);
  return {
    name: clip(d.name, 100),
    summary: clip(d.summary, 200),
    description: clip(d.description, 5000).replace(/<[^>]*>/g, "").replace(/\n{3,}/g, "\n\n"),
    options,
    cautions: (d.cautions ?? []).map((c) => clip(c, 120)).filter(Boolean).slice(0, 8),
  };
}

/** 대표 사진 주소는 이 서비스 저장소 공개 주소만(다른 곳 주소를 AI에 넘기지 않음) */
export function isOwnImageUrl(url: unknown, supabaseUrl: string | undefined): url is string {
  if (typeof url !== "string" || !supabaseUrl) return false;
  const base = supabaseUrl.replace(/\/+$/, "") + "/storage/v1/object/public/";
  return url.startsWith(base) && url.length < 1000 && !url.includes("..");
}
