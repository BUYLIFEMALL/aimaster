"use client";
// 화면 → /api/recruit 한 곳. 결과가 불확실하면 자동으로 다시 요청하지 않는다.
export async function recruit<T = Record<string, unknown>>(operation: string, payload: Record<string, unknown> = {}): Promise<T> {
  const r = await fetch("/api/recruit", { method: "POST", credentials: "same-origin", cache: "no-store", headers: { "content-type": "application/json" }, body: JSON.stringify({ operation, payload }) });
  const v = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(v.error || "결과를 확인하지 못했습니다. 자동으로 다시 요청하지 않습니다.");
  return v.data as T;
}
export const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
export const toMinute = (v: string) => { const [h, m] = v.split(":").map(Number); return Number.isInteger(h) && Number.isInteger(m) ? h * 60 + m : NaN; };
export type Settings = { mode_known: boolean; mode_promo: boolean; mode_extract: boolean; extract_consent_at: string | null; daily_cap: number; active_start_minute: number; active_end_minute: number; used_today: number; invite_link?: string | null };
export type Member = { id: string; cafe_id: string; cafe_name: string | null; board_name: string | null; nickname: string; member_grade: string | null; first_seen_at: string; last_seen_at: string };
export type Target = { id: string; source_mode: "known" | "extract"; naver_id: string; nickname: string | null; member_grade: string | null; cafe_id: string | null; board_name: string | null; article_title: string | null; state: "draft" | "reviewed" | "skipped"; created_at: string; expires_at: string };
export type Sent = { id: string; cafe_id: string; naver_id: string; result: "sent" | "failed" | "limited"; detail: string | null; sent_at: string };
