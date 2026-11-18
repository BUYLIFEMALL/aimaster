import "server-only";
import { ApiKeyError, BadRequestError, InvalidDateError } from "solapi";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendViaSmtpAccount } from "@/lib/email/transport";
import { sendTelegramMessage } from "@/lib/telegram/client";
import { sendAlimtalk, sendFriendtalk, sendSms, type SolapiAccountCredentials } from "@/lib/solapi/client";

interface FormSourceRow {
  id: string;
  user_id: string;
  name: string;
  notify_email: boolean;
  notify_telegram: boolean;
  notify_sms: boolean;
  notify_alimtalk: boolean;
  notify_friendtalk: boolean;
  kakao_template_id: string | null;
  kakao_variables: Record<string, string>;
}

interface SubmissionRow {
  id: string;
  user_id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  raw_values: Record<string, string>;
}

export type ChannelName = "email" | "telegram" | "sms" | "alimtalk" | "friendtalk";
/**
 * sent = 보냄 / rejected = 확실히 안 나감(보내기 전 검증·서버 명시 거절·계정 없음·조회 실패·템플릿 없음)
 * / unknown = 나갔는지 모름 / skipped = 받는 주소가 없어 시도 안 함
 */
export type ChannelOutcome = "sent" | "rejected" | "unknown" | "skipped";
export type DispatchStatus = "notified" | "partial" | "failed" | "unknown" | "received";

export interface DispatchResult {
  status: DispatchStatus;
  /** 고정 진단 문구만(키·연락처·이름·서버 원문 0). 전부 보냈으면 null */
  errorMessage: string | null;
  channels: { channel: ChannelName; outcome: ChannelOutcome; note: string }[];
}

const LABEL: Record<ChannelName, string> = { email: "이메일", telegram: "텔레그램", sms: "문자", alimtalk: "알림톡", friendtalk: "친구톡" };

/**
 * 문자(SOLAPI) 오류 분류 — A안(2026-11-18, Master 배정): 설치된 solapi 6.0.1(dist/index.js) 기준으로
 * **요청을 보내기 전에만 생기는** 오류만 「확실히 안 나감」으로 본다.
 * - ApiKeyError: 서비스 생성자·인증 정보 단계(:2935, :1252) — HTTP 0번
 * - BadRequestError: send()가 요청 전에 메시지·설정 스키마를 검증(:2491-2512) — HTTP 0번
 * - InvalidDateError: 요청 전 날짜 변환
 * ClientError(4xx)·MessageNotReceivedError(전부 접수 실패 응답)는 **HTTP 응답 뒤**라 「모름」 — SDK가 연결 끊김·503에서
 * 스스로 최대 3번 다시 보내므로(:1405-1413) 앞선 시도가 서버에서 처리됐는지 밖에서 알 수 없다. 그 밖 모든 오류도 「모름」.
 * 한계: 이 분류는 잘못된 「실패 확정」만 없앤다. SDK 내부 재시도로 인한 이중 전송 위험은 그대로다(공용 래퍼·SDK 수정 0).
 */
function classifySolapiError(err: unknown): "rejected" | "unknown" {
  if (err instanceof ApiKeyError || err instanceof BadRequestError || err instanceof InvalidDateError) {
    return "rejected";
  }
  return "unknown";
}

/**
 * 이메일(nodemailer) 오류 분류 — nodemailer 6.10.1 lib/smtp-connection 기준:
 * SMTP 서버가 4xx·5xx 응답 코드로 거절해 responseCode(숫자)가 붙은 EENVELOPE·EMESSAGE·EAUTH, 또는
 * 라이브러리가 보내기 전에 스스로 막은 command "API"의 EENVELOPE·EMESSAGE·EAUTH만 「확실히 안 나감」. 그 밖(연결·시간 초과 등)은 「모름」.
 */
function classifySmtpError(err: unknown): "rejected" | "unknown" {
  if (!err || typeof err !== "object") return "unknown";
  const e = err as { code?: unknown; responseCode?: unknown; command?: unknown };
  const known = e.code === "EENVELOPE" || e.code === "EMESSAGE" || e.code === "EAUTH";
  if (!known) return "unknown";
  if (typeof e.responseCode === "number" && e.responseCode >= 400 && e.responseCode < 600) return "rejected";
  if (e.command === "API" && e.responseCode === undefined) return "rejected";
  return "unknown";
}

