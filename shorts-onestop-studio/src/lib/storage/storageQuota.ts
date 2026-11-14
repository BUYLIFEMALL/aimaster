// 공용 기준 코드 `storage-quota-client` — 회원 저장공간이 가득 찼으면 새 저장(유료 AI 생성 포함)을 막는다 (2026-11-11 저장공간 2단계)
// 기준: 메인 사이트 lib/storage/storageQuota.ts · 사본은 각 프로그램이 다음 배포 때 붙인다(docs/HANDOFF_20261111_STORAGE_WIDGET_ROLLOUT.md §8)
// 판정은 DB 함수 member_storage_check 한 곳(0065): 관리자·시험 계정·무제한은 항상 허용, 80% 넘고 측정이 1시간 지났으면 먼저 다시 센다.
// 서버 전용 — 서버 키(service role) 클라이언트로만 부른다. 외부 라이브러리 없음.
// 쓰는 법(유료 AI 호출 "전"에):
//   const q = await checkStorageQuota(admin, user.id, 예상바이트);   // 예상 크기를 모르면 0
//   if (!q.allowed) return NextResponse.json({ error: q.message, code: "STORAGE_FULL", upgradeUrl: q.upgradeUrl }, { status: 403 });

type RpcClient = {
  rpc: (fn: string, args?: Record<string, unknown>) => PromiseLike<{ data: unknown; error: { message: string } | null }>;
};

export interface StorageQuotaResult {
  allowed: boolean;
  usedBytes: number;
  quotaBytes: number | null; // null = 무제한
  ratio: number | null;
  message: string | null; // 막혔을 때 회원에게 보여 줄 문장
  upgradeUrl: string;
}

export const STORAGE_FULL_CODE = "STORAGE_FULL";
const UPGRADE_URL = "https://www.buylife.xyz/storage";

/** 저장해도 되는지 판정. DB 조회가 실패하면 회원 작업을 막지 않고 허용으로 돌려준다(판정 장애로 서비스가 멈추지 않게). */
export async function checkStorageQuota(service: RpcClient, userId: string, addBytes = 0): Promise<StorageQuotaResult> {
  try {
    const { data, error } = await service.rpc("member_storage_check", { uid: userId, add_bytes: Math.max(0, Math.round(addBytes)) });
    const row = Array.isArray(data) ? (data[0] as Record<string, unknown> | undefined) : undefined;
    if (error || !row) return { allowed: true, usedBytes: 0, quotaBytes: null, ratio: null, message: null, upgradeUrl: UPGRADE_URL };
    return {
      allowed: row.allowed !== false,
      usedBytes: Number(row.used_bytes ?? 0),
      quotaBytes: row.quota_bytes === null || row.quota_bytes === undefined ? null : Number(row.quota_bytes),
      ratio: row.ratio === null || row.ratio === undefined ? null : Number(row.ratio),
      message: (row.message as string | null) ?? null,
      upgradeUrl: (row.upgrade_url as string) || UPGRADE_URL,
    };
  } catch {
    return { allowed: true, usedBytes: 0, quotaBytes: null, ratio: null, message: null, upgradeUrl: UPGRADE_URL };
  }
}
