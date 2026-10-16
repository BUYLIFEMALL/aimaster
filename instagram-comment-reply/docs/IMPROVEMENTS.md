
## 2026-10-16 시험 계정 Instagram 연결 "Invalid platform app" (Claude Code 윈도우 발견)
- 근거: v1.08 검수 중 시험 계정(buylifemall@naver.com)으로 [계정 연결하기]·[새 주소로 연결] 모두 instagram.com 오류 "요청 매개변수가 유효하지 않습니다: Invalid platform app".
- 영향: 시험 계정으로 실제 연결 검수 불가(회원 기능 자체 문제인지 미확인). 우선순위: 중간. 상태: 미처리.
- 추정 원인: 등록된 meta_app_id가 "Instagram API(Instagram 로그인)" 제품의 앱 ID가 아니라 Facebook 앱 ID일 가능성.
- 다음 첫 단계: 주인님과 시험 계정 Meta 앱의 Instagram 앱 ID 확인 → 재등록 후 연결 재시험. 관련 파일: `lib/instagram/client.ts`, 설정 화면 안내 문구.
- **2026-10-16 갱신(처리됨)**: 원인 확인 — 시험 계정의 Instagram 앱 ID 칸에 Facebook 앱 ID가 들어 있었음(코드 문제 아님). v1.09에서 설정 화면 안내 상자 추가(instagram-dm-reply v1.08·insta_auto_poster v1.10 동일). 남은 일: 주인님이 시험 계정에 올바른 Instagram 앱 ID/시크릿 재등록 후 연결 재시험.
