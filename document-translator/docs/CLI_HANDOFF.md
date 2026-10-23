# AI 문서번역 자동화 — 재개 인수인계

2026-10-14, Codex. 코드·카탈로그 v1.03, 운영 승인 완료. 수정 커밋8d34b366 원격 푸시, 최종 프로덕션 dpl_24P3TriNLZV9gPDcahnegaeUVdMA READY(2026-10-14 22:10 KST), 배포 원본 커밋dec1eccd. 실제 회원 검수는 같은 v1.03 소스의 직전 배포에서 수행했고 최종 배포에서도 HTTP10개·DB 버전을 재확인했습니다. 자동10개·프로덕션 빌드·운영 HTTP10개 통과, 테이블3개 RLS·함수4개 서버 전용 권한·Cron 정상 실행 확인입니다. 실제 회원 전체 화면 검수를 완료했습니다. 본인 Gemini 번역/재검수/역번역3회 done·API200, 저장/새로고침/복원·용어집·실제 다운로드/백업 UI 복원·창516px 메뉴/탭을 확인했습니다. 상세 증거는 RELEASE_CHECKS.md의 최신 절과 evidence/release/v103-chrome-verification.json입니다.

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

## 완료한 실제 회원 검수와 후속 범위

1. 실제 Chrome 시험 회원 buylifemall@naver.com SSO와 v1.03 접근. 비밀번호/키 입력·쿠키 복사·인증 우회 없이 기존 본인 세션으로 수행했습니다.
2. 본인 Gemini3.8 Flash 번역1회·수동 수정 후 재검수1회·역번역1회. dt_operations3건 모두 done, Vercel /api/ai3건200. 원문2026/2020 날짜와 참가 인원20명 보존, URL 다음 문장이 링크에 붙지 않음.
3. 프로젝트 선택 저장·브라우저 새로고침·보관함 불러오기에서 수동 수정/검수/역번역 복원. 실제 DB revision1·30일 기한·내용 일치. 검수용 프로젝트 Codex-v103-live-20261014-2145를 참고용으로 남겼습니다.
4. TXT/MD/DOCX/JSON 실제 Chrome 다운로드를 D:/PDS에서 확인. DOCX ZIP/XML의 Heading1·목록·URL 관계, JSON schema/문단 정렬/원문·수정본·역번역 일치 검증. JSON 파일 선택→미리보기→새 작업으로 불러오기까지 실제 UI에서 확인했으며 서버 자동 저장은 발생하지 않았습니다.
5. 용어집 API→Application Programming Interface 추가·저장·적용·CSV 다운로드·새로고침 후 선택/복원. DB revision1/용어1개. Codex-v103-terms-20261014를 참고용으로 남겼습니다.
6. Chrome 창을 실제516px로 줄여 메뉴 열기/닫기, 원문·번역문·검수 탭을 직접 조작하고 캡처/육안 확인. 창 크기는1560×1372로 되돌렸습니다. 실제 휴대폰/375px 운영 기기 검수로 확대 해석하지 않습니다(기존375px 모의 검수는 별도).

이번 요청 범위의 미완료 항목은 없습니다. 스캔 PDF·HWP·PPTX·XLSX·완전한 원본 배치 재현은 원래 후속 개발 범위이며 지원 완료로 표시하지 않습니다. 새 소스 수정은 없어서 v1.03을 유지합니다. 검수 증거·인수인계 커밋/푸시 후 같은 코드를 재배포·운영 확인합니다.

## 화면 제어 중 해결한 도구 문제

- 네이티브 파일 선택창은 Chrome의 자식 창처럼 보이지만 별도 Windows 프로세스 창입니다. 브라우저 창으로 보낸 Alt+N이 Chrome 분할 뷰를 열었으므로 만든 오른쪽 새 탭을 정리했습니다.
- 파일 이름 입력/열기 버튼은 해당 네이티브 창의 실제 핸들/컨트롤을 확인하고 조작했습니다. 경로는 Windows 역슬래시 절대 경로를 사용하고 문자열을 확인한 뒤 비동기 Open을 요청, 브라우저 미리보기/복원 상태로 성공을 판정했습니다. SendMessage 호출 성공만으로 파일 읽기 성공으로 보고하지 않습니다.
- 여러 파일 다운로드 권한은 실제 팝업을 확인하고 허용한 뒤 D:/PDS에서 파일 실재/내용을 검사합니다. UIA Invoke 결과가 미확인일 때는 새 화면/파일을 대조합니다.
