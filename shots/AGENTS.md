# 🎬 AIMaster — 58번 YOUTUBE Shots 자동화 (AGENTS.md)

> **프로그램 정보**
> - **프로그램 번호**: 58번
> - **프로그램명**: YOUTUBE Shots(이미지 스토리) 자동화 (`auto-shorts-posting`, `shots/`)
> - **공식 배포 주소**: https://shots.buylife.xyz
> - **버전**: `v1.23` (`package.json` 1.23.0, `version.ts` v1.23, DB `programs` v1.23 — 2026-10-20)
> - **적용 디자인 템플릿**: **유튜브 다크 콘솔 스타일 (YouTube Dark Console — Shorts Studio Edition)**

---

## 1. 개요 및 설계 철학
바이럴 토픽 수집(HTTP/RSS/Perplexity)부터 OpenAI 6장면 시나리오, Gemini Nano-Banana 2.1 9:16 비주얼 에셋, Suno AI 테마 BGM 작곡, Remotion 모션 렌더링 및 유튜브/인스타그램 원클릭 배포까지 원스톱으로 지원하는 전문가용 숏폼 제작 자동화 스튜디오입니다.

사용자의 명시적 지시(**"58번 유투브 느낌을 살려줘"**)에 따라 유튜브 스튜디오 공식 콘솔의 다크 감성(옵시디언 블랙 `#0f0f0f`, 스튜디오 다크 서피스 `#181818`, 유튜브 공식 레드 `#ff0000`, 알약형 칩)을 전면 적용하였습니다.

---

## 2. 주요 UI/UX 개편 내역 (v1.20)
1. **유튜브 다크 콘솔 토큰 시스템 구축 (`globals.css`)**:
   - 옵시디언 다크 테마 배경 및 붉은색 네온 백라이트(`.studio-hero`) 탑재.
   - 스튜디오 서피스 카드(`.stat-card`) 및 유튜브 레드 알약형 탭 버튼 시스템 완성.
2. **사이드바 표준화 & 브랜딩 강화 (`Sidebar.tsx`)**:
   - 상단 유튜브 레드 플레이 버튼(▶), `v1.20 SHORTS LAB` 네온 뱃지 탑재.
   - 5단계 쇼츠 제작 스텝퍼(주제수집 ➔ 스크립트 ➔ 이미지 ➔ BGM ➔ 영상합성) 직관적 번호 표기.
   - `📖 연동 & 사용 매뉴얼` (`/guide`) 메뉴 신설 및 모바일 햄버거 토글 드로어 완비.
3. **메인 워크스페이스 고도화 (`candidates/page.tsx`)**:
   - 유튜브 레드 발광 테두리의 `.studio-hero` 웰컴 배너 및 가이드북 바로가기 버튼.
   - 3대 핵심 KPI 카드: ① 바이럴 트렌드 수집 ② 9:16 비주얼 스토리보드 ③ Suno AI BGM & Full HD 렌더링.
   - 수집 도구(CandidateCollector) 및 후보 목록(CandidateList) 다크 스튜디오 테마 일체화.
4. **독립 비주얼 가이드북 전면 신설 (`/guide/page.tsx`)**:
   - 5단계 쇼츠 제작 파이프라인 프로세스 다이어그램.
   - 9:16 세로 씬 구성 및 떡상 연출 공식 매트릭스 표 (구간/시간/연출/비주얼/사운드).
   - 3대 오디오 팁 (0초 훅 비트 드롭, 1.8초 컷 전환, 고대비 볼드 자막 바).
   - 100% BYOK 보안 원칙 안내 배너 & FAQ 5종 레드 아코디언.

---

## 3. 핵심 규칙 준수 (100% BYOK & Edge 검수)
- **100% BYOK(Bring Your Own Key)**: OpenAI, Perplexity, Suno AI, Google Gemini, YouTube/Instagram API 키는 회원 본인의 것만 사용하며 타 회원이나 관리자 키로 폴백하지 않습니다.
- **Edge 브라우저 전용 실세션 검수 (headless: false)**:
  - Microsoft Edge 최전면 포그라운드 모드로 6종 스크린샷 캡처 수집 완료.
  - 주인님께서 실시간으로 확인하실 수 있도록 화면에 10분간(600초) 창 유지 완료.

---

## 4. 서브문서 목록
- `shots/README.md`: 프로그램 기능 및 아키텍처 안내
- `shots/docs/DESIGN_HANDOFF.md`: 유튜브 다크 콘솔 디자인 시스템 및 토큰 명세
- `shots/docs/IMPROVEMENTS.md`: 3대 필수 관점 개선 및 발전 아이디어
- `shots/docs/IMPROVEMENT_BACKLOG.md`: 향후 업그레이드 백로그
- `shots/docs/PLAN_20261019_DESIGN_RENEWAL.md`: v1.20 리뉴얼 상세 실행 플랜

<!-- DETAILED_PROGRAM_REVIEW_20261019 -->
## 2026-10-19 Codex — 프로그램별 상세 개선 분석(구현 아님)

