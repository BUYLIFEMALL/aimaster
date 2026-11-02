import Link from "next/link";
import { redirect } from "next/navigation";
import { requireProgramAccess } from "@/lib/access";
import { findDistrict } from "@/lib/publicdata/districts";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { PageHero } from "@/components/ui/PageHero";
import { CaptureButtons } from "@/components/onsite/CaptureButtons";
import { OnsiteMap } from "@/components/onsite/OnsiteMap";
import { ONSITE_BUCKET, ONSITE_STATUSES, canUseOnsite, type OnsitePhoto, type OnsiteProperty, type OnsiteStatus } from "@/lib/onsite/types";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const PIN_COLORS: Record<OnsiteStatus, string> = { new: "#2563eb", interested: "#f59e0b", contact: "#10b981", excluded: "#8b93a7" };

type SupabaseLike = { from: (table: string) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any

export default async function OnsitePage({ searchParams }: { searchParams: Promise<{ dong?: string; status?: string; date?: string }> }) {
  const user = await requireProgramAccess();
  if (!canUseOnsite(user.email)) redirect("/dashboard");
  const filter = await searchParams;
  const db = (await createClient()) as unknown as SupabaseLike;

  const { data } = await db
    .from("real_estate_onsite_properties")
    .select("id, lat, lon, accuracy_m, coord_source, coord_confirmed, sgg_cd, admin_dong, address, kind, status, rating, floor, unit, memo, visited_on")
    .eq("user_id", user.id)
    .order("visited_on", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(300);
  const all = (data ?? []) as OnsiteProperty[];
  const rows = all.filter(
    (p) => (!filter.dong || p.admin_dong === filter.dong) && (!filter.status || p.status === filter.status) && (!filter.date || p.visited_on === filter.date),
  );
  const dongs = [...new Set(all.map((p) => p.admin_dong).filter(Boolean))].sort() as string[];
  const dates = [...new Set(all.map((p) => p.visited_on))];

  const { data: photoRows } = await db
    .from("real_estate_onsite_photos")
    .select("id, property_id, storage_path")
    .in("property_id", rows.map((p) => p.id))
    .order("created_at");
  const firstPhoto = new Map<string, string>();
  for (const photo of (photoRows ?? []) as OnsitePhoto[]) if (!firstPhoto.has(photo.property_id)) firstPhoto.set(photo.property_id, photo.storage_path);
  const paths = [...firstPhoto.values()];
  const signed = paths.length ? (await createAdminClient().storage.from(ONSITE_BUCKET).createSignedUrls(paths, 3600)).data ?? [] : [];
  const urlByPath = new Map(signed.map((s) => [s.path, s.signedUrl]));

  const mapKey = process.env.VWORLD_API_KEY ?? null;
  const last = all[0];

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4">
      <PageHero
        badge="📍 임장 노트"
        title="임장 노트"
        description="현장에서 사진을 찍으면 위치가 함께 저장되고 시·군·구와 행정동으로 자동 분류되고, 30m 안의 건물이면 도로명주소도 자동으로 들어갑니다."
        tip={`저장한 곳 ${all.length}개 · 사진과 기록은 본인만 보며 1년 뒤 자동으로 지워집니다.`}
      />

      <div className="mx-card p-4">
        <CaptureButtons mapKey={mapKey} fallbackCenter={last ? { lat: last.lat, lon: last.lon } : null} />
        <p className="mt-2 text-xs text-mx-muted">건물 밖에서 찍을수록 위치가 정확합니다. 사진에 다른 사람 얼굴이나 차량 번호가 담기지 않게 주의해 주세요.</p>
      </div>

      {all.length > 0 && (
        <OnsiteMap
          mapKey={mapKey}
          className="h-72 md:h-96"
          pins={rows.map((p) => ({ id: p.id, lat: p.lat, lon: p.lon, label: p.address ?? p.admin_dong ?? "임장한 곳", color: PIN_COLORS[p.status], href: `/onsite/${p.id}` }))}
        />
      )}

      {all.length > 0 && (
        <form className="mx-card flex flex-wrap items-end gap-2 p-3" action="/onsite">
          <label className="text-xs text-mx-muted">
            행정동
            <select name="dong" defaultValue={filter.dong ?? ""} className="block min-h-[44px] rounded-lg border border-mx-border bg-mx-raised px-2 text-sm text-mx-text">
              <option value="">전체</option>
              {dongs.map((d) => <option key={d}>{d}</option>)}
            </select>
          </label>
          <label className="text-xs text-mx-muted">
            방문일
            <select name="date" defaultValue={filter.date ?? ""} className="block min-h-[44px] rounded-lg border border-mx-border bg-mx-raised px-2 text-sm text-mx-text">
              <option value="">전체</option>
              {dates.map((d) => <option key={d}>{d}</option>)}
            </select>
          </label>
          <label className="text-xs text-mx-muted">
            상태
            <select name="status" defaultValue={filter.status ?? ""} className="block min-h-[44px] rounded-lg border border-mx-border bg-mx-raised px-2 text-sm text-mx-text">
              <option value="">전체</option>
              {Object.entries(ONSITE_STATUSES).map(([v, label]) => <option key={v} value={v}>{label}</option>)}
            </select>
          </label>
          <button className="mx-btn-ghost min-h-[44px]">거르기</button>
        </form>
      )}

      {rows.length === 0 ? (
        <p className="mx-card p-6 text-center text-sm text-mx-muted">{all.length ? "조건에 맞는 곳이 없습니다." : "아직 저장한 곳이 없습니다. 위의 「사진 찍기」로 시작해 주세요."}</p>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {rows.map((p) => {
            const path = firstPhoto.get(p.id);
            const url = path ? urlByPath.get(path) : null;
            const district = p.sgg_cd ? findDistrict(p.sgg_cd)?.sgg_nm : null;
            return (
              <li key={p.id}>
                <Link href={`/onsite/${p.id}`} className="mx-card flex gap-3 p-3">
                  {url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={url} alt="임장 사진" className="h-20 w-20 shrink-0 rounded-lg object-cover" />
                  ) : (
                    <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-mx-raised text-2xl">📍</div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-mx-text">{p.address ?? ([district, p.admin_dong].filter(Boolean).join(" ") || "지역 판정 불가")}</p>
                    <p className="mt-1 text-xs text-mx-muted">{p.visited_on} · {ONSITE_STATUSES[p.status]}{p.kind ? ` · ${p.kind}` : ""}{p.rating ? ` · ${"⭐".repeat(p.rating)}` : ""}</p>
                    {p.memo && <p className="mt-1 truncate text-xs text-mx-muted">{p.memo}</p>}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      <p className="text-xs text-mx-muted">행정동 경계: 통계청 SGIS 가공 자료(vuski/admdongkor, CC BY 4.0) · 배경지도: 브이월드</p>
    </div>
  );
}
