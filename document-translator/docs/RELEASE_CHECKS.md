# 운영 적용 및 검수 — v1.02

2026-10-14. 주인님의 ‘전체 범위 승인 — 운영 연결·배포·실제 검수 진행’에 따른 작업입니다.

## 적용한 운영 연결

- Supabase `esgxyikcnnvmlhygjkth`: 테이블3개 RLS 켬, 함수4개 authenticated 실행 거부/service_role 허용.
- Supabase Cron `document-translator-project-retention`, job1, 매시간35분.09:35 UTC succeeded, 직접 만든 만료 시험 기록1건 제거 확인. 실제 기록을 Cron이 정리한 사실과 삭제문 실행 결과를 대조했습니다.
- Vercel buylife / document-translator, ID `prj_KbBlrCVpC3Hk321t6ytRyZcSqOjd`. Production 연결값3개 Sensitive 설정, 로컬 gitignore 파일에만 기존 Supabase 값 복사. 회원 Gemini 키는 환경변수에 없음.
- `https://document-translator.buylife.xyz`와 첫 배포 `dpl_Fe4TBd7YTAv5QjcjGoTb83zQvyRY` 연결. 로그인200, 익명 keys/projects/glossaries/ai API401 및 private/no-store/MISS 확인.
- 카탈로그 프로그램 ID `b4da688d-3eda-44e6-b24f-738980113c9f`, Tools·일반 최소등급·NEW·요금제1/2/3개월10k/20k/30k. VIP 등급 자동 부여103건, 신규 프로그램에 한해서 등급 지정일+365일 정책을 맞췄습니다. 기존 프로그램 부여는 변경하지 않았습니다.
- 저장소 표준 스크립트로 운영자 본인 계정의 카탈로그 썸네일1회 생성·업로드. 모델 gemini-3-pro-image-preview,1376×768 JPEG,618,212bytes. 한국인 실사·흰색 두 문서 열·무문구를 육안 확인했습니다. 회원 번역 API에서는 이 계정이나 키를 쓰지 않습니다.

## 실제 화면과 발견한 오류

Chrome에 남아 있는 buylifemall@naver.com 로그인으로 새 도메인에 재로그인 없이 접근했습니다. 비밀번호/키 입력과 인증 우회는 하지 않았습니다. 다른 작업 창과 분리한 Chrome 창에서 직접 입력·클릭·화면 확인을 진행합니다.

첫 앱 번역은400 INVALID_ARGUMENT으로 실패했습니다. 같은 본인 키의 모델 조회200·단순 OpenAPI 구조 응답200을 확인했고, Zod의 전체 JSON Schema를 그대로 보내는 경로를 공급사가 거부했습니다. 직렬화를 지원되는 OpenAPI 핵심 속성으로 좁힌 실제 요청은 Gemini 3.8 Flash 번역200·완료 STOP·원본 전체 Zod 검증을 통과했습니다. 실패된 문서/키를 바꾸거나 다른 회원 키로 폴백하지 않았습니다.

수정: `providerSchema.ts`가 공급사 스키마만 변환하며 응답의 전체 Zod 길이·문단·점수·필드 검증은 유지합니다.400 요청 형식 실패를 키 오류로 잘못 안내하던 것도 수정했습니다. [공식 generateContent 스키마 API](https://ai.google.dev/api/generate-content?hl=en), [현재 구조화 출력 안내](https://ai.google.dev/gemini-api/docs/generate-content/structured-output?hl=en).

자동9개와 운영 연결값을 사용한 빌드를 통과했습니다. v1.02 배포 후 UI의 실제 번역·편집·재검수·역번역·저장·새로고침 복원 및 실제 다운로드 검수가 남아 있습니다.

## 의존성 점검

현재 npm audit에서 sprintf-js→argparse→mammoth 중간 등급3건이 보고됩니다. 공급사 수정 버전은 아직 없으며 강제 수정 명령은 Mammoth를0.3.29로 되돌립니다. 앱은 Node CLI가 아닌 `mammoth.browser.js`를 작업자에 포함하고, 실제 생성 번들과 브라우저 파일에 argparse/sprintf가 없음을 확인했습니다. 파일 처리 시간/압축 총량도 제한합니다. 과거 버전으로 자동 회귀시키거나 audit0으로 보고하지 않습니다. [업스트림 권고](https://github.com/advisories/GHSA-hp3w-g68c-fv3c).
