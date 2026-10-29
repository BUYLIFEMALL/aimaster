import "server-only";
import { randomBytes } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { SHOP_IMAGE_BUCKET } from "@/lib/shop";

// C1-11 짧은 이미지 주소 — 쿠팡 vendorPath는 200자 이하라 비공개 저장소 서명 주소 대신 /i/<id>를 준다.
// 쿠팡 서버가 로그인 없이 받아 가므로 주소만 아는 사람이 열 수 있다 → 추측 못 하게 길게 만들고, 30일 뒤 만료(회원 데이터 30일 규칙).
export const IMAGE_LINK_DAYS = 30;
export const IMAGE_ID_RE = /^[A-Za-z0-9_-]{16,40}$/;

export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://coupang-ops.buylife.xyz").replace(/\/+$/, "");
}

/** 회원 본인 폴더의 상세페이지 이미지 경로 → 짧은 주소. 순서를 지켜 돌려준다. */
export async function createImageLinks(userId: string, paths: string[]): Promise<string[]> {
  const own = paths.filter((p) => p.startsWith(`${userId}/`));
  if (own.length !== paths.length) throw new Error("본인 이미지가 아닌 경로가 섞여 있습니다.");
  if (!paths.length) return [];
  const expires = new Date(Date.now() + IMAGE_LINK_DAYS * 86400000).toISOString();
  const rows = paths.map((path) => ({ id: randomBytes(16).toString("base64url"), user_id: userId, bucket: SHOP_IMAGE_BUCKET, path, expires_at: expires }));
  const { error } = await createAdminClient().from("coupang_ops_image_links").insert(rows);
  if (error) throw new Error("이미지 주소를 만들지 못했습니다.");
  return rows.map((r) => `${siteUrl()}/i/${r.id}`);
}
