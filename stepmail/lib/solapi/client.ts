import "server-only";
import { SolapiMessageService } from "solapi";

// SOLAPI 공식 Node.js SDK(solapi 패키지)를 감싼 얇은 래퍼. HMAC-SHA256 서명/인증은
// SDK가 전부 처리한다 — 우리가 직접 구현하지 않는다(https://solapi.com/developers 참고,
// 2026-08-18 확인).
//
// 카카오 친구톡(CTA)은 2026-01-01부로 SOLAPI가 서버 측에서 자동으로 "브랜드 메시지"로
// 대체 발송한다 — 개발자가 쓰는 kakaoOptions/type:"CTA" 코드는 그대로 유지해도 된다
// (SOLAPI 공지 https://solapi.com/notices/notices-2025-12-04).

export interface SolapiAccountCredentials {
  api_key: string;
  api_secret: string;
  sender_phone: string;
  kakao_pf_id: string | null;
  rcs_brand_id: string | null;
}

function createService(account: Pick<SolapiAccountCredentials, "api_key" | "api_secret">) {
  return new SolapiMessageService(account.api_key, account.api_secret);
}

export async function sendSms(account: SolapiAccountCredentials, to: string, text: string): Promise<void> {
  const service = createService(account);
  await service.send({
    to,
    from: account.sender_phone,
    text,
  });
}

export async function sendAlimtalk(
  account: SolapiAccountCredentials,
  to: string,
  params: { templateId: string; variables: Record<string, string> },
): Promise<void> {
  if (!account.kakao_pf_id) throw new Error("카카오 채널 ID(pfId)가 등록되어 있지 않습니다.");
  const service = createService(account);
  await service.send({
    to,
    from: account.sender_phone,
    kakaoOptions: {
      pfId: account.kakao_pf_id,
      templateId: params.templateId,
      variables: params.variables,
    },
  });
}

/**
 * 카카오 친구톡. type:"CTA"로 명시한다 — 2026-01-01부로 SOLAPI가 서버에서 자동으로
 * 브랜드 메시지(자유형)로 대체 발송하지만, 요청 필드 자체는 바뀌지 않는다.
 */
export async function sendFriendtalk(account: SolapiAccountCredentials, to: string, text: string): Promise<void> {
  if (!account.kakao_pf_id) throw new Error("카카오 채널 ID(pfId)가 등록되어 있지 않습니다.");
  const service = createService(account);
  await service.send({
    to,
    from: account.sender_phone,
    type: "CTA",
    text,
    kakaoOptions: {
      pfId: account.kakao_pf_id,
      adFlag: false,
    },
  });
}

/**
 * RCS(3세대 문자) 프로모션 메시지. 브랜드 인증(rcs_brand_id)이 SOLAPI 콘솔에서 사전 승인돼
 * 있어야 발송 가능하다. 짧은 문구는 RCS_SMS, 긴 문구는 RCS_LMS로 자동 분기한다(일반 SMS의
 * 45자 기준을 그대로 따름).
 */
export async function sendRcs(
  account: SolapiAccountCredentials,
  to: string,
  text: string,
  params?: { imageId?: string; buttons?: { buttonName: string; buttonType: "WL"; link: string }[] },
): Promise<void> {
  if (!account.rcs_brand_id) throw new Error("RCS 브랜드 인증 ID(brandId)가 등록되어 있지 않습니다.");
  const service = createService(account);
  const isLong = Array.from(text).length > 45;
  await service.send({
    to,
    from: account.sender_phone,
    type: isLong ? "RCS_LMS" : "RCS_SMS",
    text,
    rcsOptions: {
      brandId: account.rcs_brand_id,
      mmsType: params?.imageId ? "M4" : undefined,
      buttons: params?.buttons,
    },
  });
}

export async function getBalance(account: Pick<SolapiAccountCredentials, "api_key" | "api_secret">) {
  const service = createService(account);
  return service.getBalance();
}
