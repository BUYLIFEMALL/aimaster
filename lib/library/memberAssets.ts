// ★ 공용 기준 코드 `member-assets-client` (기준: 메인 사이트 lib/library/memberAssets.ts — 사본은 수정 금지, 기준만 고치고
//   `node scripts/check-shared-modules.mjs --sync`). 사용 안내: docs/MEMBER_LIBRARY.md
// 서버 전용(서버 키 클라이언트를 받는다 — 클라이언트 컴포넌트·브라우저에서 import 금지). 외부 라이브러리 의존 없음.
// 「내 자료함」(2026-11-11, docs/PLAN_20261111_MEMBER_LIBRARY.md) — 회원 본인 생성물 색인 member_assets를 읽고,
// 비공개 버킷 파일은 서버가 1시간 서명 주소로 연다. 원본 파일은 옮기지 않는다.
// 격리: 모든 조회를 userId로 거르고, 서명 전 경로 첫 폴더 = 회원 번호를 다시 확인한다(남의 파일 서명 방지).
// 저장해 둘 값은 id가 아니라 sourceRef(원본 표:원본 번호:순번) — 미디어 줄은 원본이 고쳐지면 다시 만들어져 id가 바뀔 수 있다.

type SupabaseLike = {
  from: (table: string) => any; // eslint-disable-line @typescript-eslint/no-explicit-any
  storage: { from: (bucket: string) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any
};

export type AssetKind = "audio" | "image" | "video" | "text" | "file";

export interface MemberAsset {
  id: string;
  /** 바뀌지 않는 원본 참조 — 다른 프로그램은 이 값을 저장했다가 signMemberAssetByRef로 다시 연다 */
  sourceRef: string;
  sourceSlug: string;
  kind: AssetKind;
  title: string;
  durationS: number | null;
  createdAt: string;
  /** 바로 열 수 있는 주소(서명 주소 또는 공개·외부 주소). 회원 PC에만 있는 자료·글은 null(글은 발행 주소) */
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

export const MEMBER_ASSET_SIGN_TTL = 60 * 60;

type Row = {
  id: string; user_id: string; source_slug: string; kind: AssetKind; title: string;
  bucket: string | null; path: string | null; url: string | null;
  source_table: string; source_id: string; source_index: number;
  duration_s: number | null; meta: Record<string, unknown> | null; created_at: string;
};

const COLUMNS = "id, user_id, source_slug, kind, title, bucket, path, url, source_table, source_id, source_index, duration_s, meta, created_at";

const isOwnPath = (r: Pick<Row, "bucket" | "path">, userId: string) => !!(r.bucket && r.path && r.path.startsWith(`${userId}/`));

function toAsset(r: Row, signedUrl: string | null): MemberAsset {
  const meta = r.meta ?? {};
  const url = r.url && /^https:\/\//.test(r.url) ? r.url : null;
  return {
    id: r.id,
    sourceRef: `${r.source_table}:${r.source_id}:${r.source_index}`,
    sourceSlug: r.source_slug,
    kind: r.kind,
    title: r.title || "제목 없음",
    durationS: r.duration_s != null ? Math.round(Number(r.duration_s)) : typeof meta.duration === "number" ? Math.round(meta.duration) : null,
    createdAt: r.created_at,
    playUrl: signedUrl ?? url,
    localOnly: meta.local_only === true,
    external: meta.external === true,
    style: typeof meta.style === "string" ? meta.style : "",
    excerpt: typeof meta.excerpt === "string" ? meta.excerpt : "",
    status: typeof meta.status === "string" && meta.status ? meta.status : null,
    published: meta.published === true,
  };
}

/**
 * 회원 본인 자료 목록(최근순). service는 서버 키 클라이언트 — 반드시 userId로 거른다.
 * @param opts.kind 종류 하나만 · opts.sourceSlugs 만든 프로그램만(예: ["ai-music-studio"]) · opts.limit 최대 300
 */
export async function listMemberAssets(
  service: SupabaseLike,
  userId: string,
  opts: { kind?: AssetKind; sourceSlugs?: string[]; limit?: number } = {},
): Promise<MemberAsset[]> {
  let q = service
    .from("member_assets")
    .select(COLUMNS)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(Math.min(opts.limit ?? 120, 300));
  if (opts.kind) q = q.eq("kind", opts.kind);
  if (opts.sourceSlugs?.length) q = q.in("source_slug", opts.sourceSlugs);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  const rows = ((data ?? []) as Row[]).filter((r) => r.user_id === userId);

  // 버킷별로 묶어 한 번에 서명(경로가 회원 폴더로 시작하는 것만)
  const byBucket = new Map<string, string[]>();
  for (const r of rows) if (isOwnPath(r, userId)) byBucket.set(r.bucket as string, [...(byBucket.get(r.bucket as string) ?? []), r.path as string]);
  const signed = new Map<string, string>();
  await Promise.all([...byBucket.entries()].map(async ([bucket, paths]) => {
    const { data: s } = await service.storage.from(bucket).createSignedUrls(paths, MEMBER_ASSET_SIGN_TTL);
    for (const item of (s ?? []) as { path: string | null; signedUrl: string | null }[]) {
      if (item.path && item.signedUrl) signed.set(`${bucket}:${item.path}`, item.signedUrl);
    }
  }));

  return rows.map((r) => toAsset(r, isOwnPath(r, userId) ? signed.get(`${r.bucket}:${r.path}`) ?? null : null));
}

/**
 * 저장해 둔 sourceRef로 자료 하나를 다시 연다(새 서명 주소 포함). 내 자료가 아니거나 원본이 지워졌으면 null.
 * 예) 영상 프로젝트를 다시 열 때 가져온 곡의 듣기 주소를 새로 받는다.
 */
export async function signMemberAssetByRef(service: SupabaseLike, userId: string, sourceRef: string): Promise<MemberAsset | null> {
  const m = /^([a-z0-9_]{1,64}):([0-9a-f-]{36}):(\d{1,4})$/i.exec(sourceRef);
  if (!m) return null;
  const { data, error } = await service
    .from("member_assets")
    .select(COLUMNS)
    .eq("user_id", userId).eq("source_table", m[1]).eq("source_id", m[2]).eq("source_index", Number(m[3]))
    .maybeSingle();
  if (error || !data) return null;
  const row = data as Row;
  if (row.user_id !== userId) return null;
  let signedUrl: string | null = null;
  if (isOwnPath(row, userId)) {
    const { data: s } = await service.storage.from(row.bucket as string).createSignedUrl(row.path as string, MEMBER_ASSET_SIGN_TTL);
    signedUrl = s?.signedUrl ?? null;
  }
  return toAsset(row, signedUrl);
}
