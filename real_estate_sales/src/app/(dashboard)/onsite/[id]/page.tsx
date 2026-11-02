import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProgramAccess } from "@/lib/access";
import { findDistrict } from "@/lib/publicdata/districts";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { CaptureButtons } from "@/components/onsite/CaptureButtons";
import { MoveOnMap, PhotoGrid, PropertyForm } from "@/components/onsite/PropertyEditor";
import { ONSITE_BUCKET, type OnsitePhoto, type OnsiteProperty } from "@/lib/onsite/types";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

type SupabaseLike = { from: (table: string) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any

const SOURCE_LABELS = { capture: "촬영 때 위치", exif: "사진 속 위치", manual: "지도에서 직접 지정" };

export default async function OnsiteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireProgramAccess();
  const { id } = await params;
  const db = (await createClient()) as unknown as SupabaseLike;

  const { data } = await db.from("real_estate_onsite_properties").select("*").eq("id", id).eq("user_id", user.id).maybeSingle();
  if (!data) notFound();
  const property = data as OnsiteProperty;

  const { data: photoRows } = await db.from("real_estate_onsite_photos").select("id, property_id, storage_path").eq("property_id", id).order("created_at");
  const photos = (photoRows ?? []) as OnsitePhoto[];
  const signed = photos.length ? (await createAdminClient().storage.from(ONSITE_BUCKET).createSignedUrls(photos.map((p) => p.storage_path), 3600)).data ?? [] : [];
  const urlByPath = new Map(signed.map((s) => [s.path, s.signedUrl]));

  const mapKey = process.env.VWORLD_API_KEY ?? null;
  const district = property.sgg_cd ? findDistrict(property.sgg_cd)?.sgg_nm : null;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4">
      <Link href="/onsite" className="text-sm text-mx-link">← 임장 노트로 돌아가기</Link>
      <div>
        <h1 className="text-xl font-black text-mx-text">{[district, property.admin_dong].filter(Boolean).join(" ") || "지역 판정 불가"}</h1>
        <p className="mt-1 text-sm text-mx-muted">
          {SOURCE_LABELS[property.coord_source]}
          {property.accuracy_m !== null ? ` · 오차 약 ${property.accuracy_m}m` : ""}
          {property.coord_confirmed ? " · 확정" : " · 추정"}
        </p>
        {property.pnu && (
          // B1(2026-11-03): 지번이 확인된 기록만
          <Link href={`/report?onsite=${property.id}`} className="mx-btn-ghost mt-2 inline-flex">
            📄 주소 리포트 보기
          </Link>
        )}
      </div>
      <div className="mx-card flex flex-col gap-3 p-4">
        <PhotoGrid photos={photos.map((p) => ({ id: p.id, url: urlByPath.get(p.storage_path) ?? null }))} />
        <CaptureButtons mapKey={mapKey} propertyId={property.id} fallbackCenter={property} />
      </div>
      <div className="mx-card p-4">
        <p className="mb-2 text-sm font-bold text-mx-text">위치가 다르면 지도를 움직여 📍를 맞춰 주세요.</p>
        <MoveOnMap property={property} mapKey={mapKey} />
      </div>
      <PropertyForm property={property} />
    </div>
  );
}
