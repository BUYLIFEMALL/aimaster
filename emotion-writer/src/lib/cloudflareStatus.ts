/**
 * Cloudflare Workers AI 공용 키 등록 상태 검사 순수 로직
 * (Next.js server-only 격리 의존성 없이 단위 테스트 및 서버 환경 모두에서 사용)
 */

export interface CloudflareKeyCheckClient {
  from(table: string): any;
}

/**
 * Cloudflare Workers AI(FLUX-1 Schnell)용 공용 키 등록 여부 확인
 * user_api_keys의 cloudflare_workers_ai_token과 cloudflare_account_id 두 키가 모두 존재하는지 검사(평문 반환 0).
 */
export async function checkCloudflareRegistered(
  client: CloudflareKeyCheckClient,
  userId: string,
): Promise<boolean> {
  const { data, error } = await client
    .from("user_api_keys")
    .select("provider,api_key")
    .eq("user_id", userId)
    .in("provider", ["cloudflare_workers_ai_token", "cloudflare_account_id"]);

  if (error) {
    throw new Error("Cloudflare 키 등록 상태를 확인하지 못했습니다.");
  }

  const hasToken =
    data?.some(
      (r: { provider: string; api_key?: string | null }) =>
        r.provider === "cloudflare_workers_ai_token" && Boolean(r.api_key),
    ) || false;

  const hasAccount =
    data?.some(
      (r: { provider: string; api_key?: string | null }) =>
        r.provider === "cloudflare_account_id" && Boolean(r.api_key),
    ) || false;

  return hasToken && hasAccount;
}

/**
 * Settings 초기 데이터 로드 헬퍼
 * 조회 실패 시 false로 단정하지 않고 null(알 수 없음/확인 필요)을 반환하여 미등록 오표시 방지.
 */
export async function resolveInitialCloudflareStatus(
  fetcher: () => Promise<boolean>,
): Promise<boolean | null> {
  try {
    return await fetcher();
  } catch {
    return null; // 초기 조회 실패는 null로 반환하여 error/재확인 권장 표기
  }
}