/**
 * 텔레그램 오류 — 공용 코드(lib/telegram/client.ts)가 HTTP 거절과 통신 실패를 같은 일반 Error로 던져 종류를 알 수 없으므로
 * 문구로 추측하지 않고 모두 「모름」.
 */
function classifyTelegramError(): "unknown" {
  return "unknown";
}

/** 채널 결과들로 최종 상태: 불명 우선 → 성공+확정 실패는 partial → 전부 성공 notified → 확정 실패만 failed → 시도 0은 received */
export function finalStatus(outcomes: ChannelOutcome[]): DispatchStatus {
  if (outcomes.includes("unknown")) return "unknown";
  const sent = outcomes.includes("sent");
  const rejected = outcomes.includes("rejected");
  if (sent && rejected) return "partial";
  if (sent) return "notified";
  if (rejected) return "failed";
  return "received";
}

type Admin = ReturnType<typeof createAdminClient>;

/** 회원 본인 계정 한 줄 조회. 오류·예외는 null이 아니라 "error"로 돌려 「계정 없음」과 구분. */
async function loadAccount<T>(run: () => PromiseLike<{ data: unknown; error: unknown }>): Promise<T | null | "error"> {
  try {
    const { data, error } = await run();
    if (error) return "error";
    return (data as T | null) ?? null;
  } catch {
    return "error";
  }
}

/**
 * 웹훅으로 접수된 신청 1건에 대해, 신청자에게 이메일(SMTP)/문자·카카오 알림톡·친구톡(SOLAPI)을
 * 보내고 운영자 본인에게 텔레그램 알림을 보낸다. 웹훅 라우트(로그인 세션 없음)에서 admin
 * client로 호출되므로, 여기서도 admin client(service role)를 쓰고 반드시 user_id로 직접
 * 필터링한다.
 *
 * CRM U2(2026-11-18): 채널마다 결과를 「보냄 / 확실히 안 나감 / 모름 / 건너뜀」으로 구조화해 돌려준다.
 * 자동 재시도·재발송 0. 진단 문구는 고정 문구만(원문·키·연락처 0).
 */
