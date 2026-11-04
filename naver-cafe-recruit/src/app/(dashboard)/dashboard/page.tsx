import Link from "next/link";
import { requireProgramAccess } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

type Settings = { mode_known: boolean; mode_promo: boolean; mode_extract: boolean; daily_cap: number; used_today: number };
type Target = { state: string };

// 🏠 오늘의 모집: 매일 볼 것만 — 오늘 보낸 수/상한, 승인 기다리는 사람, 다음 할 일.
export default async function DashboardPage() {
  const user = await requireProgramAccess();
  const db = createAdminClient();
  const call = async <T,>(op: string) => { const { data, error } = await db.rpc("ncr_dispatch", { p_user_id: user.id, p_operation: op, p_payload: {} }); if (error) throw error; return data as T; };
  let s: Settings | null = null, targets: Target[] = [];
  try { s = await call<Settings>("settings_get"); targets = (await call<{ targets: Target[] }>("targets_list")).targets ?? []; } catch { s = null; }
  const drafts = targets.filter(t => t.state === "draft").length, reviewed = targets.filter(t => t.state === "reviewed").length;
  const card = "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm";
  return <div className="mx-auto max-w-4xl space-y-5">
    <div><h1 className="text-2xl font-bold text-slate-900">🏠 오늘의 모집</h1>
      <p className="mt-1 text-sm text-slate-600">내가 로그인한 브라우저에서, 내가 승인한 사람에게만 내 카페 초대를 하루 상한 안에서 보냅니다. 매일 할 일은 새로 모인 목록을 승인하는 것 하나입니다.</p></div>
    {!s ? <p className={card}>상태를 불러오지 못했습니다. 잠시 뒤 새로고침해 주세요.</p> : <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className={card}><p className="text-xs text-slate-500">오늘 보낸 초대</p><p className="mt-1 text-3xl font-bold text-[#03c75a]">{s.used_today}<span className="text-base text-slate-400"> / {s.daily_cap}</span></p></div>
        <div className={card}><p className="text-xs text-slate-500">승인 기다리는 사람</p><p className="mt-1 text-3xl font-bold text-slate-900">{drafts}</p></div>
        <div className={card}><p className="text-xs text-slate-500">초대 대기(승인됨)</p><p className="mt-1 text-3xl font-bold text-slate-900">{reviewed}</p></div>
      </div>
      <section className={card}>
        <h2 className="font-bold text-slate-900">켜 둔 방식</h2>
        <p className="mt-2 text-sm text-slate-700">{[s.mode_known && "👋 아는 사람", s.mode_promo && "📣 카페 홍보 글", s.mode_extract && "🔎 카페 활동 회원"].filter(Boolean).join(" · ") || "켜 둔 방식이 없습니다."}</p>
        <div className="mt-4 flex flex-wrap gap-2 text-sm">
          {drafts > 0 && <Link href="/targets" className="rounded-xl bg-[#03c75a] px-4 py-2 font-bold text-white">✅ {drafts}명 검토·승인하러 가기</Link>}
          <Link href="/targets" className="rounded-xl border px-4 py-2">👥 아는 사람 넣기</Link>
          <Link href="/settings" className="rounded-xl border px-4 py-2">⚙️ 방식·상한 바꾸기</Link>
          <Link href="/results" className="rounded-xl border px-4 py-2">📊 결과·엑셀</Link>
        </div>
      </section>
      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
        <p className="font-semibold">🧩 확장 프로그램(초대 실행) 준비 중</p>
        <p className="mt-1">실제 초대·카페 활동 회원 모으기는 회원 PC의 확장 프로그램이 내 로그인 브라우저에서 합니다. 네이버 초대 화면을 실물로 확인한 뒤 연결합니다. 지금은 사람 모으기·승인·기록까지 쓸 수 있습니다.</p>
      </section>
    </>}
  </div>;
}
