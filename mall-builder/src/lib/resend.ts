// 주문 알림 메일 — Resend REST API(https://resend.com/docs/api-reference/emails/send-email)를 SDK 없이 fetch로 부른다.
// 키는 몰 운영자 본인 Resend 계정 것만 쓴다. 저장소에서 Resend를 처음 쓰는 코드라 이 파일이 기준이 된다.
// 중복 방지: `Idempotency-Key` 머리글에 알림 번호를 넣어, 결과가 불확실해 다시 보내도 Resend가 한 번만 보낸다.
import { NOTIFY_KIND_LABEL, type SendResult } from "./notify.ts";

type Fetch = typeof fetch;

export type EmailCredentials = { api_key: string; from: string; store_name: string; slug: string };
export type EmailItem = { id: string; order_id: string | null; kind: string; to: string; subject: string; body: string };

const API = "https://api.resend.com/emails";

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/** 보내는 사람: 「몰 이름 <주소>」 — 이름에 꺾쇠·따옴표가 있으면 뺀다 */
export function fromHeader(storeName: string, address: string): string {
  const name = storeName.replace(/[<>"\r\n]/g, "").trim();
  return name ? `${name} <${address}>` : address;
}

/** 주문 상세 링크: 운영자 알림은 관리 화면, 손님 알림은 손님 주문 화면 */
export function orderLink(origin: string, slug: string, item: Pick<EmailItem, "order_id" | "kind">): string | null {
  if (!item.order_id) return null;
  const base = `${origin.replace(/\/+$/, "")}/s/${encodeURIComponent(slug)}`;
  return item.kind === "email_staff_new_order" ? `${base}/admin/orders/${item.order_id}` : `${base}/orders/${item.order_id}`;
}

export function buildEmail(item: EmailItem, creds: EmailCredentials, origin: string) {
  const link = orderLink(origin, creds.slug, item);
  const text = link ? `${item.body}\n\n주문 보기: ${link}` : item.body;
  const html = [
    `<div style="font-family:sans-serif;font-size:15px;line-height:1.6;color:#111">`,
    `<p>${escapeHtml(item.body)}</p>`,
    link ? `<p><a href="${escapeHtml(link)}" style="display:inline-block;padding:10px 16px;background:#111;color:#fff;border-radius:6px;text-decoration:none">주문 보기</a></p>` : "",
    `<p style="color:#888;font-size:12px">${escapeHtml(creds.store_name)} · ${escapeHtml(NOTIFY_KIND_LABEL[item.kind.replace(/^email_/, "")] ?? "알림")}</p>`,
    `</div>`,
  ].join("");
  return { from: fromHeader(creds.store_name, creds.from), to: [item.to], subject: item.subject, html, text };
}

/** HTTP 상태 → 결과. 4xx는 거절이 분명(failed), 409(같은 키로 처리 중)·429·5xx·네트워크 오류는 불확실(unknown) */
export function classifyStatus(status: number): SendResult {
  if (status >= 200 && status < 300) return "sent";
  if (status === 409 || status === 429 || status >= 500) return "unknown";
  return "failed";
}

function koreanError(status: number, message: string): string {
  // 도메인 미인증도 403으로 오므로 문구부터 본다
  if (/domain/i.test(message) && /verif/i.test(message)) return `보내는 주소의 도메인이 Resend에서 인증되지 않았습니다(${message})`;
  if (status === 401 || status === 403) return `Resend 키가 올바르지 않거나 권한이 없습니다(${message})`;
  if (status === 422) return `메일 내용·주소가 올바르지 않습니다(${message})`;
  if (status === 429) return "Resend 보내기 한도를 넘었습니다(무료: 하루 100통)";
  return message || `HTTP ${status}`;
}

export async function sendEmail(
  apiKey: string,
  payload: ReturnType<typeof buildEmail>,
  idempotencyKey: string,
  f: Fetch = fetch,
): Promise<{ result: SendResult; error: string }> {
  try {
    const res = await f(API, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "Idempotency-Key": idempotencyKey },
      body: JSON.stringify(payload),
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    const result = classifyStatus(res.status);
    if (result === "sent") return { result, error: "" };
    const data = (await res.json().catch(() => ({}))) as { message?: string };
    return { result, error: koreanError(res.status, String(data.message ?? "")).slice(0, 200) };
  } catch (e) {
    return { result: "unknown", error: (e instanceof Error ? e.message : String(e)).slice(0, 200) };
  }
}

/** 꺼낸 메일을 하나씩 보낸다. 불확실하면 같은 Idempotency-Key로 한 번만 다시 보낸다(Resend가 중복을 막음) */
export async function sendEmailsClaimed(items: EmailItem[], creds: EmailCredentials | null, origin: string, f: Fetch = fetch, retryDelayMs = 1000) {
  const results: { id: string; result: SendResult; error: string }[] = [];
  for (const item of items) {
    if (!creds) {
      results.push({ id: item.id, result: "failed", error: "Resend 키가 없습니다." });
      continue;
    }
    const payload = buildEmail(item, creds, origin);
    let r = await sendEmail(creds.api_key, payload, item.id, f);
    if (r.result === "unknown") {
      if (retryDelayMs) await new Promise((ok) => setTimeout(ok, retryDelayMs));
      r = await sendEmail(creds.api_key, payload, item.id, f);
    }
    results.push({ id: item.id, ...r });
  }
  return results;
}

export function checkEmail(value: string): string | null {
  const v = value.trim();
  if (v === "") return null;
  return /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(v) ? null : "메일 주소 형식이 올바르지 않습니다.";
}
