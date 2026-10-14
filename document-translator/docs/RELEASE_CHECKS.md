# 운영 적용 및 검수 — v1.03

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

자동9개와 운영 연결값을 사용한 빌드를 통과했습니다. v1.02 수정 배포는 완료했으며 UI의 실제 번역·편집·재검수·역번역·저장·새로고침 복원 및 실제 다운로드 최종 검수가 남아 있습니다. 아래 최신 v1.03 상태를 기준으로 재개합니다.

## 의존성 점검

현재 npm audit에서 sprintf-js→argparse→mammoth 중간 등급3건이 보고됩니다. 공급사 수정 버전은 아직 없으며 강제 수정 명령은 Mammoth를0.3.29로 되돌립니다. 앱은 Node CLI가 아닌 `mammoth.browser.js`를 작업자에 포함하고, 실제 생성 번들과 브라우저 파일에 argparse/sprintf가 없음을 확인했습니다. 파일 처리 시간/압축 총량도 제한합니다. 과거 버전으로 자동 회귀시키거나 audit0으로 보고하지 않습니다. [업스트림 권고](https://github.com/advisories/GHSA-hp3w-g68c-fv3c).

## 2026-10-14 재개 — v1.03 사전 검수

- 현재 운영 v1.02: Vercel dpl_4M1zcMHHiBDxC8v8sZnJRAm8gun7 READY, 카탈로그 활성/v1.02·도메인·썸네일 확인, 로그인 HTTP200.
- v1.03 줄바꿈 정규화 및 정상 코드 문자열 보존: 자동10개 통과. generate() 공급사 응답 경로에서 URL 다음 문장 개행과 코드 리터럴 보존까지 회귀 검사. 프로덕션 빌드 성공.
- 새 Chrome 실행은 자동 검토가 blocked by policy로 거절. 기존 Edge는 restoreWindow 후에도 window_not_focused, Aside는 사이트 로그인 없음. 실제 Chrome 시험 회원 로그인 화면 준비를 요청했습니다. 비밀번호/키 입력·쿠키 복사·인증 우회는 하지 않습니다.
- 다음: v1.03 커밋·푸시·배포·DB 버전 일치, 실제 회원 전체 UI 흐름 및 다운로드 검수.

## 2026-10-14 21:36 KST — v1.03 배포 후 확인

- 코드 수정 커밋 **8d34b366**, git push origin master 성공. 다른 CLI 파일/루트 미커밋 변경은 제외하고 루트 문서는 HEAD에 본 작업 항목만 반영했습니다.
- 프로덕션 **dpl_G7Md8LUSXVR5XmNC8EjjsRBTgikh READY**, https://document-translator.buylife.xyz 에 연결. 배포 원본 https://document-translator-5ut7ej3n9-buylife.vercel.app . 원격 npm ci·빌드 성공. 카탈로그는 version만 v1.02→v1.03 갱신하고 기존 권한/VIP 부여는 다시 적용하지 않았습니다.
- HTTP10개 통과: 로그인200, 작업 화면 익명307, keys/projects/glossaries 및 정상 형식 ai/remove 익명401, ai 외부 출처403·잘못된 형식415·임의 소유자 필드400. 전부 private/no-store, X-Vercel-Cache MISS. 증거 evidence/release/v103-http-checks.json. 유료 AI 호출0회입니다.
- 운영 테이블3개 RLS=true. 함수4개 모두 authenticated EXECUTE=false, service_role=true. Cron active=true, 최신 실행2026-10-14 12:35 UTC succeeded. 이 확인에서 실제 회원 저장/복원을 대신 처리하지 않았습니다.
- 배포 로그 조회(--level error --since 30m) 결과 No logs found. 전체 회원 동작 무오류를 의미하지는 않습니다.
- Aside의 실제 공개 로그인 화면을 직접 열어 캡처·육안 확인(evidence/release/v103-login.png). 로그인되지 않은 상태의 화면 검사이며 Chrome 회원 검수와 구분합니다. Chrome 새 창 자동 검토 거절·Edge 도구 포커스 실패로 주인님께 Chrome의 시험 회원 로그인 창 준비를 요청해 둔 상태입니다.
- **남은 작업**: 실제 회원의 번역→편집→재검수→역번역→다운로드/백업→선택 저장→새로고침/복원·용어집·모바일 흐름, API/DB 대조. 모의 검사와 HTTP 검사로 이 항목을 완료 처리하지 않습니다. 비밀번호/키·쿠키를 복사하거나 인증을 우회하지 않습니다.
- 확장 프로그램 없음으로 ZIP/extension 버전 갱신은 대상이 아닙니다. 기존 의존성 중간 등급3건과 브라우저 번들에서 비포함 확인 기록은 위 의존성 점검을 따릅니다.
