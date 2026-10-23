// v1.11: DB 조회 장애와 "자료 없음"을 구분한다(개선 원장 #15).
// 예전엔 조회 오류를 확인하지 않아 장애가 나도 "아직 리포트가 없습니다"처럼 빈 화면으로 보였다.

export interface QueryResultLike {
  error?: { message?: string; code?: string } | null;
}

/** 이름 붙인 조회 결과 중 오류가 난 것의 이름 목록 */
export function failedQueries(named: Record<string, QueryResultLike>): string[] {
  return Object.entries(named)
    .filter(([, r]) => !!r?.error)
    .map(([name]) => name);
}

/** 서버 로그에 어떤 조회가 실패했는지만 남긴다(회원 자료·키 값은 남기지 않음) */
export function logLoadErrors(page: string, named: Record<string, QueryResultLike>): string[] {
  const failed = failedQueries(named);
  for (const name of failed) {
    const e = named[name].error!;
    console.error(`[load-error] ${page} · ${name}: ${e.code ?? ""} ${e.message ?? ""}`.trim());
  }
  return failed;
}
