# v1.19 사용 매뉴얼 메뉴 위치 변경 인수인계

- 요청: 사용 매뉴얼을 하단 API키등록·플랫폼연동 바로 위로 옮깁니다.
- 적용: components/layout/Sidebar.tsx 기존 배너 블록만 이동, lib/version.ts v1.19.
- 메뉴 순서: 작업실 → 갤러리 → 화풍 프롬프트 게시판 → 연동 & 사용 매뉴얼 → API키등록·플랫폼연동.
- 검사: npm run build 통과(컴파일·ESLint·타입·페이지 생성), 동일 Sidebar를 사용하는 모든 작업 화면에 적용.
- URL: https://ai-image-studio.buylife.xyz/settings
- 배포·DB 버전·Edge 화면 검수: 이 문서의 후속 결과란에 기록합니다.
- 다음 요청: 주인님이 등록된 상황별 프롬프트를 개별 검토해 상세한 영어로 보강하도록 요청했습니다. 메뉴 이동 릴리스를 마친 후 별도 작업 단위로 진행합니다.
- 관찰: 기존 모바일 메뉴 구조 자체는 이번 요청 범위에서 바꾸지 않았습니다.

## 운영 결과
- 구현 커밋: bcbb7e18, origin/master 푸시 완료.
- Vercel: dpl_7iMV3HgnnEXW169YMpyhQXc7wDvG, READY, 정식 도메인 연결 완료.
- 배포 주소: https://ai-image-studio-6urt32yc3-buylife.vercel.app
- DB: public.programs slug=ai-image-studio v1.18→v1.19 갱신 확인. 다른 프로그램·스키마·키 변경 없음.
- 실제 Edge 관리자 기존 로그인 세션 /settings: 화면 v1.19, 작업실→갤러리→게시판→매뉴얼→키등록 순서 확인(2026-10-20). 비밀번호·API 입력이나 이미지 생성 없음.
- 좁은 화면 별도 실세션 검수는 미실시. 공통 Sidebar 단일 블록의 순서만 이동했으며 모바일 메뉴 구조는 보존했습니다.
- 다음 작업: 별도 요청인 공통 예시 16개 화풍×10개=160개 프롬프트 영문 상세 보강.
