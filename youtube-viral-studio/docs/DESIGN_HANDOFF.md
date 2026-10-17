# 디자인 개발완료 인수인계 — YOUTUBE VIRAL FINDER (v1.13)

- **적용 템플릿**: **유튜브 다크 콘솔 스타일 — 스튜디오 변형** (DESIGN.md 9번 계열) + 스마트 매트릭스 구성. `youtube-auto-reply` v1.09와 **같은 `yt-*` 값**을 Tailwind v4 `@theme`로 이식 → [기준 문서](../../youtube-auto-reply/docs/DESIGN_HANDOFF.md)
- **작업**: Claude Code(맥미니), 2026-10-17 · 주인님 승인(「진행해줘」, 유튜브 다크 권장안) · 상태: ✅ 1차 작업완료 (v1.13, Codex Windows 운영 검수)
- **라이브**: https://youtube-viral-studio.buylife.xyz

## 1. 토큰·부품 (`src/app/globals.css`)
- `@theme`: `--color-yt-bg #0f0f0f` · `surface #181818` · `raised #212121` · `hover #2a2a2a` · `border #303030` · `text #f1f1f1` · `muted #aaaaaa` · `red #ff0000`/`red-hover #cc0000` · `link #3ea6ff` · `success #2ba640` · `warn #f9ab00` · `danger #ff4e45` · `violet #c4b5fd`(원본 찾기 보라 계열 대체)
- 부품 클래스: `.yt-btn-red` · `.yt-btn` · `.yt-card` · `.yt-section-title` · `.yt-chip`
- 등급 배지(썸네일 위라 불투명): 초대박 레드 · 대박 앰버(검은 글자) · 떡상 초록 · 양호 반투명 검정

## 2. 화면
| 화면 | 내용 |
|---|---|
| 사이드바 | 유튜브 로고 + 「Studio · 버전」, 선택 항목 왼쪽 빨간 막대 + 아이콘 빨강, STEP 1~5 표시, 설정·매뉴얼, 계정 메뉴 바로 아래, **휴대폰 위쪽 바 + ☰ 접는 메뉴(신규 — 원래 휴대폰에서 메뉴가 없었음)** |
| 🏠 `/dashboard`(신규, `/` 기본 이동) | 채널 배너식 머리말 · 기능 바로가기 4개(대표 지표 칩) · 연결 상태(YouTube 필수·AI 선택) · 무료 한도 안내(한국 오후 4시, 겨울 5시 충전) · 즐겨찾기 개수(브라우저에서 읽음, `components/dashboard/FavoriteCounts.tsx`). **유튜브 API 호출 없음** |
| 발굴 4화면·즐겨찾기·설정 | 색 토큰 일괄 치환 + 제목 크기 키움. 기능·문구 그대로 |
| 영상 카드 | 다크 카드, 마우스 올림 시 밝아짐, 등급 배지 불투명 |
| 📖 매뉴얼 | 기존 4단계·FAQ 유지 + 캐릭터 말풍선 · **숫자 읽는 법**(VPH·vsRatio·바이럴 점수 + 등급 기준표 — `lib/youtube/metrics.ts` 값과 동일) · TIP/주의(저작권) |
| 로그인 | `#0f0f0f` + 위쪽 붉은 빛, 빨간 로고, 알약 탭·버튼 |
| 레이아웃 | `(dashboard)/layout.tsx`에 `fetchCache = "force-no-store"` 추가(누락 보완) |

## 3. 주의
- 검색·분석 API·점수 계산·키 저장 변경 없음.
- 검수 때 검색·「대본 분석」 버튼은 회원 YouTube 할당량·AI 비용이 들어 누르지 않는다.
- Windows 인수에서 package1.13.0·APP/DB v1.13으로 동기화.

## 4. 배포·검수 기록
| 항목 | 값 |
|---|---|
| 정적 검사 | 맥미니 `tsc --noEmit` 오류 0 |
| 빌드·배포 | Windows Next16.4.2 통과 · dpl_4r4FxwdNB38SzofnmBQFYakRmdMt READY · 소스 b50bfaff929137c33538c3b8bb0a09c47aca48f8 |
| DB `programs.version` | v1.13 갱신 후 별도 SELECT 재확인, 주소·배지 유지 |
| 화면 검수 | 실제 일반 회원 Edge1440/375, 8화면·모든 메뉴·로그인/가입 탭·설정 키3종 확인. 자동 검색은 브라우저200합성 응답(실제 검색/AI0) |

세부 제한·잔여 과제·검수 명령·증거: [Windows 최종 인수인계](WINDOWS_HANDOFF_20261017.md). 회원별 즐겨찾기/30일 삭제는 미해결입니다.

## v1.14 후속 기능 완료

다크 디자인 유지. 즐겨찾기 회원별 DB/30일 보관·자동검색 제거·지수/가이드/한도/CSV 개선, 실제 Edge1440/375 검수 완료. [최신 기능 인수인계](IMPROVEMENT_HANDOFF_20261017_V114.md).
