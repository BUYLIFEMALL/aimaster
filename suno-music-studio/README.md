# Suno 음악기획 자동화 v1.05

2026-10-12 v1.06: 빌더 빈 편집 화면·현재 선택·안전한 골격·초기화 되돌리기·명시적 제어 적용, 앨범 선택 작사·순서/메타데이터 편집·전용 JSON 복원, 검색 결과 종류·출처 연결 후보·내 Style 저장/앨범 전송을 추가했습니다. 원본 공개 옵션 769회 선택 확인(종속 선택의 숨겨진 항목은 DOM 변경 이벤트 사용), 실제 원본 유료 호출 0회. 자동 검사 53개, 실제 컴포넌트 모의 화면 34항목 통과. 신규 회원/공급사 실호출은 미검수. 상세 비교와 운영 기록: [docs/RELEASE_V1_06.md](docs/RELEASE_V1_06.md).


원본과 같은 7개 메뉴와 좌우 배치를 적용했습니다. 독립 앨범 설정·다중 무드·곡별 보컬·앨범 저장/되돌리기, 461개 프리셋 카드, 200개 댄스 조합, 93개 가이드 인덱스, 본인 공급사·모델의 선택적 웹 검색을 제공합니다. 흰색 화면과 메뉴 바로 밑 계정/로그아웃을 유지합니다. [상세 비교·검수·남은 실제 호출 확인](docs/RELEASE_V1_05.md). 최신 운영 버전은 v1.05이며 아래 v1.01~1.04 설명은 해당 릴리스의 이력입니다.

v1.03은 실제 옵션 조사 결과를 반영한 461개 프리셋·200개 댄스, 243개 스타일 그룹·13개 시대, 9종 태그 팔레트, 세부 보컬/별도 랩 캐스팅, 선택 생성·가사 구간 삽입·내 Style 저장을 제공합니다. 프리셋 적용과 설정 변경은 기존 제목·가사를 보존합니다. [실측 비교](docs/ORIGINAL_OPTIONS_COMPARISON.md), [v1.03 검수·배포 기록](docs/RELEASE_V1_03.md).

v1.02는 좌측 계정 이메일·로그아웃을 마지막 메뉴 바로 아래로 밀착합니다. 높은 화면에도 간격을 유지하고 낮은 화면은 작업 메뉴만 내부 스크롤됩니다. [변경·검수·운영 기록](docs/RELEASE_V1_02.md).

회원 본인 Gemini·OpenAI·Claude API로 음악 스타일·가사·앨범을 기획하고 Suno에 전달할 자료를 정리하는 AIMaster 서브프로그램입니다. 프로그램명은 2026-10-12 주인님이 **Suno 음악기획 자동화**로 확정했습니다.

운영 주소: https://suno-music-studio.buylife.xyz/ · v1.06. AIMaster 로그인과 프로그램 이용기간/구독이 필요합니다. 본인 키로 Gemini 곡 1개 실제 생성과 회원 화면·초안 복원·JSON 백업·보관·설명 복사를 검수했습니다. Suno 최종 음악 생성은 본인 계정에서 직접 진행합니다. Chrome 연속 다운로드 허용 및 Windows 파일 선택창을 통한 가져오기는 실제 UI 추가 확인 항목입니다.

npm install / npm test / npm run lint / npm run build / npm run dev

환경변수: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_MAIN_SITE_URL. AI 키는 환경변수에 넣지 않습니다. 공용 user_api_keys에서 로그인 회원 키만 읽습니다. 작업 자료는 회원별 브라우저 저장이며 PC 간 동기화는 JSON 내보내기/가져오기로 합니다.

분석·계획은 docs/ANALYSIS_AND_PLAN.md, 최종 검수·배포 상태는 docs/RELEASE_V1_01.md에 기록합니다.

음악 기획·작사·앨범 구성을 표현한 실사 카탈로그 썸네일을 2026-10-12 제작·등록했습니다. [제작·등록 기록과 원본/프롬프트](docs/THUMBNAIL.md), [운영 상세 페이지](https://www.buylife.xyz/programs/suno-music-studio). 카탈로그 메타데이터 등록으로 v1.01을 유지합니다.

v1.04는 v1.03 옵션 확장을 유지하며 모든 회원 API 성공/오류 응답에 private, no-store를 적용합니다. [통합 릴리스 기록](docs/RELEASE_V1_03.md).
