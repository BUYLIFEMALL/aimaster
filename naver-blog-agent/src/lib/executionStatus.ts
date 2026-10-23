export interface ExecutionStatus {
  runId: string;
  stage: string;
  message: string;
  done: number;
  total: number;
  startedAt: string;
  updatedAt: string;
  leaseExpiresAt: string;
  expired: boolean;
}

export const executionStageLabels: Record<string, string> = {
  claimed: "확장이 원고를 가져갔습니다", waiting_login: "네이버 화면·로그인 확인 중",
  writing: "본문·이미지 입력 중", final_publish: "최종 발행 결과 확인 중",
  prepared: "발행 전 준비 완료", published: "발행 완료", failed: "확인 필요",
  abandoned: "회원 확인 후 임시보관으로 복구", verify_publish: "예약 목록 확인 중",
};
