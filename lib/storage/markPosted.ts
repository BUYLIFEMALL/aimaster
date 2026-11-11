// 공용 기준 코드 `storage-mark-posted` — 회원 자료가 블로그·SNS·유튜브에 「포스팅됨」을 기록한다 (2026-11-11, DB 0068)
// 왜: 유료 저장 구독은 「생성 콘텐츠」와 「포스팅된 콘텐츠」의 보관 기간이 다르다(예: 라이트 30일 / 90일).
//     포스팅된 파일만 더 오래 남기려면 발행에 성공한 순간 그 파일을 표시해야 한다.
// 기준: 메인 사이트 lib/storage/markPosted.ts · 사본은 발행 기능이 있는 프로그램이 다음 배포 때 붙인다
//       (docs/HANDOFF_20261111_STORAGE_WIDGET_ROLLOUT.md §9).
// 한 번이라도 이 함수를 부른 버킷은 「표시 중인 버킷」이 되어, 표시가 없는 파일은 생성 콘텐츠 기간으로 정리된다.
// 아직 부르지 않은 버킷의 파일은 모두 포스팅된 것으로 보고 길게 보관한다(주인님 결정).
// 서버 전용 — 서버 키(service role) 클라이언트로만 부른다. 외부 라이브러리 없음. 실패해도 발행 흐름을 막지 않는다.
// 쓰는 법(발행 성공 "직후"):
//   await markPosted(admin, { userId: user.id, files: [imageUrl1, imageUrl2], program: "naver-blog-agent", postUrl });
//   files 에는 Supabase 공개 주소(…/storage/v1/object/public/<버킷>/<경로>) 또는 { bucket, path } 를 넣는다.

type RpcClient = {
  rpc: (fn: string, args?: Record<string, unknown>) => PromiseLike<{ data: unknown; error: { message: string } | null }>;
};

export type PostedFile = string | { bucket: string; path: string };

/** Supabase 저장소 주소에서 버킷과 경로를 꺼낸다. 다른 주소면 null. */
export function parseStorageUrl(url: string): { bucket: string; path: string } | null {
  const m = /\/storage\/v1\/(?:object|render\/image)\/(?:public|sign|authenticated)\/([^/]+)\/([^?#]+)/.exec(url);
  if (!m) return null;
  try {
    return { bucket: decodeURIComponent(m[1]), path: decodeURIComponent(m[2]) };
  } catch {
    return { bucket: m[1], path: m[2] };
  }
}

/** 발행에 쓴 파일들을 「포스팅됨」으로 기록. 기록한 파일 수를 돌려준다(실패하면 0). */
export async function markPosted(
  service: RpcClient,
  opts: { userId: string; files: PostedFile[]; program: string; postUrl?: string | null },
): Promise<number> {
  const byBucket = new Map<string, string[]>();
  for (const f of opts.files) {
    const loc = typeof f === "string" ? parseStorageUrl(f) : f;
    if (!loc?.bucket || !loc.path) continue;
    const list = byBucket.get(loc.bucket) ?? [];
    list.push(loc.path);
    byBucket.set(loc.bucket, list);
  }
  let total = 0;
  for (const [bucket, names] of byBucket) {
    try {
      const { data, error } = await service.rpc("member_mark_posted", {
        p_user: opts.userId,
        p_bucket: bucket,
        p_names: [...new Set(names)],
        p_program: opts.program,
        p_url: opts.postUrl ?? null,
      });
      if (!error) total += Number(data ?? 0);
    } catch {
      // 기록 실패는 발행 결과에 영향을 주지 않는다(표시가 없으면 생성 기간으로 정리될 수 있으니 로그만 남김)
      console.warn("[markPosted] 포스팅 기록 실패", bucket);
    }
  }
  return total;
}
