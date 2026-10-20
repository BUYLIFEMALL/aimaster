# 개발 플랜 — ② YouTube 연결 하나로 합치기 · ③ shots Facebook 앱 키 이름 맞추기

- 작성: 2026-10-20 Claude Code(윈도우) · 대상: ① AIMaster 운영(DB ref `esgxyikcnnvmlhygjkth`)
- 근거: 회원 연동 정보 공용 저장 ⑤단계 남은 일 2·3번(주인님 지시), [`MEMBER_INTEGRATIONS.md`](MEMBER_INTEGRATIONS.md) §7
- 상태: ✅ 완료(2026-10-20, 주인님 「진행해줘」) — 유튜브 댓글 v1.16(v1.15에서 번호 정정, 배포 `youtube-auto-reply-jz4ln0czb`)·shots v1.23(`shots-bqoxk3vq3`)

## ② YouTube 연결 하나로 합치기 (유튜브 댓글 v1.15 → shots 다음 버전)
**문제**: 유튜브 댓글은 `youtube.force-ssl`, shots는 `youtube.upload`+`youtube.readonly`만 받아서, 같은 Google 앱·같은 채널인데도 서로의 공용 토큰을 쓰지 못한다(권한을 합쳐 기록하지 않는 규칙).

**해결**: Google OAuth 「추가 권한 요청」(`include_granted_scopes=true`)으로 두 프로그램 권한을 한 번에 받는다.
1. 두 프로그램의 연결 화면에 선택 항목 「다른 YouTube 프로그램 권한도 함께 받기」(기본 꺼짐). 켜면 세 권한(`force-ssl`·`upload`·`readonly`) + `include_granted_scopes=true`로 요청.
2. 콜백은 Google 토큰 응답의 **실제 받은 권한(`scope`)** 을 공용 표 `granted_scopes`에 기록(지금은 요청한 목록을 적음 — 실제 값이 더 정확).
3. 이후 두 프로그램 모두 공용 계정의 권한 확인을 통과 → 한 번 연결로 함께 사용. 기존 자기 표 대체 경로는 그대로.
- 회원 쪽 할 일: 없음(같은 Google 앱 사용). 동의 화면에 권한이 하나 더 보인다.
- 위험: 회원 Google 앱이 「테스트」 상태면 민감 권한 경고 화면이 그대로 나온다(지금과 같음). 받은 권한이 요청보다 적으면(회원이 일부 체크 해제) 실제 값만 기록돼 자동으로 자기 표로 돌아간다.

## ③ shots Facebook 앱 키 이름 맞추기 (shots 다음 버전)
**문제**: Facebook 로그인에 INSTA는 `facebook_app_id`(없으면 `meta_app_id`), shots는 `meta_app_id`만 쓴다. `meta_app_id`는 원래 Instagram 앱 칸이라, 두 프로그램을 쓰는 회원은 같은 칸에 다른 앱 값을 넣어야 할 수 있다.

**해결**: INSTA v1.11과 같은 순서로 읽는다.
1. shots 연결 시작·콜백: 앱 ID·시크릿 = `facebook_app_id`·`facebook_app_secret`, 없으면 지금처럼 `meta_app_id`·`meta_app_secret`(기존 연결·기존 회원 그대로 동작).
2. 설정 화면: 「Facebook 앱 ID / 시크릿」 칸 추가(INSTA에서 넣었으면 「등록됨」으로 보임 — 같은 공용 키), 기존 Meta 칸은 「예전 칸(비워 두어도 됨)」 안내로 유지.
3. 공용 표 `app_ref`도 실제 쓴 앱 ID로 기록(⑤단계 코드가 이미 그 값을 받음).
- DB 변경 없음(`facebook_app_id` 제공자는 INSTA가 이미 사용 중 — 구현 전 운영 DB 허용 목록 확인).

## 순서·검수·비용
- 순서: ② 유튜브 댓글 → ② shots → ③ shots(같은 배포에 묶지 않고 작업 단위별 커밋, shots 배포는 ②③ 묶어 1회 가능).
- 검수: tsc·build·권한 테스트, 크롬(시험 회원) 설정 화면 표시·선택 항목, 인증 주소에 권한·`include_granted_scopes`가 들어가는지(구글 화면까지 이동만, 동의는 하지 않음). 실제 업로드·답글 없음.
- 비용: 유료 호출 없음, Vercel 빌드 2~3회 순차, DB 쓰기는 버전만.
