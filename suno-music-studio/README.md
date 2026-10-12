# Suno 음악기획 자동화 v1.01

회원 본인 Gemini·OpenAI·Claude API로 음악 스타일·가사·앨범을 기획하고 Suno에 전달할 자료를 정리하는 AIMaster 서브프로그램입니다. 프로그램명은 2026-10-12 주인님이 **Suno 음악기획 자동화**로 확정했습니다.

운영 주소: https://suno-music-studio.buylife.xyz/ · v1.01. AIMaster 로그인과 프로그램 이용기간/구독이 필요합니다. 본인 키로 Gemini 곡 1개 실제 생성과 회원 화면·초안 복원·JSON 백업·보관·설명 복사를 검수했습니다. Suno 최종 음악 생성은 본인 계정에서 직접 진행합니다. Chrome 연속 다운로드 허용 및 Windows 파일 선택창을 통한 가져오기는 실제 UI 추가 확인 항목입니다.

npm install / npm test / npm run lint / npm run build / npm run dev

환경변수: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_MAIN_SITE_URL. AI 키는 환경변수에 넣지 않습니다. 공용 user_api_keys에서 로그인 회원 키만 읽습니다. 작업 자료는 회원별 브라우저 저장이며 PC 간 동기화는 JSON 내보내기/가져오기로 합니다.

분석·계획은 docs/ANALYSIS_AND_PLAN.md, 최종 검수·배포 상태는 docs/RELEASE_V1_01.md에 기록합니다.
