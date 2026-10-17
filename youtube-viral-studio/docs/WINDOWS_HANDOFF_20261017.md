# Windows 인수·운영 검수 — YOUTUBE VIRAL FINDER v1.13

2026-10-17 Codex(Windows). 맥미니 `eb515765` 인수. 라이브: https://youtube-viral-studio.buylife.xyz

## 현재 단계

v1.13 디자인 마무리 완료. 로컬/운영 일반 회원 검수·배포·DB 버전 확인을 완료했습니다. 회원 데이터 격리/30일 보완 등 아래 후속 과제는 별개로 남아 있습니다.

## 확인한 내용

- 초기 Next16.2.11 빌드와 보안 보완 후 Next16.4.2 빌드 모두 통과. `fetchCache = "force-no-store"`·동적 회원 화면 유지. APP_VERSION v1.13, package1.13.0 동기화.
- 배포 차단 가능성이 있는 Next 공지를 확인하고 같은 16계열 보안 보완. [공식 공지](https://nextjs.org/blog/nextjs-security-update-october-14-2026). 검색·점수 계산·API·키 저장 구현은 변경하지 않았습니다.
- 실제 일반 회원 `buylifemall@naver.com`, 관리자 아님 확인. 새 Edge 세션 1440/375에서 8개 화면, 메뉴8개, 계정, 이동 후 메뉴 닫힘, 설정 키3종, 로그인/가입 탭, 가이드, 즐겨찾기 빈 탭 확인. 수집 결과는 합성 카드로 별도 확인.
- `/dashboard`는 실제 YouTube 요청0. 쇼츠·황금채널·실시간 화면은 진입만 해도 자동 POST를 보냅니다. **화면 진입 전에 브라우저 가로채기를 설치**하여 해당3경로만 200 빈 합성 결과로 응답했습니다. 실제 검색·AI·할당량 차감은 검증하지 않았습니다. `/source-finder?url=...`도 자동 호출하므로 검수 때 쿼리 없이 접근했습니다.
- 비로그인 API8개 요청 모두401. 실제 회원 설정 GET200. 키 저장/삭제·외부 검색·AI·로그아웃·실제 보관함 변경0.
- 합성 실제 VideoCard/ChannelCard: 배지4종과 실제 색, VPH/배수, 썸네일, 북마크 콜백, 375px 넘침 없음. FavoriteCounts 손상 JSON/배열 아닌 값은0처리.
- npm audit: 전체8(critical1/high7) → 개발 의존성 high5, 운영 의존성0. 잔여5는 ESLint→fast-glob→micromatch→braces3.0.3 경로. `npm audit fix --force`의 Next14 다운그레이드는 적용하지 않았습니다.
- `npm run lint`는 기존 `eslint.config.*` 부재로 실행 불가. 정상 통과로 보고하지 않습니다. 이번 변경은 프로그램 TSX가 아닌 검수 도구·문서·의존성입니다. 빌드의 전체 TypeScript 검사는 통과했습니다.

## 다음 CLI가 먼저 확인할 사항

1. **높음: 즐겨찾기 회원 격리·30일 자동삭제 미구현.** `yvs_fav_videos`, `yvs_fav_channels`는 회원별 이름공간·생성일·만료일이 없는 기존 전역 localStorage입니다. 같은 브라우저를 다른 회원이 쓰면 이전 보관함이 보일 가능성이 있습니다. 본 디자인 완료를 개인정보 격리 완료로 해석하지 않습니다. 무소유 기존 자료를 현재 회원에게 임의 귀속시키지 않습니다. 회원별 DB/RLS/만료 조회 차단/정리 실행 증거를 포함한 별도 플랜을 먼저 만듭니다. 스키마·기존 데이터 삭제는 승인 범위 확인 후 진행합니다.
2. 자동 검색은 현재 동작을 보존했습니다. 회원이 선택해 실행하도록 변경하거나 설정으로 끄는 안과 할당량 사전 안내를 제안합니다. 이를 검수하면서 실제 API를 실행하지 않습니다.
3. `ChannelCard`가 viralIndex 누락 시85점으로 표시합니다. 실제 계산값 없음 표기 개선을 검토합니다. 가이드의 무료한도 FAQ는 겨울5시 안내가 빠지고 알고리즘 유입을 확정하는 표현이 있어 수정 제안으로 남깁니다.
4. lint 설정 복구와 개발 의존성 braces 수정판 추적. 강제 다운그레이드 금지.
5. 타 프로그램 조사: `yt-playlist-studio` README·AGENTS·IMPROVEMENTS·PlaylistStudioApp 소스와 DB 카탈로그를 읽었습니다. 타 영상 URL을 참고 메모로 넘기는 연계는 **새 제안**이며 아직 구현하지 않았습니다. 원본 영상/음원 다운로드·타인 키 공유·자동 게시를 포함하지 않습니다. 해당 프로그램 개선 원장에도 근거와 제안을 남깁니다.

## 재검수

프로그램 폴더에서 `npm run build:verify`, `node tests/local.mjs start`(127.0.0.1:3028), `npm run test:runtime`, `npm run test:fixtures`, `node tests/security-http.mjs`. 운영은 `YVS_TEST_BASE=https://youtube-viral-studio.buylife.xyz`로 runtime/security 실행. 자격증명은 기존 루트 환경에서 프로세스 내부로만 읽고 로그·증거에 기록하지 않습니다. fixture 저장소는 새 임시 브라우저의 합성 자료입니다.

증거: [evidence](evidence/), [플랜](VERIFICATION_PLAN_20261017_WINDOWS.md), [개선 원장](IMPROVEMENTS.md). 최종 결과는 아래 운영 기록을 참고합니다.

## 운영 배포·최종 검수 기록

- 소스 커밋 **b50bfaff929137c33538c3b8bb0a09c47aca48f8**, origin/master 푸시 완료. 최종 결과 문서 커밋은 이 제목의 후속 git log로 확인합니다(자기 커밋 해시를 같은 파일에 넣을 수 없으므로 결과 보고에도 명시).
- 프로덕션 **dpl_4r4FxwdNB38SzofnmBQFYakRmdMt**, READY, 소스 메타데이터 일치. 배포 URL https://youtube-viral-studio-84vph1egl-buylife.vercel.app, 공식 도메인 https://youtube-viral-studio.buylife.xyz 연결. Node24.x, iad1 유지, Cron 없음.
- DB programs.slug=youtube-viral-studio version **v1.13** 갱신 후 별도 SELECT 확인. app_url/배지(new,best,recommended) 유지. DB 스키마·키·환경변수·회원 자료 변경 없음.
- 운영 실제 일반 회원 Edge1440/375 **9검사 통과**, 로컬9·합성 실제 카드7·비로그인API8개401(로컬/운영 각각). 운영 설정 GET200·페이지 오류0. 운영 배포 오류 로그0(조회 시점 기준). 실제 검색/AI/키 저장/삭제/실제 보관함 쓰기0. 검색 자동 POST는200 합성 결과로 브라우저에서만 처리했습니다.
- DESIGN.md28번 **✅ 1차 작업완료 (v1.13)**, ACTIVE_WORK의 본인 줄만 제거. 최종 문서 푸시 뒤 메인 런타임 동일성/설치파일·확장ZIP200 보호 확인까지 수행합니다.
- 추가 코드 근거: 발굴 페이지에 onBookmark 저장 콜백이 없고 localStorage.setItem도 없습니다. 현재 버튼 클릭만으로 보관 저장/해제가 지속된다고 보장하지 않습니다. 회원별 보관·30일 설계 때 이 기능도 함께 연결하고 검수합니다.

### 추가개선 제안(미구현)

1. 로직·기능: 즐겨찾기 회원 분리/생성일 기준30일 만료·정리와 실제 저장/해제, 자동 검색 선택 실행, 지수 없음→85점 표시 개선.
2. UI·편의: 가이드의 한도 충전16/17시 통일·추정 지표 설명, 보관 기한/범위 안내.
3. 타 프로그램 연계: 조사한 Youtube Playlist 자동화에 선택 영상 URL·제목 참고 메모 전달. 기존 기능이 아니며 별도 설계 필요. 양쪽 회원 인증·본인 키·데이터 분리를 유지합니다. 상대 개선 원장에 제안을 남겼으며 타 프로그램 기능/DB/배포는 건드리지 않았습니다.
