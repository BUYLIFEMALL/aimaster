
## 2026-10-16 설정 화면 `?error=naver_app_missing` 안내 미표시 (Claude Code 윈도우 발견)
- 근거: v1.09 검수 중 네이버 앱 미등록 시험 계정으로 연결 버튼 → `/settings?error=naver_app_missing`로 돌아오지만 화면에 아무 안내가 없음.
- 영향: 회원이 왜 연결이 안 되는지 모름. 우선순위: 중간. 상태: 미처리.
- 다음 첫 단계: `src/app/(dashboard)/settings/page.tsx`에서 searchParams.error를 읽어 "네이버 앱 Client ID/Secret을 먼저 등록해주세요" 배너 표시(다른 error 코드도 함께 점검).
