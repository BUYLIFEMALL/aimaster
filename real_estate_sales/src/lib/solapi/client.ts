import "server-only";
import { SolapiMessageService } from "solapi";

// SOLAPI 공식 Node.js SDK(solapi 패키지)를 감싼 얇은 래퍼 — crm-google-form/trending-product-finder의
// lib/solapi/client.ts와 동일한 코드를 그대로 재사용한다. HMAC-SHA256 서명/인증은 SDK가 전부
// 처리한다(직접 구현하지 않음, https://solapi.com/developers 참고).
//
// 카카오 친구톡(CTA)은 2026-01-01부로 SOLAPI가 서버 측에서 자동으로 "브랜드 메시지"로
// 대체 발송한다 — 개발자가 쓰는 kakaoOptions/type:"CTA" 코드는 그대로 유지해도 된다.

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

/**
 * 카카오 알림톡. 사전 승인된 템플릿으로만 발송 가능하며, 친구톡과 달리 채널 친구가
 * 아닌 수신자에게도 발송할 수 있다(정보성 메시지 — 새 실거래 알림 용도).
 */
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
 * 카카오 친구톡(자유형). type:"CTA"로 명시한다 — 2026-01-01부로 SOLAPI가 서버에서 자동으로
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

export async function getBalance(account: Pick<SolapiAccountCredentials, "api_key" | "api_secret">) {
  const service = createService(account);
  return service.getBalance();
}
