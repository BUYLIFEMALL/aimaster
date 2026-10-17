# 디자인 개발완료 인수인계 — 네이버 블로그 SEO 스튜디오 (v1.69)

- **적용 템플릿**: **스마트 매트릭스 스타일 — 라이트 변형 · 네이버 그린 포인트** (일반 CSS 변수 방식, `blog-keyword`의 일반 CSS 이식과 같은 접근)
- **작업**: Claude Code(맥미니), 2026-10-17 · 주인님 승인(「진행해줘」) · 상태: 🟠 메인(윈도우) CLI 마무리 작업요망
- **라이브**: https://naver-blog-seo-studio.buylife.xyz

## 1. 1단계 — 파일 나누기 (커밋 `c8ab6eb9`, 동작 변경 없음)
- `components/StudioPage.tsx`(928줄) → 69줄 껍데기 + `components/studio/useStudio.ts`(상태·처리 함수 그대로) + `shared.ts`(공통 도우미·타입) + 화면 5개(`DashboardView`·`TitleView`·`NewDraftView`·`OptimizeView`·`HistoryView`). 화면은 `{ s }: { s: Studio }`를 받아 쓰는 이름만 꺼내 씀.
- 검증: 다시 합친 화면·로직이 원본과 **글자 단위로 동일**, `tsc --noEmit` 오류 0.

## 2. 2단계 — 디자인
| 항목 | 내용 |
|---|---|
| 색 | `:root` 변수: `--ink #0f172a` · `--muted #5b6475` · `--line #e2e6ee` · `--paper #f6f7f9` · `--accent #009b4d`(흰 글자 버튼·글자용 진한 그린) · `--accent-bright #03c75a`(로고·캐릭터) · `--accent-soft #e8f8ef`. CSS에 직접 적힌 따뜻한 회갈색·주황 흔적 96곳을 차가운 회색·그린으로 교체. **노란 안내(.notice·경고)·빨간 오류·초록 완료 상태색은 그대로** |
| 공용 사이드바 | `components/studio/StudioSidebar.tsx` — 대시보드(화면 전환)·설정·매뉴얼(링크) 공용. N 로고, STEP 1~4, 🔑 설정 · 📖 매뉴얼, 계정 + **실제 동작하는 로그아웃**(`supabase.auth.signOut()` → `/login`), 데스크톱 고정(sticky), **767px 이하 위쪽 바 + ☰** |
| 대시보드 | 머리말 오른쪽 고정 문구 「AIMaster 계정 연동 전」 → `👤 로그인 계정` |
| 설정 | 동작하지 않던 로그아웃 버튼이 있던 `app/settings/SettingsSidebar.tsx` 삭제, 숨김 처리된 옛 사이드바(번호 중복) 제거, 공용 사이드바 사용 |
| 📖 `/guide`(신규) | 캐릭터 말풍선 · 5단계(API 키 → 확장 설치·토큰 → 제목 추천 → 새 글 → 네이버 입력) · TIP/주의 · 키 발급 매뉴얼 3개 · FAQ 4개(자동 발행 안 함·확장 토큰·비용·30일 보관). 문구는 설정·확장 카드 실제 문구와 맞춤 |
| 크롬 확장 | 화면 변경 없음. `manifest.json` `1.69.0` / `v1.69`(원칙 10) |

## 3. 주의
- AI 글·이미지 생성(윈도우의 공용 이미지 코드 포함)·카테고리·확장 통신·토큰·DB 변경 없음.
- 920px 이하에서는 사이드바 폭 220px, 767px 이하에서 ☰로 바뀜.
- 검수 때 「생성」「이미지 생성」「확장으로 보내기」는 회원 키 과금·외부 입력이라 누르지 않는다.

## 4. 배포·검수 기록
| 항목 | 값 |
|---|---|
| 정적 검사 | 맥미니 `tsc --noEmit` 오류 0(1·2단계 각각) |
| 확장 ZIP·빌드·배포 | 대기(윈도우: `npm run extension:archive` → 빌드 → 배포) |
| DB | `version`·`extension_version` = `v1.69`, `extension_download_url` 확인, `node scripts/check-extension-release.mjs naver-blog-seo-studio` OK 필요 |
| 화면 검수 | 대기 — 배포 후 맥미니 크롬(시험 계정)에서 주인님과 함께 확인 |