export async function dispatchSubmissionNotifications(
  source: FormSourceRow,
  submission: SubmissionRow,
): Promise<DispatchResult> {
  const channels: DispatchResult["channels"] = [];
  const add = (channel: ChannelName, outcome: ChannelOutcome, note: string) => channels.push({ channel, outcome, note });

  // 회원 경계: 접수 회원과 폼 연결 회원이 다르면 아무 계정도 조회하지 않고 보내지 않는다.
  if (source.user_id !== submission.user_id) {
    return { status: "failed", errorMessage: "접수와 폼 연결의 회원이 달라 보내지 않음", channels: [] };
  }

  const admin: Admin = createAdminClient();
  const displayName = submission.name ? `${submission.name}님` : "고객님";

  if (source.notify_email) {
    if (!submission.email) add("email", "skipped", "받는 주소 없음");
    else {
      const smtpAccount = await loadAccount<{ smtp_host: string; smtp_port: number; smtp_user: string; smtp_password: string; from_name: string | null; label: string | null }>(() =>
        admin
          .from("user_smtp_accounts")
          .select("smtp_host, smtp_port, smtp_user, smtp_password, from_name, label")
          .eq("user_id", source.user_id)
          .eq("is_active", true)
          .limit(1)
          .maybeSingle(),
      );
      if (smtpAccount === "error") add("email", "rejected", "계정 조회 실패");
      else if (!smtpAccount) add("email", "rejected", "발송 계정 없음");
      else {
        try {
          await sendViaSmtpAccount(
            smtpAccount as Parameters<typeof sendViaSmtpAccount>[0],
            submission.email,
            `${displayName}의 신청접수가 완료되었습니다`,
            `<p>${displayName}, "${source.name}" 신청이 정상적으로 접수되었습니다.</p><p>빠른 시간 내에 확인 후 연락드리겠습니다.</p>`,
          );
          add("email", "sent", "보냄");
        } catch (err) {
          const c = classifySmtpError(err);
          add("email", c, c === "rejected" ? "거절됨" : "결과 모름");
        }
      }
    }
  }

  if (source.notify_telegram) {
    const telegramLink = await loadAccount<{ bot_token: string; chat_id: string }>(() =>
      admin
        .from("user_telegram_links")
        .select("bot_token, chat_id")
        .eq("user_id", source.user_id)
        .eq("program_slug", "crm-google-form")
        .maybeSingle(),
    );
    if (telegramLink === "error") add("telegram", "rejected", "계정 조회 실패");
    else if (!telegramLink) add("telegram", "rejected", "봇 연결 없음");
    else {
      try {
        const lines = Object.entries(submission.raw_values).map(([q, a]) => `✅ ${q} : ${a}`);
        await sendTelegramMessage({
          botToken: telegramLink.bot_token,
          chatId: telegramLink.chat_id,
          text: `📋 새 신청 접수 — ${source.name}\n\n${lines.join("\n")}`,
        });
        add("telegram", "sent", "보냄");
      } catch {
        add("telegram", classifyTelegramError(), "결과 모름");
      }
    }
  }

  const solapiChannels: ChannelName[] = [];
  if (source.notify_sms) solapiChannels.push("sms");
  if (source.notify_alimtalk) solapiChannels.push("alimtalk");
  if (source.notify_friendtalk) solapiChannels.push("friendtalk");
  if (solapiChannels.length > 0) {
    if (!submission.phone) {
      for (const ch of solapiChannels) add(ch, "skipped", "받는 주소 없음");
    } else {
      const phone = submission.phone;
      const solapiAccount = await loadAccount<SolapiAccountCredentials>(() =>
        admin
          .from("user_solapi_accounts")
          .select("api_key, api_secret, sender_phone, kakao_pf_id")
          .eq("user_id", source.user_id)
          .maybeSingle(),
      );
      if (solapiAccount === "error" || !solapiAccount) {
        for (const ch of solapiChannels) add(ch, "rejected", solapiAccount === "error" ? "계정 조회 실패" : "발송 계정 없음");
      } else {
        const account = solapiAccount;
        const attempt = async (ch: ChannelName, send: () => Promise<void>) => {
          try {
            await send();
            add(ch, "sent", "보냄");
          } catch (err) {
            const c = classifySolapiError(err);
            add(ch, c, c === "rejected" ? "거절됨" : "결과 모름");
          }
        };
        if (source.notify_sms) {
          await attempt("sms", () => sendSms(account, phone, `[${source.name}] ${displayName}, 신청이 정상적으로 접수되었습니다.`));
        }
        if (source.notify_alimtalk) {
          // 카카오 채널 ID 없음은 공용 래퍼가 일반 Error로 던져 종류를 알 수 없으므로 보내기 전에 여기서 막는다.
          if (!account.kakao_pf_id) add("alimtalk", "rejected", "카카오 채널 없음");
          else if (!source.kakao_template_id) add("alimtalk", "rejected", "템플릿 없음");
          else {
            const templateId = source.kakao_template_id;
            // kakao_variables: {"#{변수명}": "구글폼 질문 제목"} — 오른쪽 질문 제목으로 실제
            // 접수값(raw_values)을 찾아 카카오 템플릿 변수를 채운다.
            const variables: Record<string, string> = {};
            for (const [kakaoVar, question] of Object.entries(source.kakao_variables)) {
              variables[kakaoVar] = submission.raw_values[question] ?? "";
            }
            await attempt("alimtalk", () => sendAlimtalk(account, phone, { templateId, variables }));
          }
        }
        if (source.notify_friendtalk) {
          await attempt("friendtalk", () =>
            sendFriendtalk(account, phone, `${displayName}, "${source.name}" 신청이 정상적으로 접수되었습니다.\n빠른 시간 내에 확인 후 연락드리겠습니다.`),
          );
        }
      }
    }
  }

  const status = finalStatus(channels.map((c) => c.outcome));
  const problems = channels.filter((c) => c.outcome !== "sent").map((c) => `${LABEL[c.channel]}: ${c.note}`);
  if (channels.length === 0) problems.push("보낼 채널 없음");
  return { status, errorMessage: problems.length > 0 ? problems.join(" / ") : null, channels };
}
