# 개선사항 원장 — AI 인플루언서 자동화 (ai-influencer-studio)

> **🗓️ 보관 규칙 「발행 1년 · 생성만 30일」 적용 요청 — 인스타 담당께 (2026-11-11, 세션 `claude-win-rea`, 주인님 지시)**: **급함**: 게시 직후 첫 장 빼고 사진 삭제(`src/app/api/instagram/publish/route.ts:45`, `src/lib/instagram/posting.ts:131`) 중단 + `posting.ts:151-165` 정리를 `status<>'published' and created_at<30일` OR `published_at<1년`으로 + 열외(`retention_exempt`) 추가 — 인스타 4곳 같은 모양 코드. 관리자·시험 계정(`retention_exempt`) 열외 유지. 다음에 이 프로그램을 손댈 때 적용하고, 끝나면 `docs/TOP_RULE_PERSONAL_ACCOUNT_API.md` §8 「모든 발행형 프로그램 공통」 줄 비고에 「적용: ai-influencer-studio vX.YY(날짜)」를 적어 주세요. 전체 표·공통 주의: `docs/HANDOFF_20261111_RETENTION_PUBLISH_1Y.md`
> **❌ 위 「발행 1년」 요청 취소 (2026-11-11 주인님 최종 결정, 세션 `claude-win-rea`)**: 일반 회원은 **발행 여부와 상관없이 30일**, 연장은 **저장 구독·등급·관리자 지정**으로 DB가 자동 처리한다(연장 회원은 `profiles.retention_exempt`가 매일 자동으로 켜짐, 기간 초과 파일은 메인 사이트 중앙 정리). **이 프로그램의 30일 정리 코드는 지금처럼 「`retention_exempt` 회원 제외」만 유지하면 되고 발행 1년 조건을 넣지 않는다.** 단 **게시 직후 사진을 바로 지우는 동작은 여전히 규칙 위반**(30일·열외 회원 무시)이므로 다음에 손댈 때 고친다. 근거: `docs/TOP_RULE_PERSONAL_ACCOUNT_API.md` §0 ⚠️ 최종 개정, `docs/PLAN_20261111_MEMBER_STORAGE_QUOTA.md`.

> 2026-10-17 Claude Code(맥미니)가 `infinite-loop-video` v1.05 작업 중 타 프로그램 탐색(원칙 ⑫)으로 선제 기록. 2026-10-17 디자인 리뉴얼 v1.10(크리에이티브 아틀리에 · 핑크 화보 스튜디오)에서 #1·#2 구현.

| # | 발견일 | 구분 | 내용 | 근거 | 우선순위 | 상태 |
|---|---|---|---|---|---|---|
| 1 | 2026-10-17 | ② UI·편의성 | 기본 흰 화면(Next 기본 `globals.css`) — 화보·인물 이미지 성격에 맞는 크리에이티브 아틀리에(다크 캔버스) 권장 | `src/app/globals.css` | 중간 | ✅ 구현(v1.10, 배포 대기) |
| 2 | 2026-10-17 | ② UI·편의성 | 매뉴얼이 팝업(`HelpModal`)뿐이고 `/guide` 페이지·「📖 연동 & 사용 매뉴얼」 메뉴 표준과 다름(원칙 ⑦) | `src/components/HelpModal.tsx`, `Sidebar.tsx` 209행 | 중간 | ✅ 구현(v1.10: 화면 안 매뉴얼 `GuideView.tsx`, `HelpModal` 삭제) |
| 3 | 2026-10-17 | ① 로직·기능 | 생성 기록을 브라우저 `localStorage`에만 저장 — 다른 기기·브라우저에서 안 보이고, 캐시를 지우면 사라짐. 회원별 DB 저장(+30일 자동 삭제, 최상위 규칙) 검토 | `src/components/InfluencerStudio.tsx` 68·159행 | 중간 | 제안(DB 추가라 승인 필요) |
| 4 | 2026-10-17 | ① 로직·기능 | 입력 패널 `ControlPanel.tsx` 1,081줄 한 파일 — 단계(외형·일과·표정·광고·화보)별로 나누면 유지보수 쉬움 | `src/components/ControlPanel.tsx` | 낮음 | 제안 |
| 5 | 2026-10-17 | ③ 타 프로그램 연계 | 만든 인물 화보를 `insta_auto_poster`(인스타 포스팅)·`cardnews-studio`로 넘기는 버튼, 짧은 움직임은 `infinite-loop-video`로 반복 영상화 | 같은 계열 프로그램 | 낮음 | 제안 |

