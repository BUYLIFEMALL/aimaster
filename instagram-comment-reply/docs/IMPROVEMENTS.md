
## 2026-10-16 시험 계정 Instagram 연결 "Invalid platform app" (Claude Code 윈도우 발견)
- 근거: v1.08 검수 중 시험 계정(buylifemall@naver.com)으로 [계정 연결하기]·[새 주소로 연결] 모두 instagram.com 오류 "요청 매개변수가 유효하지 않습니다: Invalid platform app".
- 영향: 시험 계정으로 실제 연결 검수 불가(회원 기능 자체 문제인지 미확인). 우선순위: 중간. 상태: 미처리.
- 추정 원인: 등록된 meta_app_id가 "Instagram API(Instagram 로그인)" 제품의 앱 ID가 아니라 Facebook 앱 ID일 가능성.
- 다음 첫 단계: 주인님과 시험 계정 Meta 앱의 Instagram 앱 ID 확인 → 재등록 후 연결 재시험. 관련 파일: `lib/instagram/client.ts`, 설정 화면 안내 문구.
- **2026-10-16 갱신(처리됨)**: 원인 확인 — 시험 계정의 Instagram 앱 ID 칸에 Facebook 앱 ID가 들어 있었음(코드 문제 아님). v1.09에서 설정 화면 안내 상자 추가(instagram-dm-reply v1.08·insta_auto_poster v1.10 동일). 남은 일: 주인님이 시험 계정에 올바른 Instagram 앱 ID/시크릿 재등록 후 연결 재시험.

## 2026-10-17 타 프로그램 탐색 선제 기록 (Claude Code 맥미니, `threads-comment-reply` v1.10 작업 중 — 원칙 ⑫)
| # | 구분 | 내용 | 근거 | 우선순위 | 상태 |
|---|---|---|---|---|---|
| A | ② UI·편의성 | 휴대폰 ☰ 메뉴 없음(사이드바가 휴대폰에서 위로 쌓임, 원칙 19) | `components/layout/Sidebar.tsx` | 높음 | **구현(v1.14, 배포 대기)** |
| B | ② UI·편의성 | 📖 매뉴얼·`/guide`·대시보드 없음(`/`→`/media`), 밝은 테마 | 라우트·`next.config.mjs` | 높음 | **구현(v1.14, 배포 대기)** |
| C | ① 로직·기능 | 구조가 `threads-comment-reply`와 같음(media·comments·history·settings) → v1.10의 대기 배지·댓글 모양·대시보드·매뉴얼을 거의 그대로 이식 가능. 색은 인스타 라이트(흰 바탕 + 인스타 그라데이션 포인트) 권장(현황판 47번 라이트) | 두 폴더 비교 | 중간 | 제안 |
| D | ③ 타 프로그램 연계 | 쓰레드·인스타·유튜브 댓글자동화 3종 「통합 댓글 받은편지함」 | 3개 폴더 | 낮음 | 제안 |
| E | ① 로직·기능 | 답글 이력 최근 50건만 — youtube-auto-reply의 검색·페이지 나눔 이식 가능 | `history/page.tsx` | 낮음 | 제안 |
| F | ② UI·편의성 | 댓글 검토 카드에 게시물 썸네일(`ig_media.thumbnail_url`)을 함께 보여 주면 어떤 게시물 댓글인지 바로 앎 | `comments/page.tsx` | 낮음 | 제안 |
