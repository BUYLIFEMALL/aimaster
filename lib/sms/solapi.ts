import "server-only";
import { SolapiMessageService } from "solapi";
import { createServiceClient } from "@/lib/supabase/server";

// 문자(SMS) 발송 — 2026-10-19 비밀번호 찾기 문자 인증용으로 추가.
// 발송은 다른 프로그램(crm-google-form/lib/solapi/client.ts 등)과 같이 공식 SDK(solapi 패키지)를 쓴다.
// 비밀번호 찾기는 회원이 로그인하기 전에 쓰는 사이트 기본 기능이라 회원 본인 계정을 쓸 수 없으므로,
// 운영자(관리자 buylifemall@gmail.com)가 공용 테이블 user_solapi_accounts 에 등록해 둔 솔라피 계정으로 보낸다
// (주인님 확정 2026-10-19, docs/TOP_RULE_PERSONAL_ACCOUNT_API.md §8). 회원 자동화 기능에는 쓰지 않는다.
const OPERATOR_EMAIL = "buylifemall@gmail.com";

type OperatorAccount = { api_key: string; api_secret: string; sender_phone: string };

async function getOperatorAccount(): Promise<OperatorAccount | null> {
  const admin = createServiceClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("id")
    .eq("email", OPERATOR_EMAIL)
    .eq("is_admin", true)
    .maybeSingle();
  if (!profile) return null;
  const { data } = await admin
    .from("user_solapi_accounts")
    .select("api_key, api_secret, sender_phone")
    .eq("user_id", profile.id)
    .maybeSingle();
  return data?.api_key && data?.api_secret && data?.sender_phone ? (data as OperatorAccount) : null;
}

/** 관리자 점검용 — 운영자 솔라피 계정 잔액(무료 조회, 문자 발송 없음). 계정이 없으면 null */
export async function getOperatorSmsBalance(): Promise<{ balance: number; point: number } | null> {
  const account = await getOperatorAccount();
  if (!account) return null;
  const b = await new SolapiMessageService(account.api_key, account.api_secret).getBalance();
  return { balance: Number(b.balance ?? 0), point: Number(b.point ?? 0) };
}

/** 운영자 솔라피 계정이 등록돼 있으면 발송 함수를, 없으면 null 을 돌려준다 */
export async function getOperatorSmsSender(): Promise<((to: string, text: string) => Promise<void>) | null> {
  const account = await getOperatorAccount();
  if (!account) return null;
  const service = new SolapiMessageService(account.api_key, account.api_secret);
  return async (to, text) => {
    await service.send({ to: to.replace(/[^0-9]/g, ""), from: account.sender_phone.replace(/[^0-9]/g, ""), text });
  };
}
