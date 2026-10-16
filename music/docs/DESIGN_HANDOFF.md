# 음악(SUNO)자동화 (music/) v1.08 사용 가이드북(/guide) 전면 신설 인수인계 문서 (DESIGN_HANDOFF.md)

작성일시: 2026-10-16  
작업 CLI: Antigravity (Windows)  
배포 URL: `https://music-rho-virid-22.vercel.app/` (`https://music-rho-virid-22.vercel.app/guide`)  
적용 버전: `v1.08` (공유 DB `programs.version = 'v1.08'` 동기화 완료)

---

## 1. 디자인 개요 및 스타일 템플릿 명명
- **스타일 템플릿 공식 명칭**: **`사이버 수노 다크 스튜디오 스타일 (Cyber Suno Dark Studio Style)`**  
  *(루트 `DESIGN.md` 카탈로그 54번 공식 등록 템플릿)*
- **모티브/컨셉**: Suno 공식 웹사이트(`suno.com/discover`, `suno.com/create`)의 딥 다크 콘솔과 비비드 앰버 오렌지 네온 액센트, 3대 인터랙티브 탭 가이드북 시스템 구축.

---

## 2. 디자인 시스템 및 컬러 토큰 사양
| 토큰 이름 | 색상 코드 | 용도 및 설명 |
| :--- | :--- | :--- |
| **Deep Background** | `#09090b` | 전체 페이지 퓨어 딥 블랙 배경 |
| **Studio Surface** | `#121217` | 사이드바 배경 및 서브 컨테이너 |
| **Card Surface** | `#13131a` / `#14141b` | 메인 콘텐츠 및 가이드 위젯 다크 글래스 카드 |
| **Card Border** | `#262635` / `#272732` | 다크 카드 테두리 및 구분선 |
| **Brand Orange** | `#f97316` | Suno 브랜드 메인 앰버 오렌지 |
| **Brand Amber Hover** | `#ea580c` / `#d97706` | 버튼 및 링크 호버 상태 |
| **Neon Accent** | `#fb923c` | 활성 탭 및 글로우 인디케이터 |
| **Primary Text** | `#ffffff` / `#f4f4f5` | 고대비 헤더 및 굵은 타이틀 텍스트 |
| **Secondary Text** | `#d4d4d8` / `#a1a1aa` | 본문 및 레이블 텍스트 |
| **Muted Text** | `#71717a` / `#52525b` | 메타 정보 및 안내 문구 |

---

## 3. 주요 컴포넌트 및 레이아웃 구조 (v1.08)
1. **사이드바 (`components/layout/Sidebar.tsx`)**:
   - `SUNO` 브랜드 엠블럼 + `v1.08` 오렌지 틴트 배지.
   - 3단계 워크플로우 네비게이션:
     - 1단계: 🎼 음악 기획 (`/plannings/new`)
     - 2단계: 🎵 음악 생성 · 트랙 관리 (`/plannings`)
     - 3단계: 🎛️ 음악 Remix 스튜디오 (`/remix`)
   - **유틸리티 메뉴 보강**:
     - `KeyRound` / 🔑 API 키 등록 · 플랫폼 연동 (`/settings`)
     - **`BookOpen` / 📚 연동 & 사용 안내 (`/guide`) 신설 연동 완료!**
   - **접속 계정 정보 및 로그아웃 밀착 배치 (주인님 지시)**:
     - 기존 `mt-auto` 하단 고정을 제거하고, 유틸리티 메뉴 바로 아래 `border-t border-[#23232f] pt-3 px-1` 위치에 바짝 밀착.
   - 하단 Suno 최신 엔진 배너 카드 유지.
2. **신설된 3대 탭 인터랙티브 가이드북 (`components/guide/MusicUsageGuide.tsx`, `/guide`)**:
   - **탭 1: 📋 4단계 실전 마스터 가이드**:
     - STEP 00 (필수 API 키 등록 및 플랫폼 연동)
     - STEP 01 (새 음악 기획 - 주제·분위기 → 스타일 & 가사 완성, 보컬 성별, 연주곡 모드)
     - STEP 02 (Suno AI 생성 & 트랙 관리 - 2곡 동시 생성, 실시간 스트리밍, 앨범 커버)
     - STEP 03 (프로페셔널 후가공 - 곡 연장 Extend, MR/보컬 분리, 방송용 무손실 WAV)
     - STEP 04 (음악 Remix 스튜디오 - 원곡/외부 오디오 기반 새로운 장르 리메이크)
   - **탭 2: 🎛️ Suno 스타일 & 메타 태그 비법**:
     - 4대 인기 스타일 프리셋 코드 (K-Pop, Lofi Hip Hop, City Pop, Cinematic OST)
     - 6대 가사 메타 태그 아코디언 (`[Intro]`, `[Verse]`, `[Pre-Chorus]`, `[Chorus]`, `[Bridge]`, `[Outro]`)
   - **탭 3: 💡 사운드 꿀팁 & FAQ**:
     - 4대 프로 사운드 꿀팁 (한글 발음 최적화, 곡 연장 이음매, 깨끗한 MR 분리, 상업적 저작권)
     - 5대 트러블슈팅 FAQ 아코디언 (생성 대기시간, 연장 횟수, WAV vs MP3, 연주곡 보컬 유입 방지, 크레딧 확인)

---

## 4. Microsoft Edge 브라우저 전용 실세션 검수 증거
- **검수 브라우저**: **Microsoft Edge (`msedge.exe`) 전용** (규칙 준수, Chrome 배제).
- **테스트 계정**: `buylifemall@naver.com` (일반 회원 인증 세션 검수 완료).
- **생성된 검수 아티팩트 (v1.08)**:
  - 데스크톱 매뉴얼 탭 1 (4단계 실전 가이드 & 사이드바 메뉴/계정 밀착): `edge_music_guide_steps_v108.png` (1440 × 900)
  - 데스크톱 매뉴얼 탭 2 (스타일 & 메타 태그 비법): `edge_music_guide_styles_v108.png` (1440 × 900)
  - 데스크톱 매뉴얼 탭 3 (사운드 꿀팁 & FAQ): `edge_music_guide_faq_v108.png` (1440 × 900)
  - 모바일 반응형 뷰: `edge_music_guide_mobile_v108.png` (375 × 812)

---

## 5. 배포 정보
- **배포 플랫폼**: Vercel Production
- **배포 ID**: `dpl_BX2dEv8K8btS5SEcTbXSDEu6N84E`
- **배포 도메인**: `https://music-rho-virid-22.vercel.app` (HTTP 200 정상)
- **DB 동기화**: `programs` 테이블 `music-automation`의 `version` 컬럼 = `v1.08`
