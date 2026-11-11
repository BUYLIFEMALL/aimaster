import { pickTag } from "./xml.ts";

// 11번가 발송마감 템플릿 조회 `GET /rest/prodservices/sendCloseList` 응답 읽기(명세 2026-11-11 확인, 배송 가이드 apiSeq=6735):
// <productInformationTemplateList><templateBOList><prdInfoTmpltNm/><prdInfoTmpltNo/><sendClfCd/>…</templateBOList>…</productInformationTemplateList>
// 상품 등록 칸 dlvSendCloseTmpltNo 에 prdInfoTmpltNo 를 넣는다.

export interface SendCloseTemplate {
  no: string;
  name: string;
  kind: string; // 01 일반발송 · 02 오늘발송 · 03 재고확인 후 순차발송
}


export function parseSendCloseTemplates(xml: string): SendCloseTemplate[] {
  const blocks = xml.match(/<(?:[\w-]+:)?templateBOList(?:\s[^>]*)?>[\s\S]*?<\/(?:[\w-]+:)?templateBOList>/g) ?? [];
  return blocks.map((b) => ({ no: pickTag(b, "prdInfoTmpltNo"), name: pickTag(b, "prdInfoTmpltNm"), kind: pickTag(b, "sendClfCd") })).filter((t) => t.no);
}
