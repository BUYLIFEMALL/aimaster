import { getStaffStore } from "@/lib/store";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/orders";
import { ACCESS_ACTION_LABEL, PERM_GROUPS, permsLabel } from "@/lib/staff";
import { AdminShell, NoPermission } from "../admin-shell";
import InviteForm from "./invite-form";
import { revokeInviteAction, updateStaffAction } from "./actions";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

type StaffRow = { user_id: string; email: string; role: string; perms: Record<string, boolean>; created_at: string; removed_at: string | null };
type InviteRow = { id: string; email: string; perms: Record<string, boolean>; expires_at: string };
type LogRow = { id: string; user_id: string | null; action: string; target_type: string; target_id: string; note: string; created_at: string };

// 직원 부계정(D22) — 대표만. 초대·권한·내보내기와 접속 기록(1년 보관)
export default async function AdminStaffPage({ params, searchParams }: { params: Promise<{ store: string }>; searchParams: Promise<{ error?: string; ok?: string; msg?: string }> }) {
  const { store: slug } = await params;
  const { error, ok, msg } = await searchParams;
  const { store, staff } = await getStaffStore(slug, `/s/${slug}/admin/staff`);
  if (!staff) return <NoPermission />;
  const supabase = await createClient();
  const [{ data: list }, { data: logs }] = await Promise.all([
    supabase.rpc("mall_builder_staff_list", { p_store_id: store.id }),
    supabase.from("mall_builder_staff_access_logs").select("id, user_id, action, target_type, target_id, note, created_at").eq("store_id", store.id).order("created_at", { ascending: false }).limit(100),
  ]);
  const l = (list ?? { staff: [], invites: [] }) as { staff: StaffRow[]; invites: InviteRow[] };
  const emailOf = new Map(l.staff.map((s) => [s.user_id, s.email]));

  return (
    <AdminShell slug={store.slug} storeName={store.name} active="/staff">
      {error && <p className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {ok && <p className="mb-4 rounded bg-green-50 px-3 py-2 text-sm text-green-700">{msg || "처리했습니다."}</p>}
      <InviteForm slug={store.slug} />

      <section className="mt-6">
        <h2 className="text-sm font-semibold">운영자 ({l.staff.filter((s) => !s.removed_at).length})</h2>
        <ul className="mt-2 divide-y rounded border text-sm" data-staff-list>
          {l.staff.map((s) => (
            <li key={s.user_id} className={`space-y-2 px-3 py-3 ${s.removed_at ? "opacity-50" : ""}`}>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded px-1.5 text-xs ${s.role === "owner" ? "bg-gray-900 text-white" : "bg-gray-100"}`}>{s.role === "owner" ? "대표" : "직원"}</span>
                <b>{s.email}</b>
                <span className="text-xs text-gray-500">{s.role === "owner" ? "모든 메뉴" : permsLabel(s.perms)}</span>
                <span className="ml-auto text-xs text-gray-400">{formatDateTime(s.created_at)}{s.removed_at ? ` · ${formatDateTime(s.removed_at)} 내보냄` : ""}</span>
              </div>
              {s.role !== "owner" && !s.removed_at && (
                <form action={updateStaffAction.bind(null, store.slug, s.user_id)} className="flex flex-wrap items-center gap-3 text-xs" data-staff-edit>
                  {PERM_GROUPS.map((g) => (
                    <label key={g.key} className="flex items-center gap-1"><input type="checkbox" name={`perm_${g.key}`} defaultChecked={s.perms?.[g.key] === true} /> {g.label}</label>
                  ))}
                  <label className="flex items-center gap-1 text-red-700"><input type="checkbox" name="remove" /> 내보내기</label>
                  <button className="rounded border px-3 py-1">저장</button>
                </form>
              )}
            </li>
          ))}
        </ul>
      </section>

      {l.invites.length > 0 && (
        <section className="mt-6">
          <h2 className="text-sm font-semibold">수락 대기 초대 ({l.invites.length})</h2>
          <ul className="mt-2 divide-y rounded border text-sm" data-staff-invites>
            {l.invites.map((i) => (
              <li key={i.id} className="flex flex-wrap items-center gap-2 px-3 py-2">
                <b>{i.email}</b>
                <span className="text-xs text-gray-500">{permsLabel(i.perms)} · {formatDateTime(i.expires_at)}까지</span>
                <form action={revokeInviteAction.bind(null, store.slug, i.id)} className="ml-auto">
                  <button className="rounded border px-2 py-1 text-xs">초대 거두기</button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-6">
        <h2 className="text-sm font-semibold">접속 기록 (최근 100건 · 1년 보관)</h2>
        <p className="mt-1 text-xs text-gray-500">손님·주문 상세(개인정보)를 연 기록과 직원 초대·권한 변경 기록입니다. 대표만 볼 수 있습니다.</p>
        {(logs ?? []).length === 0 ? (
          <p className="mt-2 text-sm text-gray-500">아직 기록이 없습니다.</p>
        ) : (
          <ul className="mt-2 divide-y rounded border text-xs" data-access-logs>
            {((logs ?? []) as LogRow[]).map((g) => (
              <li key={g.id} className="flex flex-wrap gap-2 px-3 py-1.5">
                <span className="text-gray-400">{formatDateTime(g.created_at)}</span>
                <span>{(g.user_id && emailOf.get(g.user_id)) || "(알 수 없음)"}</span>
                <b>{ACCESS_ACTION_LABEL[g.action] ?? g.action}</b>
                <span className="text-gray-500">{g.target_type === "email" ? g.target_id : g.target_id.slice(0, 8)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </AdminShell>
  );
}
