import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { ONSITE_BUCKET, ONSITE_STATUSES, type OnsitePhoto, type OnsiteProperty } from "@/lib/onsite/types";

// B3 임장 모드(2026-11-03): 임장 기록에서 연 리포트·저장본에 그 기록의 사진·현장 메모를 함께 보여 준다.
// 회원 본인 기록만(user_id 조건), 사진은 비공개 버킷의 1시간 서명 주소, 최대 6장.
type SupabaseLike = { from: (table: string) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any

export async function OnsiteNotes({ onsiteId, userId }: { onsiteId: string; userId: string }) {
  const db = (await createClient()) as unknown as SupabaseLike;
  const { data } = await db
    .from("real_estate_onsite_properties")
    .select("id, status, rating, floor, unit, memo, visited_on")
    .eq("id", onsiteId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) return null;
  const p = data as Pick<OnsiteProperty, "id" | "status" | "rating" | "floor" | "unit" | "memo" | "visited_on">;
  const { data: photoRows } = await db.from("real_estate_onsite_photos").select("id, property_id, storage_path").eq("property_id", p.id).order("created_at").limit(6);
  const photos = (photoRows ?? []) as OnsitePhoto[];
  const signed = photos.length ? (await createAdminClient().storage.from(ONSITE_BUCKET).createSignedUrls(photos.map((x) => x.storage_path), 3600)).data ?? [] : [];
  const urls = signed.map((s) => s.signedUrl).filter(Boolean) as string[];

  return (
    <div className="mx-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="mx-section-title">📷 임장 기록</h2>
        <Link href={`/onsite/${p.id}`} className="text-sm text-mx-link underline print:hidden">기록 열기 →</Link>
      </div>
      <p className="text-sm text-mx-muted">
        {p.visited_on} 방문 · {ONSITE_STATUSES[p.status] ?? p.status}
        {p.rating ? ` · ${"★".repeat(p.rating)}` : ""}
        {p.floor ? ` · ${p.floor}층` : ""}
        {p.unit ? ` · ${p.unit}` : ""}
      </p>
      {p.memo ? <p className="mt-2 whitespace-pre-wrap rounded-xl bg-mx-raised p-3 text-sm text-mx-text">{p.memo}</p> : <p className="mt-2 text-sm text-mx-muted">현장 메모 없음</p>}
      {urls.length > 0 && (
        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
          {urls.map((u, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={u} alt={`임장 사진 ${i + 1}`} className="aspect-square w-full rounded-lg object-cover" />
          ))}
        </div>
      )}
    </div>
  );
}
