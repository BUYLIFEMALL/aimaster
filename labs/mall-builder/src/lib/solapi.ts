// 솔라피 문자 보내기·잔액 조회 — 공용 기준 코드 「solapi-client」(기준 crm-google-form/lib/solapi/client.ts)에서
// 문자·잔액 부분만 가져왔다. Lab은 독립 프로그램이라 사본 등록부 밖이며, 키는 몰 운영자 본인 솔라피 계정 것만 쓴다.
// 서명(HMAC)은 공식 SDK(solapi)가 처리한다. 서버 동작·실행 주소에서만 불러온다(화면 코드에서 불러오지 않음).
import { SolapiMessageService } from "solapi";
import type { Credentials } from "./notify";

export async function sendSms(creds: Credentials, to: string, text: string): Promise<void> {
  const service = new SolapiMessageService(creds.api_key, creds.api_secret);
  await service.send({ to, from: creds.sender_phone, text });
}

export async function getBalance(creds: Pick<Credentials, "api_key" | "api_secret">): Promise<{ balance: number; point: number }> {
  const service = new SolapiMessageService(creds.api_key, creds.api_secret);
  const r = await service.getBalance();
  return { balance: Number(r.balance ?? 0), point: Number(r.point ?? 0) };
}
