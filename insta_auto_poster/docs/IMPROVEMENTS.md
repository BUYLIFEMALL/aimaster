
## 2026-10-16 Facebook 방식·Instagram 방식이 같은 앱 ID 칸을 공유 (Claude Code 윈도우 발견)
- 근거: Facebook 로그인 방식은 Facebook 앱 ID/시크릿, Instagram 로그인 방식은 Instagram 앱 ID/시크릿이 필요한데 둘 다 `meta_app_id`/`meta_app_secret` 하나를 씀 → 한 방식에 맞춰 넣으면 다른 방식이 실패(시험 계정: Facebook 앱 ID라 Instagram 방식 "Invalid platform app").
- 영향: 두 방식을 오가는 회원 혼란. 우선순위: 중간. 상태: 안내 문구로 임시 조치(v1.10), 근본 수정 미처리.
- 제안: 공용 `user_api_keys` provider에 `facebook_app_id`/`facebook_app_secret` 추가(CHECK 제약 변경 = DB 스키마 변경, **사전 승인 필요**) → Facebook 방식은 새 칸, Instagram 방식은 기존 칸 사용.
- **2026-10-16 처리됨(v1.11, 주인님 승인)**: provider `facebook_app_id`/`facebook_app_secret` 추가(루트 0037) + Facebook 방식 전용 칸. 상세 `AGENTS.md` v1.11.

## 2026-10-17 (Claude Code 윈도우) 발견 사항
- [미처리·중] 모바일(767px 이하) 좌측 메뉴: `Sidebar.tsx`가 휴대폰에서 위로 쌓이는 전체 폭 블록이며 ☰ 접는 메뉴가 아님(루트 CLAUDE.md 원칙 19). 다음 첫 단계: `markdown-studio`의 위쪽 접는 메뉴 + 767px 전환 CSS 이식 후 390px 검수.
- [미처리·하] Instagram 로그인 방식 실제 연결 성공은 미확인(관리자 계정 동의 화면까지 확인). 시험 계정 Instagram 앱 ID 교체 후 재검수 필요.
- [처리됨 v1.13~v1.15] 연결 버튼 색 구분, 등록 주소 한눈에 보기·복사 버튼, 매뉴얼 페이지.
| 2026-10-17 | ① 로직 | `scripts/test-own-meta-app.cjs` 8행이 `getFacebookAuthorizeUrl(state: string, appId: string)` 옛 모양을 찾아 실패 — 도메인 이전(v1.13~) 때 redirectUri 매개변수가 늘었음. 테스트 기대값 갱신 필요(운영 코드 문제 아님) | `scripts/test-own-meta-app.cjs` | 낮음 | 제안(미구현) — Claude Code 윈도우 발견 |
