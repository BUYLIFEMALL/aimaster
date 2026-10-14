# portrait-photo 인수인계 (CLI_HANDOFF)

## 현재 상태 (2026-10-14, v1.01)
- 신규 프로그램 **AI 인물사진 자동화** 구현·등록·배포 완료. 주소: https://portrait-photo.buylife.xyz (옛 `portrait-photo-tau.vercel.app`도 유지).
- 등록: `programs`(slug `portrait-photo`, 카테고리 이미지, 배지 `new`(FREE 아님), 최소 등급 일반), 요금제 3종(1/2/3개월 10,000/20,000/30,000), VIP 접근, 실사 16:9 썸네일(§13). 마이그레이션 SQL: `supabase/migrations/0001_register_program.sql`.
- DB 스키마 변경 없음(테이블 없음). 키는 공용 `user_api_keys`.
- Vercel: 프로젝트 `portrait-photo`(팀 buylife), 환경변수 4종은 `scripts/add-portrait-photo-vercel-env.mjs`로 등록. 배포: `cd portrait-photo && vercel deploy --prod --yes --scope buylife`. 새 도메인은 인증서 발급 동안(수 분) `ERR_CONNECTION_CLOSED`가 나올 수 있다 — `curl --retry`로 기다린다.

## 검수 증거
- 단위 6/6, `tsc --noEmit` 무오류, `npm run build` 통과.
- 실제 Gemini: flash(증명사진 프리셋) 9초·1.5MB, pro(비즈니스 프리셋) 19초·0.6MB. 결과는 얼굴 동일성·순백 배경·정장 모두 양호.
- 운영 화면: 동의 체크 안내 → 생성 → 순백 정리·가이드선 → PNG·413×531 저장 → 기록 → 전체 삭제.

## 이어서 할 일
- 일반 회원 로그인 흐름 재확인(주인님 로그인 후).
- v1.02 후보는 `AGENTS.md`의 "남은 일". 계획서·원본 분석: `docs/DEVELOPMENT_PLAN.md`.

## 함정
- 원본(AI Studio)은 목적 프리셋이 존재하지 않는 옵션 id를 가리켜 옵션이 조용히 안 바뀌는 버그가 있었다 → `tests/portrait.test.mjs`가 모든 프리셋 id를 검사한다.
- 한국어 라벨을 영어 프롬프트에 그대로 넣으면 안 된다(색 이름은 `COLOR[].name`).
- 순백 정리는 가장자리와 이어진 밝은 영역만 바꾼다. 배경이 어둡거나 채도가 높으면 거의 바뀌지 않는다(UI가 비율을 보여 주고 3% 미만·90% 초과면 경고).
- 한 장짜리 요약: [docs/HANDOFF_PORTRAIT_PHOTO_2026-10-14.md](../../docs/HANDOFF_PORTRAIT_PHOTO_2026-10-14.md)