[세부 개선안·필요 이유·근거·시험 조건](docs/DETAILED_REVIEW_20261019.md) · [전체 83개 분석](../docs/program-reviews-20261019/INDEX.md) · [공통 아이디어 표](../docs/PROGRAM_IDEA_BACKLOG.md). 이 프로그램 3개 검토 항목입니다. 코드·DB·환경변수·배포는 바꾸지 않았습니다. 작업 전 최신 개선 원장·ACTIVE_WORK와 대조하고 이미 해결된 기능은 보존합니다. 후속 작업 후 처리 ID·증거·미완료·새 인사이트·프로그램 링크를 기록합니다.
<!-- /DETAILED_PROGRAM_REVIEW_20261019 -->

## 2026-10-20 v1.21 — 회원 연동 정보 공용 저장 ④단계 Instagram (Claude Code 윈도우)
- 연결 콜백이 `instagram_accounts`와 공용 표 `member_platform_accounts`(platform `instagram`, `auth_method=facebook_login`, `extra.page_id`)에 함께 저장. 게시(`postToInstagramAction`)·영상 포스팅·스크립트 화면은 `src/lib/instagram/memberAccount.ts` `getShotsInstagramAccount` — Facebook 로그인 + 게시 권한 + 재연결 필요 아님 공용 계정 → 없으면 `instagram_accounts`. 해제는 공용 행도 삭제.
- 함께 고침: 화면 컴포넌트(`PostingSection`)에 계정 전체(토큰 포함)를 넘기던 것을 표시용 `ig_username`만 넘기도록 줄임.
- 남은 점: INSTA는 Facebook 로그인에 `facebook_app_id`(없으면 `meta_app_id`)를 쓰는데 이 프로그램은 `meta_app_id`만 쓴다 — 기존 동작이라 그대로 두고 `docs/IMPROVEMENTS.md`에 기록.
- 공용 부품 사본 `src/lib/memberIntegrations.ts`. 백필 `supabase/migrations/20261020180000_member_integrations_v1_21.sql`. 플랜 루트 `docs/PLAN_20261020_MEMBER_INTEGRATIONS_STEP4_INSTAGRAM.md`.

## 2026-10-20 v1.22 — 회원 연동 정보 공용 저장 ⑤단계 YouTube (Claude Code 윈도우)
- YouTube 연결 콜백이 `youtube_accounts`와 공용 표(platform `youtube`, 권한 `youtube.upload`+`youtube.readonly`, 갱신 토큰, `app_ref`=회원 `google_client_id`)에 함께 저장. 업로드·연결 상태 확인은 `src/lib/youtube/memberAccount.ts` `getShotsYoutubeAccount` — 업로드 권한 + 갱신 토큰 + 재연결 필요 아님 + 공용 계정의 앱이 지금 Client ID와 같음 → 없으면 `youtube_accounts`. 접근 토큰 갱신은 읽은 곳에, 갱신 실패 시 공용이면 「다시 연결 필요」 표시(자기 표엔 그 칸이 없음), 해제는 공용 행도 삭제.
- 유튜브 댓글 자동화(채널 관리 권한)와 권한이 달라 서로의 공용 토큰은 쓰지 않는다. 백필 `supabase/migrations/20261020210000_member_integrations_v1_22.sql`.

## 2026-10-20 v1.23 — YouTube 연결 하나로 합치기 + Facebook 앱 키 이름 맞추기 (Claude Code 윈도우)
- ② YouTube: 영상 포스팅 화면 연결 영역에 「다른 YouTube 프로그램 권한도 함께 받기」(연결 전 체크칸, 연결 후 「댓글 권한도 함께 받아 재연동」 버튼). 켜면 `force-ssl`·`upload`·`readonly`를 `include_granted_scopes=true`로 한 번에 요청(`src/lib/youtube/client.ts` 선택 인자, `ALL_YOUTUBE_SCOPES`), 콜백은 공용 표에 Google이 실제로 내준 권한(`scope`)을 기록 → 유튜브 댓글 자동화(v1.16, 같은 기능)와 한 번 연결로 같은 토큰을 쓴다.
- ③ Facebook 앱 키: Instagram(Facebook 로그인) 연결 시작·콜백이 `src/lib/apiKeys.ts` `resolveFacebookLoginApp` — `facebook_app_id`/`secret`(INSTA 포스팅과 같은 공용 칸) 먼저, 없으면 예전 `meta_app_id`/`secret`(기존 연결·회원 그대로 동작). 설정 화면에 Facebook 앱 칸 추가·안내 문구 정정. `docs/IMPROVEMENTS.md` 2026-10-20 항목 처리됨.
- DB 변경 없음(버전만, `supabase/migrations/20261020260000_youtube_scopes_fb_key_v1_23.sql`). 플랜 루트 `docs/PLAN_20261020_YOUTUBE_SCOPES_AND_SHOTS_FB_KEY.md`.

## 2026-10-21 — 유튜브 업로드 코드 공용 기준 등록(코드만, 미배포) (Claude Code 윈도우)
- `src/lib/youtube/client.ts`가 공용 기준 코드 **`youtube-upload-client`** 가 됨(사본: `shorts-onestop-studio/src/lib/youtube/client.ts`). 이 파일을 고치면 `node scripts/check-shared-modules.mjs --sync`로 사본에 반영하고 원스톱도 함께 시험한다.
- 추가: `createYoutubeResumableSession()`(재개 가능 업로드 주소 — 브라우저에서 만든 영상을 직접 올릴 때). Shots는 아직 쓰지 않아 동작 같음 → 버전·배포는 다음 Shots 배포 때(`docs/SHARED_MODULES.md` 미배포 표).
