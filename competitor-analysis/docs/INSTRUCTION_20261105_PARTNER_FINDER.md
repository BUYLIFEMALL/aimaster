# [맥미니 → 윈도우] competitor-analysis v1.10 「🤝 제휴 타깃 찾기」 마무리 (2026-11-05)

먼저 읽기: `../AGENTS.md` 맨 아래 v1.10 절 · 플랜 `../../docs/analysis-biz-contact-finder-20261105/PLAN.md`

1. **DB 초안 검토 → 주인님 DB 변경 승인 → 운영 적용**(ref esgxyikcnnvmlhygjkth): `supabase/migrations/20261105140000_partner_channels.sql`. 기존 트리거 `competitor_stamp_content_created_at`이 새 표에도 created_at을 DB 시각으로 찍는지(else 분기) 확인. `cron.schedule` 이름 충돌 확인.
2. **시험 추가**: `lib/naver/search.ts`의 응답→채널 변환(blog·cafe·local·shop, 중복 합치기, http(s)만), `searchPartnersAction`(동의 없음·키 없음·종류 없음 거부, 다른 회원 행 수정·삭제 차단), 연락처 형식 검사. 기존 `npm run test:*` 모두.
3. `npm run build` → **빌드 1회 주인님 승인** → 배포 → 버전 v1.10(`lib/version.ts`·DB `programs.version`) + 미배포 대기였던 안내 문구 정정(`87b773ef2`) 함께.
4. 실물(맥미니 ego): 시험 계정에 네이버 검색 키 등록 → 동의 → 「공동구매」 블로그·업체 찾기(무료 쿼터) → 채널 열어 공개 연락처 적기 → CSV.
5. 완료 후 프로그램 비교표 카드·외부 분석표(EXT-MKT-03·07)·`programs.detail_sections` 갱신.

지킬 것: 서버가 채널 페이지를 긁는 코드 추가 금지(공식 API만) · 동시 빌드 금지 · 경로 지정 커밋 · 끝에 비용 리포트.
