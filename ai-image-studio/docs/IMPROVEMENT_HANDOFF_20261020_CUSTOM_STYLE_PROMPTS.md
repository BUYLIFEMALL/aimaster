# v1.21 회원별 커스텀 화풍 프롬프트 인수인계

## 요청·설계·승인
- 주인님 요청: 일반 회원이 기본 예시를 각자의 화풍 프롬프트로 수정·저장해서 사용. 개발 계획 제시 뒤 「진행해줘」 승인.
- 기본 예시 style_preset_prompts 160개는 그대로, 개인 사본은 전용 ais_user_style_prompts에 분리합니다. 관리자만 기본 원본을 관리합니다.
- 운영 대상 Supabase: esgxyikcnnvmlhygjkth. 다른 프로그램·계정·API 키·환경변수는 변경하지 않습니다.

## 실제 동작
1. /prompts → 기본 예시 → ‘나만의 버전 만들기’.
2. 이름·화풍·본문·정렬 순서를 수정하고 ‘내 보관함에 저장’.
3. ‘나만의 프롬프트’에서 전문 펼침·복사·수정·삭제, 원문 참고/원문을 편집창에 불러오기. 한 기본 예시에서 여러 개인 버전을 만들 수 있습니다.
4. ‘작업실에서 사용’은 /dashboard?customPrompt=UUID로 이동합니다. 본문은 URL이나 localStorage에 넣지 않습니다. 로그인한 본인 ID로 서버 조회 후 불러옵니다.
5. ‘AI 보강 없이 그대로 Step 2에 사용’은 추가 텍스트 AI 호출 없이 원문을 전달합니다. 원하면 기존 마스터 프롬프트 생성 버튼으로 본인 OpenAI 키를 사용해 추가 보강할 수 있습니다. 이미지 생성은 기존 Step2에서 본인 키로 합니다.
6. 사용 방법은 /guide#custom-prompts의 4단계 시각 카드에 추가했습니다.

## 보안·보관
- app/api/prompts/custom/route.ts → lib/prompts/customPromptHandlers.ts. 모든 메서드에 기존 프로그램 이용 권한 검사. 일반 인증 클라이언트로 RLS 적용, user_id 필터도 별도 적용. 요청 본문의 user_id·생성일·만료일·임의 ID는 쓰기 값에 포함하지 않습니다.
- DB는 회원별 owner-only RLS, 만료 전 자료만 조회/수정 가능. 익명 접근 금지, 개인 응답은 Cache-Control: private, no-store.
- 최초 저장일부터 30일 보관. DB 트리거가 생성/만료일을 직접 정하고 수정으로 기간을 늘리지 못하게 합니다.
- source_prompt_id는 ON DELETE SET NULL: 관리자 원본 삭제가 회원 사본 삭제로 이어지지 않습니다. 계정 삭제 시 본인 사본은 CASCADE로 정리됩니다.
- 전용 정리 함수 cleanup_ais_expired_custom_prompts와 minutely cron ais-custom-prompts-retention-30d. 일반 회원·익명은 함수를 직접 실행할 수 없습니다. 새 개인 테이블만 정리하며 기존 다른 데이터 정리 규칙은 수정하지 않습니다.
- SQL: supabase/migrations/20261020004317_image_studio_custom_style_prompts.sql (Supabase CLI로 생성). 운영 적용/실행 결과는 아래에 기록합니다.

## 검수 결과
- npm run test:custom-prompts: 18개 통과. 로컬 PostgreSQL(PGlite)에서 실제 RLS·트리거·FK·정리 함수를 실행합니다. 인증은 가상 회원 A/B로 대체했고 운영 SSO 검증과 구분합니다.
- npm run test:access: access ok. 기존 예시/이미지 클라이언트 검사 16개 통과. 유료 호출 없음.
- npm run build: 컴파일·타입·ESLint·페이지 생성 통과.
- npm run test:custom-prompts:browser: 보이는 Microsoft Edge 1440×1000, 375×812에서 가상 일반 회원 A/B로 저장→수정→복사→작업실 불러오기→그대로 사용→타 회원 접근 차단→삭제 확인. 기본 160개 유지·유료 호출 0.
- 증거: docs/evidence/custom-prompts-v121/browser-verification.json 및 desktop-personal.png, desktop-workroom.png, mobile-editor.png. 녹색 안내띠에 로컬 가상 회원이며 실제 로그인이 아님을 명시했습니다.
- 재현: npm ci → npm run test:custom-prompts → npm run build → npm run test:custom-prompts:browser. Windows에 Microsoft Edge가 있어야 합니다. PGlite·esbuild·Playwright는 개발 의존성이며 버전을 고정했습니다.

## 함께 고친 작업실 오류
- Step2의 기존 효과 함수가 프롬프트 적용 후 먼저 return하여 부정 프롬프트 갱신이 실행되지 않던 문제를 수정했습니다. 직접 사용 때는 이전 AI 결과의 no anime 같은 부정 문구가 남지 않게 비웁니다.
- 화풍 전환 중 늦게 온 이전 요청이 개인 추천 목록을 덮지 않도록 요청을 취소하고, 새 개인 ID 링크를 열 때 이전 입력 상태를 재사용하지 않습니다.
- 긴 프롬프트 편집창은 native dialog로 초점·Esc를 처리하며 본문 입력칸에 명시적 접근성 이름을 넣었습니다.

## 미작업·다음 CLI 참고
- 기존 AI 최적화 API(app/api/enhance-prompt/route.ts)의 화풍별 부정 문구 충돌 제안은 이번 범위에서 바꾸지 않았습니다. 원문 유지가 중요하면 새 ‘그대로 사용’ 경로를 이용합니다.
- 실제 SSO 일반 회원 로그인으로 운영 UI 저장/수정/삭제 검수는 아래 운영 결과에서 확인합니다. 가상 회원 검수로 이를 완료했다고 표시하지 않습니다. 비밀번호 입력·관리자 매직링크 대체 로그인은 하지 않습니다.
- 실제 유료 이미지 생성 품질 시험은 미실시.
- 기존 모바일 메뉴가 위에 펼쳐지는 구조는 보존했습니다. 이번 작업의 개인 편집창/가로로 넘기는 표 검수와 메뉴 전체 리뉴얼은 구분합니다.
- 후속 아이디어: 개인 프롬프트 파일 내보내기·가져오기. 30일 보관 기한을 자동 연장하는 방식은 제안하지 않습니다.

## 링크
- https://ai-image-studio.buylife.xyz/prompts
- https://ai-image-studio.buylife.xyz/dashboard
- https://ai-image-studio.buylife.xyz/guide#custom-prompts

## 운영 결과
커밋·DB 적용·정리 작업·배포·비로그인 차단·실세션 확인 결과를 이어서 기록합니다.
