// 회원별 저장공간(용량)·보관 기간 공용 컴포넌트 — 메인 사이트 화면·API·관리자 공통
// 정책 계산은 DB 함수 member_storage_policy 한 곳(0063). 여기서는 읽어서 화면용으로 정리만 한다.
// 플랜: docs/PLAN_20261111_MEMBER_STORAGE_QUOTA.md
// 서버 키(service role) 클라이언트로만 부른다 — 함수 실행 권한이 service_role에만 있음.

type SupabaseLike = {
  rpc: (fn: string, args?: Record<string, unknown>) => PromiseLike<{ data: unknown; error: { message: string } | null }>;
  from: (table: string) => any; // eslint-disable-line @typescript-eslint/no-explicit-any
};

export const STORAGE_PROGRAM_SLUG = "storage-plus";
export const STORAGE_PAGE_URL = "https://www.buylife.xyz/storage";
/** 이 비율 이상이면 구독 안내 팝업 */
export const STORAGE_WARN_RATIO = 0.8;

/** 버킷 이름 → 회원에게 보이는 프로그램 이름 (없으면 버킷 이름 그대로) */
const BUCKET_LABELS: Record<string, string> = {
  "music-audio": "음악",
  "ai-music-studio": "AI 음악 스튜디오",
  "free-music-studio": "무료 음악",
  "tarot-card-images": "타로",
  "shop-detail-images": "상세페이지",
  "post-images": "쓰레드·카페 이미지",
  "ig-media-thumbnails": "인스타 썸네일",
  "insta-post-images": "인스타 게시 이미지",
  "ai-image-generations": "AI 이미지",
  "ai-video-studio": "AI 영상",
  "shorts-onestop-studio": "쇼츠 원스톱",
};
export function bucketLabel(bucket: string): string {
  return BUCKET_LABELS[bucket] ?? bucket;
}

export interface StoragePolicy {
  quotaBytes: number | null; // null = 무제한
  retentionDays: number | null; // null = 자동 삭제 없음
  unlimitedRetention: boolean;
  source: "exempt" | "admin" | "subscription" | "grade" | "free";
  planName: string | null;
  planExpiresAt: string | null;
  overrideUntil: string | null;
}

export interface StorageSummary extends StoragePolicy {
  usedBytes: number;
  fileCount: number;
  measuredAt: string | null;
  ratio: number | null; // 0~1+, 무제한이면 null
  byBucket: { bucket: string; label: string; bytes: number }[];
  /** 종류별(이미지·영상·음악·기타 파일) — 0이어도 네 칸 모두 */
  byKind: { kind: StorageKind; label: string; emoji: string; bytes: number }[];
}

export type StorageKind = "image" | "video" | "audio" | "other";
export const STORAGE_KINDS: { kind: StorageKind; label: string; emoji: string }[] = [
  { kind: "image", label: "이미지", emoji: "🖼️" },
  { kind: "video", label: "영상", emoji: "🎬" },
  { kind: "audio", label: "음악", emoji: "🎵" },
  { kind: "other", label: "기타 파일", emoji: "📁" },
];
export function toByKind(raw: Record<string, number> | null | undefined) {
  return STORAGE_KINDS.map((k) => ({ ...k, bytes: Number(raw?.[k.kind] ?? 0) }));
}

export interface StoragePlanOffer {
  pricingPlanId: string;
  slug: string;
  name: string;
  quotaBytes: number;
  retentionDays: number | null;
  price: number;
  billingType: string;
}

type PolicyRow = {
  quota_bytes: number | null;
  retention_days: number | null;
  unlimited_retention: boolean;
  source: StoragePolicy["source"];
  plan_name: string | null;
  plan_expires_at: string | null;
  override_until: string | null;
};

export function toPolicy(row: PolicyRow | null | undefined): StoragePolicy {
  return {
    quotaBytes: row?.quota_bytes ?? (row ? null : 524288000), // 판정 실패 때 기본(무료 500MB, 2026-11-11 주인님 지시)
    retentionDays: row ? row.retention_days : 30,
    unlimitedRetention: row?.unlimited_retention ?? false,
    source: row?.source ?? "free",
    planName: row?.plan_name ?? "기본",
    planExpiresAt: row?.plan_expires_at ?? null,
    overrideUntil: row?.override_until ?? null,
  };
}

