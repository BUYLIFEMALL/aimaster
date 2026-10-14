# portrait-photo 인수인계 (CLI_HANDOFF)

## 현재 상태 (2026-10-14, v1.10)
- **v1.10**: 규격별 조정 값 기억, 일괄 모드 사진별 영역 지정·규격 일괄 ZIP 저장. 규격은 16종 유지. DB 변경 없음. 코드·package(1.0.10)·DB `programs.version` v1.10. 검수: 단위 16/16, tsc·빌드, 운영 화면 확인(테스트 데이터·저장 키 삭제).

### v1.09 기준
- **v1.09**: 자르기 영역 미리보기·수동 조정(드래그·슬라이더·머리 비율 표시), 규격 16종(인도네시아 전자비자 추가). DB 변경 없음. 코드·package(1.0.9)·DB `programs.version` v1.09. 검수: 단위 15/15, tsc·빌드, 운영 화면 확인(테스트 데이터 삭제).

### v1.08 기준
- **v1.08**: 얼굴 확대 자르기(머리 비율이 작게 나올 때 규격 크기로 더 가깝게 잘라 저장, 얼굴 중심 반영), 규격 15종(대만 추가). DB 변경 없음. 코드·package(1.0.8)·DB `programs.version` v1.08. 검수: 단위 14/14, tsc·빌드, 운영 화면 확인(테스트 데이터 삭제).

### v1.07 기준
- **v1.07**: 규격 14종(홍콩·뉴질랜드 추가), 머리 비율 검사(AI 추정, 공식 범위 확인된 규격만), 일괄 순서 변경·제외 저장, 한국 여권 AI 사진 불허 경고, ID 프롬프트 머리 크기 강화. DB 변경 없음. 코드·package(1.0.7)·DB `programs.version` v1.07. 검수: 단위 12/12, tsc·빌드, 운영 화면·실제 호출 확인(테스트 데이터 삭제).

### v1.06 기준
- **v1.06**: 규격 12종(미국 여권·싱가포르·베트남 추가), 후보 확대 비교, 일괄 모드 저장 이름 지정. DB 변경 없음. 코드·package(1.0.6)·DB `programs.version` v1.06. 검수: 단위 11/11, tsc·빌드, 운영 화면 확인(테스트 데이터 삭제).

### v1.05 기준
- **v1.05**: 규격 9종(인도 여권·비자 추가), 후보 한눈에 비교 격자, 보관함 사용량 표시. DB 변경 없음. 코드·package(1.0.5)·DB `programs.version` v1.05. 검수: 단위 10/10, tsc·빌드, 운영 화면 확인(테스트 데이터 삭제).

### v1.04 기준
- **v1.04**: ZIP 일괄 다운로드, 규격 프리셋 7종(캐나다·영국 추가, 공식 확인·주의 문구), 서버 보관 기간 설정(7/30/90일/무기한, 만료 자동 삭제). DB: `portrait_photo_saved.expires_at`(0004). 코드·package(1.0.4)·DB `programs.version` v1.04. 검수: 단위 9/9, tsc·빌드, 운영 화면 확인(테스트 데이터 삭제).

### v1.03 기준
- **v1.03**: 서버 보관함(선택·기본 꺼짐), 일괄 처리(사진 최대 6장), 규격 프리셋 5종(중국 비자 추가, 주민등록증/이력서 구분 정정). DB: 테이블 `portrait_photo_saved` + 비공개 버킷 `portrait-photo-files`(0003). 코드·package(1.0.3)·DB `programs.version` v1.03. 검수: 단위 7/7, tsc·빌드, 운영 화면 확인(테스트 보관 사진·기록 삭제).

### v1.02 기준
- **v1.02**: 후보 1~4장 동시 생성·선택, 증명사진 규격 프리셋 4종, 원본/결과 비교 슬라이더. 코드·package(1.0.2)·DB `programs.version` v1.02. DB 스키마 변경 없음. 검수: 단위 7/7, tsc·빌드, 운영 화면 확인(테스트 기록 삭제).

### v1.01 기준
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
