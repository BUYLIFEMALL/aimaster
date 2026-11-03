import { headers } from "next/headers";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { toggleIntakeLinkAction } from "@/lib/actions/desk";
import { IntakeLinkForm } from "@/components/desk/IntakeLinkForm";
import { PageHero } from "@/components/ui/PageHero";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

type SupabaseLike = { from: (table: string) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any
type Link = { id: string; office_name: string; office_phone: string | null; is_active: boolean; created_at: string };

export default async function IntakeLinksPage() {
  const user = await requireProgramAccess();
  const db = (await createClient()) as unknown as SupabaseLike;
  const { data } = await db.from("realty_desk_intake_links").select("id, office_name, office_phone, is_active, created_at").eq("user_id", user.id).order("created_at", { ascending: false });
  const links = (data ?? []) as Link[];
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "realty-client-desk.buylife.xyz";
  const origin = `${host.startsWith("localhost") ? "http" : "https"}://${host}`;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4">
      <PageHero badge="🔗 고객 접수 링크" title="고객이 직접 조건을 남기는 링크" description="링크를 문자·블로그·명함 QR에 붙이면, 고객이 로그인 없이 원하는 조건을 적고 개인정보 수집에 동의한 뒤 접수합니다. 매물 안내 문자 수신은 고객이 따로 고릅니다." />
      <IntakeLinkForm origin={origin} />
      <div className="mx-card p-5">
        <h2 className="mx-section-title">내 접수 링크</h2>
        {links.length === 0 ? (
          <p className="text-sm text-mx-muted">아직 없어요. 위에서 하나 만들어 주세요.</p>
        ) : (
          <ul className="divide-y divide-mx-border text-sm">
            {links.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <span>
                  <b className="text-mx-text">{l.office_name}</b>
                  <span className="ml-2 text-xs text-mx-muted">{l.office_phone ?? ""} · {new Date(l.created_at).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" })} 만듦</span>
                </span>
                <form action={toggleIntakeLinkAction} className="flex items-center gap-2">
                  <input type="hidden" name="id" value={l.id} />
                  <input type="hidden" name="active" value={l.is_active ? "0" : "1"} />
                  <span className={l.is_active ? "mx-chip-green" : "mx-chip"}>{l.is_active ? "받는 중" : "멈춤"}</span>
                  <button type="submit" className="mx-btn-ghost min-h-[40px] px-3 text-xs">{l.is_active ? "멈추기" : "다시 받기"}</button>
                </form>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-xs text-mx-muted">링크 주소는 만들 때 한 번만 보여요(보안). 잃어버리면 새로 만들고 예전 링크는 멈추세요.</p>
      </div>
    </div>
  );
}
