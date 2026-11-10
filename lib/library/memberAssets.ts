// 서버 전용(서버 키 클라이언트를 받는다 — 클라이언트 컴포넌트에서 import 금지).
// 「내 자료함」(2026-11-11, docs/PLAN_20261111_MEMBER_LIBRARY.md) — 회원 본인 생성물 색인 member_assets를 읽고,
// 비공개 버킷 파일은 서버가 1시간 서명 주소로 연다. 원본 파일은 옮기지 않는다.
// 격리: 목록은 user_id로 거르고, 서명 전 경로 첫 폴더 = 회원 번호를 다시 확인한다(남의 파일 서명 방지).

type SupabaseLike = {
  from: (table: string) => any; // eslint-disable-line @typescript-eslint/no-explicit-any
  storage: { from: (bucket: string) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any
};

export type AssetKind = "audio" | "image" | "video" | "text" | "file";

export interface MemberAsset {
  id: string;
  sourceSlug: string;
  kind: AssetKind;
  title: string;
  durationS: number | null;
  createdAt: string;
  /** 바로 열 수 있는 주소(서명 주소 또는 공개·외부 주소). 회원 PC에만 있는 자료는 null */
  playUrl: string | null;
  /** 원본이 회원 PC에만 있음(서버에 파일 없음) */
  localOnly: boolean;
  /** 외부 임시 주소(예: Suno — 약 14일 뒤 만료 가능) */
  external: boolean;
  style: string;
  /** 글: 본문 발췌(200자) */
  excerpt: string;
  /** 글: 원본 상태 값(그대로) */
  status: string | null;
  /** 글: 실제 발행됨(발행 1년 보관 대상) */
  published: boolean;
}

const SIGN_TTL = 60 * 60;

type Row = {
  id: string; user_id: string; source_slug: string; kind: AssetKind; title: string;
  bucket: string | null; path: string | null; url: string | null;
  duration_s: number | null; meta: Record<string, unknown> | null; created_at: string;
};

/** 회원 본인 자료 목록(최근순). service는 서버 키 클라이언트 — 반드시 userId로 거른다. */
export async function listMemberAssets(service: SupabaseLike, userId: string, opts: { kind?: AssetKind; limit?: number } = {}): Promise<MemberAsset[]> {
  let q = service
    .from("member_assets")
    .select("id, user_id, source_slug, kind, title, bucket, path, url, duration_s, meta, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(Math.min(opts.limit ?? 120, 300));
  if (opts.kind) q = q.eq("kind", opts.kind);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  const rows = ((data ?? []) as Row[]).filter((r) => r.user_id === userId);

  // 버킷별로 묶어 한 번에 서명(경로가 회원 폴더로 시작하는 것만)
  const byBucket = new Map<string, string[]>();
  for (const r of rows) {
    if (r.bucket && r.path && r.path.startsWith(`${userId}/`)) byBucket.set(r.bucket, [...(byBucket.get(r.bucket) ?? []), r.path]);
  }
  const signed = new Map<string, string>();
  await Promise.all([...byBucket.entries()].map(async ([bucket, paths]) => {
    const { data: s } = await service.storage.from(bucket).createSignedUrls(paths, SIGN_TTL);
    for (const item of (s ?? []) as { path: string | null; signedUrl: string | null }[]) {
      if (item.path && item.signedUrl) signed.set(`${bucket}:${item.path}`, item.signedUrl);
    }
  }));

  return rows.map((r) => {
    const meta = r.meta ?? {};
    const own = r.bucket && r.path && r.path.startsWith(`${userId}/`) ? signed.get(`${r.bucket}:${r.path}`) ?? null : null;
    const url = r.url && /^https:\/\//.test(r.url) ? r.url : null;
    return {
      id: r.id,
      sourceSlug: r.source_slug,
      kind: r.kind,
      title: r.title || "제목 없음",
      durationS: r.duration_s != null ? Math.round(Number(r.duration_s)) : typeof meta.duration === "number" ? Math.round(meta.duration) : null,
      createdAt: r.created_at,
      playUrl: own ?? url,
      localOnly: meta.local_only === true,
      external: meta.external === true,
      style: typeof meta.style === "string" ? meta.style : "",
      excerpt: typeof meta.excerpt === "string" ? meta.excerpt : "",
      status: typeof meta.status === "string" && meta.status ? meta.status : null,
      published: meta.published === true,
    };
  });
}