- 휴대폰 ☰ 메뉴는 이미 있음(`Sidebar.tsx`) — 리뉴얼 때 유지.
| 6 | 2026-10-17 | ① 로직·기능 | `components/Header.tsx`가 어디서도 쓰이지 않는 파일 — 정리 여부 결정 필요 | `src/components/Header.tsx` | 낮음 | 제안 |
| 7 | 2026-10-17 | ② UI·편의성 | 대시보드 메뉴가 첫 단계로 스크롤만 함 — 최근 화보 썸네일·히스토리 개수를 보여 주는 실제 대시보드 제안 | `src/components/Sidebar.tsx` `handleOverviewClick` | 낮음 | 제안 |

## (2026-10-18 Claude Code 윈도우 제안 — 타 프로그램 연계, 디자인 담당 AGY 검토 대기) 결과 컷을 AI 인물사진 자동화로 정리하는 매뉴얼 링크
- **제안**: 매뉴얼(`/guide`)의 결과 저장·활용 안내 부분에 "만든 프로필·화보 컷을 증명사진 규격이나 SNS 프로필 세트(1:1·4:5·원형)로 정리하려면 AI 인물사진 자동화의 [규격 저장]·[프로필 세트 미리보기·저장]을 쓰세요" 한 줄 + 링크 `https://portrait-photo.buylife.xyz/studio`(새 창, `target="_blank" rel="noopener"`).
- **이유**: 인플루언서 화보 컷을 계정 프로필·소개 페이지용 크기로 다시 자르는 수요가 있고, 인물사진 v1.24는 머리 위치 기준 추천 영역·프로필 세트(미리보기, 원형 바깥 투명/흰색)를 AI 호출 없이 제공한다.
- **원칙**: 프로그램 간 호출·데이터 전달 없이 링크만(회원이 결과를 내려받아 인물사진에 올리는 흐름). 인물사진은 별도 프로그램이라 이용 권한·회원 본인 Gemini 키가 따로 필요함을 문구에 밝힌다. 증명사진 규격 저장은 공식 서류 통과를 보장하지 않는다는 안내 유지.
- **상태**: 미구현 제안(매뉴얼 화면은 AGY 디자인 영역이라 Claude Code가 코드를 고치지 않음). 구현 시 이 프로그램 버전 +0.01.

## (2026-10-19 Claude Code 윈도우 제안 — 공용 부품 재사용) 컷마다 같은 얼굴인지 브라우저 안 얼굴 인식으로 점검
- **제안**: 결과 컷들을 AI 인물사진 v1.27의 브라우저 안 얼굴 인식(`portrait-photo/src/lib/portrait/faceLocal.ts`)으로 분석해 얼굴 점 비율(눈 사이·코·턱 비율 등)을 비교하고, 기준 컷과 많이 다른 컷을 "얼굴이 달라졌을 수 있음"으로 표시해 다시 만들기를 권한다. 사진 서버 전송·AI 비용 없음.
- **근거·주의**: `docs/SHARED_FEATURE_MAP.md` 7절. 얼굴 일관성 비교 함수는 아직 없어 새로 만들어야 하며, 같은 사람이라도 표정·각도에 따라 값이 달라지므로 시험 사진으로 기준값 보정이 필요하다.
- **상태**: 미구현 제안(별도 승인).

## 2026-10-19 Claude Code(윈도우)
- **처리(v1.13)**: 깨진 사진이 깨진 미리보기로 들어가던 문제 → 공용 `image-file-check`로 받지 않고 화면 안 안내.
- **제안**: 다른 오류(플래닝·이벤트 변형 실패)도 팝업 `alert` 대신 화면 안 안내로 바꾸면 흐름이 끊기지 않음.

