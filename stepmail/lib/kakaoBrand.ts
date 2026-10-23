import "server-only";
import { SolapiMessageService } from "solapi";

// 2026-10-23 v1.28 카카오 브랜드 메시지(옛 친구톡) 발송 — Step Mail 전용.
// 회원 본인 SOLAPI 계정 + 본인 카카오 채널(pfId)로만 보낸다. pfId가 없으면 보내지 않는다(운영자 채널로 대신 보내지 않음).
// Step Mail은 광고성 메시지라 adFlag=true(카카오가 광고 표시). 받는 사람은 그 채널을 친구로 추가한 고객이며,
// 친구가 아니라 실패하면 fallbackSms=true일 때만 SOLAPI가 같은 문구로 문자(SMS·LMS) 대체 발송한다(disableSms=false).
// 공용 사본 lib/solapi/client.ts(booking-reminder와 같음)는 고치지 않으려고 따로 둔다.

export interface KakaoBrandAccount {
  api_key: string;
  api_secret: string;
  sender_phone: string;
  kakao_pf_id: string | null;
}

export async function sendKakaoBrandMessage(
  account: KakaoBrandAccount,
  to: string,
  text: string,
  options: { fallbackSms: boolean },
): Promise<void> {
  if (!account.kakao_pf_id) throw new Error("본인 카카오 채널 ID(pfId)가 등록되어 있지 않습니다.");
  const service = new SolapiMessageService(account.api_key, account.api_secret);
  await service.send({
    to,
    from: account.sender_phone,
    type: "CTA",
    text,
    kakaoOptions: {
      pfId: account.kakao_pf_id,
      adFlag: true,
      disableSms: !options.fallbackSms,
    },
  });
}
