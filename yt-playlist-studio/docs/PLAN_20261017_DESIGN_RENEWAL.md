# Youtube Playlist 자동화 — 유튜브 다크 테마 디자인 리뉴얼 개발 플랜 (PLAN_20261017_DESIGN_RENEWAL.md)

> **프로그램 공식 명칭**: Youtube Playlist 자동화 (`yt-playlist-studio`)  
> **공식 라이브 도메인**: https://youtube-playlist.buylife.xyz (또는 https://yt-playlist.buylife.xyz/)  
> **현재 버전**: `v1.05` ➔ **목표 버전**: `v1.06`  
> **적용 디자인 템플릿**: **유튜브 다크 콘솔 스타일 (YouTube Dark Console Style · 유튜브 공식 다크 테마)**  
> **배경 테마**: 다크(퓨어 옵시디언 블랙 `#0f0f0f` + 유튜브 레드 `#ff0000`)  
> **검수 브라우저**: Microsoft Edge 전용 (`msedge.exe`)  
> **작성 일자**: 2026-10-17  
> **담당 에이전트**: Antigravity(Windows) — `agy`  

---

## 1. 개요 및 배경

주인님 지시사항 (2026-10-17):
> "https://yt-playlist.buylife.xyz/ 검정색 베이스로 작업하고 로고를 유투브 로그를 사용해주고 유투브 테마 느낌이 나게 다시 디자인해줘"

현재 `yt-playlist-studio`는 화이트/라이트 슬레이트 베이스(`bg-slate-50`, `bg-white`, `border-slate-200`)로 구축되어 있어, 유튜브 플레이리스트 제작 도구 특유의 미디어 몰입감과 유튜브 브랜드 아이덴티티가 다소 부족한 상태입니다.
또한 사이드바에 단순 모달 형태(`HelpModal`)만 존재하여, 최상단 지침 7번·9번(**"미구현 프로그램 발견 시 매뉴얼 메뉴 및 단계별 사용 매뉴얼 추가 기본 의무"**)을 충족하는 전면 비주얼 가이드북(`/guide`) 구축이 필요합니다.

---

## 2. 핵심 작업 범위 및 구현 계획

### A. 검정색 베이스(Black Base) & 유튜브 공식 다크 테마 전면 적용 (최상단 지침 11번, 13번)
- **단일 배경색**: 퓨어 옵시디언 블랙 `#0f0f0f` (YouTube Official Dark Background) 전 화면 통일.
- **카드 서피스**: `#181818` / `#212121` (YouTube Dark Card Surface, `border-[#272727]`).
- **텍스트 컬러**: 메인 타이틀 `#ffffff`, 본문 `#f1f1f1`, 설명/메타 `#aaaaaa` (유튜브 다크 표준).
- **호버 및 액센트**: 서피스 호버 `#272727`, 프라이머리 포인트 **유튜브 오리지널 레드 `#ff0000`** (`hover:bg-[#cc0000]`).
- `src/app/globals.css`: `:root { --background: #0f0f0f; --foreground: #f1f1f1; }` 및 다크 스크롤바.
- `src/components/PlaylistStudioApp.tsx`, `MediaCenter.tsx`, `EditorStudio.tsx`, `ExportStudio.tsx`의 모든 배경과 컨테이너를 완벽한 다크 테마로 전환.

### B. 유튜브 로고(YouTube Logo) & 브랜딩 탑재
- 사이드바 상단, 메인 헤더, 가이드북에 **유튜브 오리지널 레드(`#ff0000`) 라운드 사각형 + 흰색 재생 삼각 아이콘(▶)** 공식 심볼 장착.
- 공식 타이틀 표기: `YouTube Playlist Studio` (또는 `YouTube Playlist 자동화`).
- 상단 칩/필터: 유튜브 특유의 알약형(Pill) 라운드 칩 UI 적용.

### C. 📖 연동 & 사용 매뉴얼 (`/guide` & `currentTab = 'guide'`) 전면 신설 (최상단 지침 7번, 9번)
- **5단계 파이프라인 인포그래픽**:
  1. Step 1: `Gemini API 키 1초 연동` (AI 감성 배경 생성 인프라)
  2. Step 2: `음원 드롭존 & 유튜브 챕터 자동 생성` (타임라인 원클릭 복사)
  3. Step 3: `16:9 감성 배경 & 1:1 채널 로고 등록` (Imagen 3 생성 및 로컬 업로드)
  4. Step 4: `오디오 스펙트럼 & 14종 파티클 커스텀` (비트 반응 FX)
  5. Step 5: `WebCodecs GPU 가속 1080p MP4 고속 인코딩` (소리+영상 완벽 렌더링)
- **유튜브 플레이리스트 떡상 4대 골든 팁**:
  - 첫 곡 30초 훅, 썸네일 무드 통일, 유튜브 타임라인 필수 기재, 비트 반응 파티클.
- **자주 묻는 질문(FAQ) 4종 아코디언 컴포넌트**:
  - MP4 무음 이슈 해결 여부(v1.05 완비), 음원 저작권 및 수익 창출, 대용량 렌더링 메모리, API 키 보안.
- **회원 본인 키 연동 보안 배너**: 본인 키 직접 연동 불변 원칙 안내.
- **독립 URL 라우트**: `src/app/guide/page.tsx` 신설.

### D. 사이드바 네비게이션 표준 정돈 (`src/components/Sidebar.tsx`)
- 사이드바 배경을 다크 `#0f0f0f` 및 보더 `#272727`로 통일.
- 유틸리티 영역에 `📖 연동 & 사용 매뉴얼` 메뉴 탑재 (`currentTab === 'guide'`).
- `🔑 API키등록·플랫폼연동` 및 하단 계정 이메일/로그아웃 12px 바짝 밀착 배치.

---

## 3. 검증 및 배포 절차

1. 버전 판올림: `v1.05` ➔ `v1.06` (`src/lib/version.ts`, `package.json`, Supabase 공유 DB `programs.version = 'v1.06'`).
2. 로컬 빌드 검증: `npm run build` 오류 없음 확인.
3. Vercel 프로덕션 배포: `vercel deploy --prod --yes --scope buylife` (`https://youtube-playlist.buylife.xyz/`).
4. Microsoft Edge (`msedge.exe`) 전용 실세션 검수 (데스크톱 1440px, 모바일 390px 화면 캡처 및 시각적 검증).
5. 인수인계 문서 및 상태 현황판 갱신, Git 커밋 및 푸시.