## 2026-10-20 Claude Code(윈도우) — v1.15 예약 게시·게시 기록
- **처리(v1.15)**: 즉시 게시만 되던 문제 → 예약 게시·게시 기록·실행 방식 선택(상세 `AGENTS.md` v1.15, 플랜 `docs/PLAN_20261020_INSTA_SCHEDULE.md`).
- **발견(한계)**: 게시 기록·예약 취소는 결과 화면의 「📤 인스타그램에 게시」 패널 안에만 있어, 화보를 띄우지 않으면(첫 화면) 예약 목록을 볼 수 없다. → **제안 ②**: 사이드바 「⚙️ 작업 히스토리」 서랍 위쪽이나 대시보드에 「예약 n건 대기」 요약과 기록 목록을 두기.
- **제안 ①(로직)**: 작업 히스토리(현재 브라우저 저장)를 DB로 옮기면(IMPROVEMENTS #3) 예약 기록에서 원본 화보로 바로 돌아가기·다른 기기에서 예약 확인이 가능해진다.
- **제안 ③(연계)**: 인플루언서 「일과 플래닝」으로 만든 여러 컷을 하루 시간표대로 자동 예약(예: 아침·점심·저녁 컷을 각 시각에)하는 「하루 일과 자동 예약」 — 예약 표·실행 경로는 v1.15 그대로 재사용.
- **상태**: 제안 ①②③ 미구현.

## 2026-10-23 연계 제안 — 무료 사진 검색 붙이기 (Claude Code 윈도우, 기록만·구현 아님)
- [ ] 화보 배경·참고 사진에 「📷 무료 사진 검색」(회원 본인 Pixabay·Pexels 키, 공용 `user_api_keys` — 감성 글귀·INSTA에서 넣은 키 그대로)을 붙이기. 공용 기준 코드 `free-photo-search`(기준 `insta_auto_poster/src/lib/cardnews/photoSearch.ts`) 사본을 쓰고, 고른 사진 저장(버킷·경로)과 화면은 이 프로그램 방식으로. 참고 구현: INSTA `src/app/api/cardnews/photos/route.ts`·`src/components/cardnews/studio/PhotoSearchPanel.tsx`. 예상 비용: 빌드 1회, AI 0. 착수 전 플랜·승인 필요.

## 2026-11-13 Antigravity(윈도우) — v1.25 보그 에디토리얼 디자인 리뉴얼 공식 채택 & 배포 (세션 agy-win-inf-v1)
- **1안(101번: 보그 하이엔드 뷰티 & 패션 에디토리얼 아틀리에) 공식 채택 및 전면 개편**:
  - 테마: `#0C0E14` 딥 옵시디언 차콜 + `#F43F5E` 샴페인 로즈골드 + `#F59E0B` 럭셔리 골드 앰버
  - 3:4 인스타그램 화보 뷰파인더 덱 (LIVE 🔴 STUDIO REC, 4K UHD, 60fps, ISO 100 오버레이)
  - 4단계 페르소나 스타일링 인디케이터 배너 (모델 ➔ 스타일링 ➔ 씬 연출 ➔ 4K 화보)
  - 페이스 일관성 시드 락커 배지 (Face Consistency Seed: #98241 LOCK)
  - 3D 엠보싱 샴페인 로즈/앰버/다크 버튼(`.btn-3d-rose`, `.btn-3d-amber`, `.btn-3d-dark`) 전면 장착
  - 2026-11-01 5단계 표준 로그인 폼 & 1행 약관 규격 완비
  - 저장공간 위젯 `<Script src="https://www.buylife.xyz/storage-widget.js" strategy="afterInteractive" />` 탑재
  - 기기 슬롯 로그인 최적화: `signOut({ scope: "local" })` 적용 및 서버 Supabase 클라이언트 `User-Agent` 헤더 전달
  - Vercel 프로덕션 배포 완료 (`dpl_CDLgDPRuQNDztscJxdz7S2Rj1rXB`, https://ai-influencer.buylife.xyz)
  - Playwright 실서버 라이브 스크린샷 검증 완료

## 2026-10-23 Claude Code(윈도우) — Next.js 보안 업데이트 (세션 claude-win-20261023-next-security)
- Next.js 16.4.2 보안 업데이트 배포 — **버전 파일이 작은따옴표라 버전이 v1.24 그대로 나감. 다음 배포 때 +0.01(코드+DB)(분담표 묶음 D)**. 상세·명령: [`docs/HANDOFF_20261023_NEXTJS_SECURITY_SPLIT.md`](../../docs/HANDOFF_20261023_NEXTJS_SECURITY_SPLIT.md)

## 2026-11-13 전체 점검에서 발견 (정책 담당 세션 `claude-win-20261112-policy`)
### 1) 프로그램 로직·기능
- **글 모델이 미리보기 이름** — 캡션·일과 기획·이벤트 변형이 `gemini-3-flash-preview`를 씁니다(`src/lib/gemini.ts:169·237·296`). `docs/AI_MODEL_CATALOG.md`는 미리보기 모델을 넣지 않는 모델로 봅니다. 영향: 모델이 종료되면 캡션·기획이 한꺼번에 멈춤. 우선순위 높음. 상태: 제안(모델 교체는 선택표 확인 뒤).
- **코드 v1.25와 운영 DB v1.24 불일치** — `src/lib/version.ts` v1.25, DB `programs.version` v1.24. 문서에는 v1.25 배포 완료로 적혀 있으나 이번에 실제 배포를 확인하지 못했습니다. 영향: 메인 사이트 표시 버전과 프로그램 표시 버전이 다름. 우선순위 중간. 상태: 대기(부모 세션·담당이 배포 확인 뒤 DB 맞추기).
- **「하루 일과 자동 예약」 꺼짐** — `src/lib/routineSchedule.ts:11` `ROUTINE_SCHEDULE_MODE = "off"`. 코드는 남아 있고 화면에는 안 보입니다. 우선순위 낮음. 상태: 대기(주인님 결정 사항, 기존 기록 v1.21과 같음).
- 일과 플래닝 실패 등이 아직 `alert` 팝업입니다(`src/components/ControlPanel.tsx:219`) — 2026-10-19 제안과 같은 내용이라 다시 적지 않습니다.

### 2) 화면·가독성·사용 편의
- **설정 창에 인스타그램 연결 상태가 없음** — 메뉴 이름은 「API키등록·플랫폼연동」인데 창(`src/components/ApiKeyModal.tsx`)에는 Gemini 키와 예약 방식만 있고, 인스타 연결 여부는 화보를 만든 뒤 게시 칸(`src/components/InstagramPublishPanel.tsx:163-176`)에서야 보입니다. 영향: 처음 쓰는 회원이 연결이 필요한지 늦게 앎. 우선순위 중간. 상태: 제안(창 안에 「연결됨 @계정 / INSTA에서 연결하기」 한 줄 + 연동 매뉴얼 버튼). 이번에는 매뉴얼 화면의 「시작 전 준비」에 안내와 매뉴얼 링크만 넣었습니다.
- **키 등록 창의 Gemini 키 지우기 없음** — 저장만 있고 삭제 버튼이 없습니다(`ApiKeyModal.tsx`, `/api/user-key`는 GET·POST). 우선순위 낮음. 상태: 제안.
- 사이드바 5단계 설명이 「Gemini 3 Pro 화보」로 고정돼 있으나(`src/components/Sidebar.tsx:66`) 실제 기본 모델은 화질 선택에 따라 달라집니다. 우선순위 낮음. 상태: 제안(문구만).

### 3) 다른 자동화 프로그램과 연계
- 새로 찾은 것 없음. 기존 제안(인물사진 규격 저장 링크, 무료 사진 검색, 작업 워크스페이스 보내기)은 위 섹션들에 이미 있습니다.

### 4) 매뉴얼과 실제 기능의 차이 (이번에 고친 것 / 남은 것)
- 이번에 고침(미배포): 「만든 화보는 지금 쓰는 브라우저에만 저장」 → 실제는 계정 저장·최근 30개·30일(`src/app/api/history/route.ts:9-13`, v1.20부터). `src/components/GuideView.tsx` 질문 답변을 고쳤습니다.
- 이번에 보탬(미배포): 인스타 지금 게시·예약 게시·게시 기록·예약 취소·7일 그래프, 화질(1K·2K·4K), 올린 사진은 히스토리에 저장되지 않음, 시작 전 준비(Gemini 키·인스타 연결·예약 방식), 로그인 기기 안내, 공개 게시 주의.
- 남은 것: 폴더 루트 `MANUAL.md`(139줄)는 화면 매뉴얼과 따로 있는 문서라 이번에 대조하지 않았습니다(미확인). 우선순위 낮음.

### 5) 정책 점검 (pending-check 결과: 고지·저장 위젯·로그아웃 범위·서버 로그인 기기 정보·30일 정리 예외 회원)
- `node scripts/pending-check.mjs ai-influencer-studio` → 「대기 없음」. 저장공간 위젯 있음(`src/app/layout.tsx:20`), `signOut({ scope: "local" })` 적용(`src/app/api/auth/logout/route.ts:6`, `src/lib/actions/auth.ts`), 서버 `User-Agent` 전달 있음(`src/lib/supabase/server.ts:36`), `NOTICE` 있음.
- **30일 정리에 예외 회원(`retention_exempt`) 조건 없음** — 폴더 전체에서 `retention_exempt`를 쓰는 곳이 없습니다. 작업 히스토리 정리(`src/app/api/history/route.ts:38-43`)와 게시 기록 정리(`src/lib/instagram/posting.ts:151-165` `cleanupOldPosts`, 공용 사본 `insta-posting`)가 관리자·시험 계정·저장 구독 회원 것도 30일에 지웁니다. 이 문서 맨 위 2026-11-11 안내의 「`retention_exempt` 회원 제외만 유지」와 맞지 않습니다. 우선순위 높음. 상태: 제안(히스토리 라우트는 이 프로그램에서, `posting.ts`는 기준 `ai-webtoon-studio`에서 고친 뒤 사본 동기화 — 인스타 담당께). 매뉴얼에는 코드대로 「30일 뒤 자동 삭제」로만 적었습니다.
- 설정 창 링크: Gemini 「📖 발급 방법」 추가(이번에 고침, 미배포). cron-job.org는 매뉴얼 글 없음 — 기존 가입 링크와 3단계 설명만 유지.