export async function getStorageSummary(service: SupabaseLike, userId: string): Promise<StorageSummary> {
  const [{ data: pol }, { data: usage }] = await Promise.all([
    service.rpc("member_storage_policy", { uid: userId }),
    service.from("member_storage_usage").select("bytes, file_count, by_bucket, by_kind, measured_at").eq("user_id", userId).maybeSingle(),
  ]);
  const policy = toPolicy(Array.isArray(pol) ? (pol[0] as PolicyRow) : null);
  const used = Number(usage?.bytes ?? 0);
  const byBucket = Object.entries((usage?.by_bucket ?? {}) as Record<string, number>)
    .map(([bucket, bytes]) => ({ bucket, label: bucketLabel(bucket), bytes: Number(bytes) }))
    .sort((a, b) => b.bytes - a.bytes);
  return {
    ...policy,
    usedBytes: used,
    fileCount: Number(usage?.file_count ?? 0),
    measuredAt: usage?.measured_at ?? null,
    ratio: policy.quotaBytes ? used / policy.quotaBytes : null,
    byBucket,
    byKind: toByKind(usage?.by_kind as Record<string, number> | null),
  };
}

/** 회원 요청으로 다시 측정(1분에 1번) — 측정했으면 true */
export async function remeasureIfStale(service: SupabaseLike, userId: string, measuredAt: string | null): Promise<boolean> {
  if (measuredAt && Date.now() - new Date(measuredAt).getTime() < 60_000) return false;
  await service.rpc("member_storage_measure", { uid: userId });
  return true;
}

export async function listStoragePlanOffers(service: SupabaseLike): Promise<StoragePlanOffer[]> {
  const { data: program } = await service.from("programs").select("id").eq("slug", STORAGE_PROGRAM_SLUG).maybeSingle();
  if (!program) return [];
  const [{ data: plans }, { data: sps }] = await Promise.all([
    service.from("pricing_plans").select("id, name, price, billing_type, storage_plan_slug, sort_order").eq("program_id", program.id).eq("is_active", true).order("sort_order"),
    service.from("storage_plans").select("slug, quota_bytes, retention_days").eq("is_active", true),
  ]);
  const bySlug = new Map<string, { quota_bytes: number; retention_days: number | null }>((sps ?? []).map((s: { slug: string; quota_bytes: number; retention_days: number | null }) => [s.slug, s]));
  return (plans ?? [])
    .filter((p: { storage_plan_slug: string | null }) => p.storage_plan_slug && bySlug.has(p.storage_plan_slug))
    .map((p: { id: string; name: string; price: number; billing_type: string; storage_plan_slug: string }) => {
      const sp = bySlug.get(p.storage_plan_slug)!;
      return { pricingPlanId: p.id, slug: p.storage_plan_slug, name: p.name, quotaBytes: Number(sp.quota_bytes), retentionDays: sp.retention_days, price: p.price, billingType: p.billing_type };
    });
}

export function formatBytes(bytes: number | null): string {
  if (bytes === null) return "무제한";
  if (bytes >= 1000 * 1024 ** 2) {
    const gb = bytes / 1024 ** 3;
    return `${gb >= 10 ? Math.round(gb) : Number(gb.toFixed(1))}GB`;
  }
  if (bytes >= 1024 ** 2) return `${Math.round(bytes / 1024 ** 2)}MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${bytes}B`;
}

export function formatRetention(p: Pick<StoragePolicy, "retentionDays" | "unlimitedRetention">): string {
  if (p.unlimitedRetention || p.retentionDays === null) return "자동 삭제 없음";
  if (p.retentionDays % 365 === 0) return `${p.retentionDays / 365}년 보관`;
  return `${p.retentionDays}일 보관`;
}

export const SOURCE_LABEL: Record<StoragePolicy["source"], string> = {
  exempt: "관리자·시험",
  admin: "관리자 지정",
  subscription: "저장 구독",
  grade: "등급 혜택",
  free: "기본",
};
