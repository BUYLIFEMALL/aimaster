# YOUTUBE 플레이리스트 자동화 (playlist-channel-studio) 디자인 & 기능 리뉴얼 인수인계 (v1.32)

> **일시**: 2026-10-25
> **버전**: `v1.32` (이전 v1.31)
> **서비스 주소**: https://playlist.buylife.xyz (https://playlist-maker.buylife.xyz)
> **Vercel 프로덕션**: `https://playlist-channel-studio-lswunya9c-buylife.vercel.app`

---

## 1. 디자인 템플릿 3대 기준 명시 (DESIGN.md 원칙 22 준수)
1. **어떤 템플릿인가**: `사이버 네온 & 유튜브 다크 스튜디오 스타일 (Cyber Neon & YouTube Dark Studio Style)`
2. **어떤 스타일인가**: 퓨어 옵시디언 블랙(`#060911` / `#0f0f0f`) 베이스에 사이버 네온 사이언(`#06b6d4`)과 유튜브 오리지널 레드(`#ef4444` / `#ff0000`) 듀얼 포인트가 결합된 하이테크 방송국 콘솔 스타일 + 4px 물리적 키캡 푸시 모션의 3D 엠보싱 버튼 세트(`.btn-3d-primary`, `.btn-3d-cyan`, `.btn-3d-emerald`, `.btn-create-key`, `.btn-platform-signup`).
3. **왜 이 프로그램에 적용되어 있는가 (선정 이유)**: 유튜브 전문 영상 채널 제작에 최적화된 방송국 데스크 감성을 제공하고, 오디오 비주얼라이저 10종 스펙트럼 조작과 WebCodecs 1080p 고속 렌더링 및 YouTube Data API v3 연동을 직관적으로 완료할 수 있도록 하기 위함.

---

## 2. v1.32 주요 변경 사항
1. **플랫폼 공식 키발급 2단 퀵액션 버튼 세트 탑재**:
   - `ApiKeySettings.tsx`: Google Gemini, OpenAI, Claude, Google Cloud (YouTube Data API v3) 공식 키 발급 바로가기(`.btn-create-key`) + 가입 바로가기(`.btn-platform-signup`) 2단 퀵액션 버튼 세트 전면 탑재.
   - 키 저장/교체 버튼의 3D 엠보싱화(`.btn-3d-cyan`).
2. **글로벌 3D 엠보싱 버튼 규격화**:
   - `globals.css`: 사이버 네온 사이언 테마 및 유튜브 레드 테마 수직 2단 그라데이션, `box-shadow: 0 4px 0 ...`, hover 시 부유(-1.5px), active 시 4px 눌림 모션 완벽 구현.
3. **핵심 실행 버튼 3D 엠보싱화**:
   - 스튜디오 공용 실행 버튼([`common.tsx`](file:///D:/Antigravity/AIMaster/playlist-channel-studio/src/components/studio/common.tsx) `PrimaryButton`): 3D 사이언 버튼(`.btn-3d-cyan`) 전면 적용.
   - 1080p MP4 고속 영상 렌더링([`ExportStudio.tsx`](file:///D:/Antigravity/AIMaster/playlist-channel-studio/src/components/video/ExportStudio.tsx)): 내보내기/렌더링 시작 버튼 3D 유튜브 레드(`.btn-3d-primary`)화.
   - 유튜브 업로드 카드([`YoutubeUploadCard.tsx`](file:///D:/Antigravity/AIMaster/playlist-channel-studio/src/components/video/YoutubeUploadCard.tsx)): "유튜브에 올리기" 3D 엠보싱(`.btn-3d-primary`) 적용.
   - 가이드북([`guide/page.tsx`](file:///D:/Antigravity/AIMaster/playlist-channel-studio/src/app/(dashboard)/guide/page.tsx)): 상단 및 하단 CTA 버튼 3D 사이언(`.btn-3d-cyan`)화.
4. **네이버 웨일(Whale) 실제 창(1440x900) 실세션 검수 완료**:
   - 스튜디오, 설정 화면(키발급 2단 버튼), 가이드북, 영상 만들기 화면 전면 검수 완료.
