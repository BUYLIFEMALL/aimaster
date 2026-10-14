# AI 문서번역 자동화 — 재개 인수인계

2026-10-14, Codex. 코드·카탈로그 v1.03, 운영 승인 완료. 수정 커밋8d34b366 원격 푸시, 프로덕션 dpl_G7Md8LUSXVR5XmNC8EjjsRBTgikh READY(2026-10-14 21:34 KST). 자동10개·프로덕션 빌드·운영 HTTP10개 통과, 테이블3개 RLS·함수4개 서버 전용 권한·Cron 정상 실행 확인입니다. 실제 회원 전체 화면 검수는 Chrome 로그인 창 준비 대기입니다.

## 필독과 승인 범위

루트 AGENTS.md·HANDOFF.md·ERROR_LESSONS.md·본인 API 규칙·자율 개발 워크플로우, 이 프로그램 README.md·AGENTS.md·RELEASE_CHECKS.md·OPERATING_CHANGES.md를 읽습니다. 테이블3개·함수4개·공용 Supabase 연결값3개·Cron·카탈로그/요금제·VIP·썸네일·도메인 연결 전체 범위는 승인 후 적용했습니다. 같은 승인 질문을 반복하지 않습니다. 다른 CLI 파일과 공유 인덱스를 보존합니다.

## 구현과 원본 조사

AI 문서번역 자동화, document-translator, 회원 본인 Gemini 서버 호출. TXT/PDF/DOCX 가져오기·10개 언어·분할 번역·3종 검수·수정본 재검수·역번역·용어집·TXT/MD/DOCX/CSV·JSON 백업·선택 저장을 구현했습니다. 파일 선택만으로 AI를 호출하지 않고 타인 키·모델 폴백이 없습니다.

원본 Google AI Studio 앱 9596827a-a428-415c-aaae-8547cbe137ea("번역의 정석"). ZIP19개77,015bytes·HTML·실행 JS1,684,474bytes 전수 분석. 파일 해시는 evidence/reference/source-manifest.json, 원본 전체는 gitignore된 scratch/translation-reference-20261014에만 보관합니다. 원본 코드/브랜드/프롬프트를 공개 Git에 복제하지 않습니다. 원본의 실제 AI 생성은0회였습니다.

## 운영에서 확인한 사실

- Supabase 공용 프로젝트 esgxyikcnnvmlhygjkth, 소유자 RLS·서버 전용 RPC.
- document-translator-project-retention Cron 매시간35분, 실제 만료 시험 기록1건 정리 확인.
- buylife/document-translator Vercel, document-translator.buylife.xyz. 프로그램 활성·요금제3종·VIP 연결·썸네일 등록 완료.
- 기존 실제 Chrome 시험 회원 buylifemall@naver.com SSO·접근 확인. v1.02 공급사 responseSchema 오류 수정, 같은 회원 키 실제 번역200·STOP·Zod 검증 통과 기록.
- v1.03: 원문이 실제 개행을 사용하고 리터럴 이스케이프가 없는 문단만 이중 이스케이프된 개행을 정규화. 실제 서버 generate() 경로 회귀 검사와 코드 문자열 보존 검사 통과.

## 재개 시 남은 단계

1. v1.03 커밋·푸시·배포와 카탈로그 버전 갱신은 완료했습니다. 재개 시 git status/log·운영 버전만 재확인합니다. 기존 VIP 부여/권한을 재적용할 필요는 없습니다.
2. 현재 실제 회원 화면 검수용 Chrome이 실행되어 있지 않습니다. 새 Chrome 창 실행은 자동 검토가 blocked by policy로 거절했고, 기존 Edge는 도구의 restore 요청에도 window_not_focused였습니다. Aside에는 이 사이트 회원 로그인이 없습니다. 주인님께 Chrome의 시험 회원 로그인 화면 준비를 요청해 둔 상태입니다. 비밀번호/키를 대신 입력하거나 쿠키를 복사하지 않습니다.
3. 준비된 실제 회원 브라우저로 번역→수동 수정→재검수→역번역→TXT/MD/DOCX/백업 다운로드→선택 저장→새로고침→보관함 복원을 확인합니다. 본인 키·소량 호출만 사용합니다. UI/API/DB 결과와 캡처를 대조합니다.
4. 최신 결과를 RELEASE_CHECKS.md·README.md·AGENTS.md·루트 인수인계에 반영합니다. 확인하지 못한 화면 항목을 완료로 보고하지 않습니다.

검사: npm test(10개), npm run build. 기존 Chrome 모의14개와 설정 없는 Next 런타임8개 경계 검사 기록은 실제 회원 검수와 구분합니다. evidence/implementation에 과거 모의 증거, evidence/release에 출시 표본과 썸네일이 있습니다. 원문/키/공급사 원시 응답을 로그나 공개 증거에 남기지 않습니다.
