# `shots` (YOUTUBE Shots 자동화) 디자인 핸드오프 (v1.44)

## 1. 개요 및 디자인 템플릿
- **프로그램명**: `shots` (58번 YOUTUBE Shots 자동화 스튜디오)
- **도메인**: `https://shots.buylife.xyz` / `https://shots-2zmi8an69-buylife.vercel.app`
- **적용 디자인 템플릿**: **21. 헐리우드 시네마틱 네온 REC 스타일 (Hollywood Cinematic Neon REC Style)**
- **소속 그룹**: [Group 2] 유튜브 & 숏폼 영상 자동화 그룹 (대표 프로그램)
- **영구 보존 디렉터리**: `D:\Antigravity\Design\21_헐리우드_시네마틱_네온_REC_스타일\shots`
- **배경 및 선정 이유**:
  - 기존 블로그 프로그램들의 그린/오렌지/다크 테마에서 탈피하여 헐리우드 영상 프로덕션 현장의 뷰파인더 OSD 및 LIVE 🔴 REC 메타포를 도입
  - 1080×1920 세로 숏폼 영상 스튜디오의 전문성과 몰입감을 극대화

## 2. 컬러 토큰 스펙
- **Background**: `#0b0d1b` (시네마틱 딥 네이비 블랙)
- **Surface**: `#13182c` (스튜디오 다크 서피스)
- **Surface Card**: `#161c33`
- **Surface Hover**: `#1f2847`
- **Border**: `#202945` (서브 테두리)
- **Border Strong**: `#334168`
- **Brand Point (Primary)**: `#f43f5e` (루비 레드 네온)
- **Brand Accent (Secondary)**: `#fbbf24` (헐리우드 골드 앰버)
- **Selection**: `bg-rose-500 text-white`

## 3. 3D 엠보싱 버튼 규격 (DESIGN.md 원칙 21)
- `.btn-3d-rec`: 
  - `background: linear-gradient(180deg, #f43f5e 0%, #e11d48 100%)`
  - `box-shadow: 0 4px 0 #9f1239, 0 6px 14px rgba(244, 63, 94, 0.35)`
  - hover: `translateY(-1.5px)`, click: `translateY(3px)`
  - 주요 적용: 브라우저 1080p 렌더링, 스크립트 생성, 로그인 액션
- `.btn-3d-amber`:
  - `background: linear-gradient(180deg, #fbbf24 0%, #d97706 100%)`
  - `box-shadow: 0 4px 0 #92400e, 0 6px 14px rgba(251, 191, 36, 0.35)`
  - 주요 적용: 매뉴얼 바로가기, 회원가입 바로가기
- `.btn-create-key`:
  - `background: linear-gradient(180deg, #3b82f6 0%, #1d4ed8 100%)`
  - `box-shadow: 0 3.5px 0 #1e3a8a, 0 5px 12px rgba(59, 130, 246, 0.3)`
  - 주요 적용: API 키 및 플랫폼 매뉴얼 팝업 링크
- `.btn-3d-dark`:
  - `background: linear-gradient(180deg, #202945 0%, #161c33 100%)`
  - `box-shadow: 0 3px 0 #0f1424, 0 4px 10px rgba(0, 0, 0, 0.3)`
  - 주요 적용: 로그아웃, 취소, 채널 연결 상태

## 4. 4대 화면 개편 내역
1. **메인 화면 (`/candidates`)**:
   - 헐리우드 시네마틱 뷰파인더 OSD 배너 장착
   - LIVE 🔴 REC 펄스 인디케이터 및 `v1.44` 동적 배지
   - 3D 엠보싱 제작 매뉴얼 바로가기 버튼(`.btn-3d-amber`)
   - 3대 KPI 카드 및 3종 수집 카운터 바 다크 시네마틱 통일
2. **상세/제작 화면 (`/scripts`, `/videos`, `BrowserRenderPanel`)**:
   - WebCodecs GPU 가속 1080p 렌더러 패널 탑재
   - 3D 엠보싱 렌더링 버튼(`.btn-3d-rec`)
   - 6개 씬 시퀀서 및 오디오 진행 프로그레스 바
3. **매뉴얼 화면 (`/guide`)**:
   - 5단계 영화 제작 파이프라인 인포그래픽 카드
   - 9:16 비주얼 프롬프트 및 떡상 연출 공식 테이블
   - 100% BYOK 보안 원칙 및 아코디언 FAQ
4. **설정 화면 (`/settings`)**:
   - 기존의 `bg-white` 카드를 전면 제거하고 딥 네이비 `#13182c` 다크 카드로 전면 통일 (원칙 13 완벽 준수)
   - 단계별 API 키 그룹핑 및 3D 엠보싱 키발급 버튼(`.btn-create-key`)
   - ElevenLabs 더빙 및 YouTube OAuth 연동 카드
5. **로그인/회원가입 (`/login`, `/signup`)**:
   - 헐리우드 시네마틱 다크 그리드 배경 및 표준 탭 토글 레이아웃 (원칙 14 준수)
