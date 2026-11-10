// U13 협업(2026-11-11, 플랜 docs/PLAN_20261111_U13_COLLAB.md — 주인님 승인: 초대한 회원끼리 공유 = 최상위 규칙 §8 예외)
// 초대 대상 확인: 이메일·사용자 id → AIMaster 회원(profiles)인지, 이 프로그램 이용 권한이 있는지 확인하고
// 내부 사용자 id를 그 회원의 Supabase id로 맞춘다(원본은 모르는 이메일이면 임의 id 계정을 만들어 실제 회원과 이어지지 않았음).
// 회원이 아니거나 권한이 없으면 초대하지 않는다. 메일은 보내지 않는다(운영자 메일 미사용 — 화면 알림으로 안내).
import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkProgramAccess } from "@/lib/programAccess";
import { THIS_PROGRAM_SLUG } from "@/lib/access";
import { ApiError } from "@/litpage/server/api/handlers.ts";

type SupabaseLike = { from: (table: string) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any

export interface Invitee { id: string; email: string; name: string }

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

interface Lookup {
  /** 이메일(소문자)·id로 회원 찾기 */
  find(emails: string[], ids: string[]): Promise<Invitee[]>;
  /** 이 프로그램 이용 권한 */
  allowed(id: string): Promise<boolean>;
}

const realLookup: Lookup = {
  async find(emails, ids) {
    const admin = createAdminClient();
    const out: Invitee[] = [];
    const push = (rows: { id: string; email: string | null; name: string | null }[] | null) => {
      for (const r of rows ?? []) if (r.email && !out.some((x) => x.id === r.id)) out.push({ id: r.id, email: r.email.toLowerCase(), name: (r.name ?? "").trim() || r.email.split("@")[0] });
    };
    if (emails.length) {
      const { data, error } = await admin.from("profiles").select("id, email, name").in("email", emails);
      if (error) throw new ApiError("회원 정보를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.", 503);
      push(data);
    }
    if (ids.length) {
      const { data, error } = await admin.from("profiles").select("id, email, name").in("id", ids);
      if (error) throw new ApiError("회원 정보를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.", 503);
      push(data);
    }
    return out;
  },
  async allowed(id) {
    const r = await checkProgramAccess(createAdminClient() as unknown as SupabaseLike, id, THIS_PROGRAM_SLUG);
    return r.allowed;
  },
};

let lookup: Lookup = realLookup;
/** 시험용: 회원 찾기를 바꾼다(null이면 실제) */
export function setInviteeLookup(l: Lookup | null) {
  lookup = l ?? realLookup;
}

/** 초대할 사람 확인. 하나라도 회원이 아니거나 권한이 없으면 아무도 초대하지 않고 이유를 알린다. */
export async function resolveInvitees(emailsIn: unknown, idsIn: unknown, inviterId: string): Promise<Invitee[]> {
  const emails = [...new Set((Array.isArray(emailsIn) ? emailsIn : []).slice(0, 100).map((e) => String(e).trim().toLowerCase()).filter(Boolean))];
  const ids = [...new Set((Array.isArray(idsIn) ? idsIn : []).slice(0, 100).map((e) => String(e).trim()).filter(Boolean))];
  for (const e of emails) if (e.length > 254 || !EMAIL.test(e)) throw new ApiError(`「${e}」은(는) 올바른 이메일 주소가 아닙니다.`, 400);
  if (!emails.length && !ids.length) return [];
  const found = await lookup.find(emails, ids);
  const missing = [...emails.filter((e) => !found.some((f) => f.email === e)), ...ids.filter((i) => !found.some((f) => f.id === i))];
  if (missing.length) throw new ApiError(`AIMaster 회원만 초대할 수 있습니다. 회원이 아닌 주소: ${missing.slice(0, 5).join(", ")}`, 400);
  const people = found.filter((f) => f.id !== inviterId);
  const denied: string[] = [];
  for (const p of people) if (!(await lookup.allowed(p.id))) denied.push(p.email);
  if (denied.length) throw new ApiError(`AI 업무 워크스페이스 이용 권한이 있는 회원만 초대할 수 있습니다. 권한이 없는 회원: ${denied.slice(0, 5).join(", ")}`, 403);
  return people;
}

/**
 * 화면 저장(applyChanges)으로 바깥 사람을 페이지에 넣거나 공개 링크를 켜는 것을 막는다(원본 authz는 그대로 두고 이식판 입구에서 검사).
 * 새 사람 공유는 「공유」 초대(invitePagePermissions → resolveInvitees)로만. 반환: 막을 이유(없으면 null)
 */
export function sharingChangeProblem(input: unknown, deps: { block(id: string): { space_id?: string; permissions?: unknown[] } | undefined; isMember(spaceId: string, userId: string): boolean }): string | null {
  const txs = (input as { transactions?: unknown[] } | null)?.transactions;
  if (!Array.isArray(txs)) return null;
  for (const tx of txs) {
    for (const op of ((tx as { operations?: unknown[] })?.operations ?? []) as { pointer?: { table?: string; id?: string; spaceId?: string }; path?: unknown[]; args?: unknown }[]) {
      if (op?.pointer?.table !== "block") continue;
      const path = Array.isArray(op.path) ? op.path : [];
      let added: unknown[] = [];
      if (path[0] === "permissions") added = Array.isArray(op.args) ? op.args : op.args && typeof op.args === "object" ? [op.args] : [];
      else if (!path.length && op.args && typeof op.args === "object" && Array.isArray((op.args as { permissions?: unknown[] }).permissions)) added = (op.args as { permissions: unknown[] }).permissions;
      if (!added.length) continue;
      const cur = deps.block(String(op.pointer.id ?? ""));
      const before = (cur?.permissions ?? []) as { type?: string; user_id?: string; role?: string }[];
      const spaceId = String(cur?.space_id ?? op.pointer.spaceId ?? "");
      for (const p of added as { type?: string; user_id?: string; role?: string }[]) {
        if (!p || typeof p !== "object" || !p.role || p.role === "none") continue;
        if (p.type === "public_permission" && !before.some((x) => x?.type === "public_permission" && x.role === p.role)) return "공개 링크 공유는 지원하지 않습니다. 「공유」에서 회원을 초대해 주세요.";
        if (p.type === "user_permission" && p.user_id && !before.some((x) => x?.type === "user_permission" && x.user_id === p.user_id) && !deps.isMember(spaceId, p.user_id)) return "새로운 사람과의 공유는 「공유」의 초대로만 할 수 있습니다.";
      }
    }
  }
  return null;
}
