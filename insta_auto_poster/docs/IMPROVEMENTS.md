
## 2026-10-16 Facebook 방식·Instagram 방식이 같은 앱 ID 칸을 공유 (Claude Code 윈도우 발견)
- 근거: Facebook 로그인 방식은 Facebook 앱 ID/시크릿, Instagram 로그인 방식은 Instagram 앱 ID/시크릿이 필요한데 둘 다 `meta_app_id`/`meta_app_secret` 하나를 씀 → 한 방식에 맞춰 넣으면 다른 방식이 실패(시험 계정: Facebook 앱 ID라 Instagram 방식 "Invalid platform app").
- 영향: 두 방식을 오가는 회원 혼란. 우선순위: 중간. 상태: 안내 문구로 임시 조치(v1.10), 근본 수정 미처리.
- 제안: 공용 `user_api_keys` provider에 `facebook_app_id`/`facebook_app_secret` 추가(CHECK 제약 변경 = DB 스키마 변경, **사전 승인 필요**) → Facebook 방식은 새 칸, Instagram 방식은 기존 칸 사용.
