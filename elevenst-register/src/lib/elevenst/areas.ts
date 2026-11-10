import { pickTag } from "./xml.ts";

// 11번가 출고지·반품/교환지 주소 조회 응답 읽기 — 명세 예시(OPEN API 센터 배송 가이드, docs/API_SPEC_NOTES.md §3):
// <ns2:inOutAddresss><ns2:inOutAddress><addr/><addrNm/><addrSeq/>…</ns2:inOutAddress><ns2:result_message>SUCCESS</ns2:result_message></ns2:inOutAddresss>

export interface Area {
  seq: string; // 상품 등록 때 addrSeqOut / addrSeqIn 에 넣는 주소 순번
  name: string;
  addr: string;
}

export function parseAreas(xml: string): { areas: Area[]; resultMessage: string } {
  const blocks = xml.match(/<(?:[\w-]+:)?inOutAddress(?:\s[^>]*)?>[\s\S]*?<\/(?:[\w-]+:)?inOutAddress>/g) ?? [];
  const areas = blocks
    .map((b) => ({ seq: pickTag(b, "addrSeq"), name: pickTag(b, "addrNm") || pickTag(b, "rcvrNm"), addr: pickTag(b, "addr") }))
    .filter((a) => a.seq);
  return { areas, resultMessage: pickTag(xml, "result_message") };
}
