# 음악(SUNO)자동화 (music-automation) 디자인 & 기능 리뉴얼 인수인계 (v1.47)

> **일시**: 2026-10-25
> **버전**: `v1.47` (이전 v1.46)
> **서비스 주소**: https://music-automation.buylife.xyz
> **Vercel 프로덕션**: `https://music-d7i4i9noi-buylife.vercel.app`

---

## 1. 디자인 템플릿 3대 기준 명시 (DESIGN.md 원칙 22 준수)
1. **어떤 템플릿인가**: `사이버 수노 다크 스튜디오 스타일 (Cyber Suno Dark Studio Style)`
2. **어떤 스타일인가**: 퓨어 옵시디언 딥블랙(`#09090b` / `#14141b`) 베이스에 Suno 오리지널 앰버 오렌지(`#f97316`) 및 일렉트릭 바이올렛 시그니처 포인트가 결합된 프로페셔널 오디오 워크스테이션(DAW) 스타일 + 4px 물리적 키캡 푸시 모션의 3D 엠보싱 버튼 세트(`.btn-3d-primary`, `.btn-3d-emerald`, `.btn-3d-amber`, `.btn-create-key`, `.btn-platform-signup`).
3. **왜 이 프로그램에 적용되어 있는가 (선정 이유)**: 어두운 음악 작업실 환경에서 장시간 사운드 프로듀싱과 정밀 곡 기획에 집중할 수 있는 DAW 고유의 시각적 안정감을 제공하고, Suno 공식 Create 엔진 및 외부 AI(OpenAI/Claude/Gemini) 키를 직관적으로 연동할 수 있도록 최적화하기 위함.

---

## 2. v1.47 주요 변경 사항
1. **4대 플랫폼 공식 키발급 2단 퀵액션 버튼 세트 탑재**:
   - `music/components/settings/ApiKeyRow.tsx`: Suno AI, OpenAI, Claude, Google Gemini 공식 키 발급 바로가기(`.btn-create-key`) + 가입 바로가기(`.btn-platform-signup`) 2단 버튼 세트 및 3D 저장 버튼 전면 탑재.
   - `music/components/settings/ApiKeyRequiredModal.tsx`: 키 설정하러 가기 3D 버튼(`.btn-3d-primary`) 적용.
2. **글로벌 3D 엠보싱 버튼 규격화**:
   - `music/app/globals.css`: 사이버 수노 오렌지 테마 2단 수직 그라데이션, `box-shadow: 0 4px 0 ...`, hover 시 부유(-1.5px), active 시 4px 눌림 모션 완벽 구현.
3. **핵심 실행 버튼 3D 엠보싱화**:
   - 곡 기획 목록(`plannings/page.tsx`): "+ 새 곡 기획하기" 3D 버튼 적용.
   - 새 곡 기획 폼(`PlanningForm.tsx`): "🎼 곡 기획 시작하기" 3D 엠보싱 메인 CTA 적용.
   - 트랙 생성 패널(`GenerateTracksPanel.tsx`): "🚀 지금 음악 생성하기" 3D 엠보싱 실행 버튼 탑재.
   - 가이드북(`guide/page.tsx`): 상단 히어로 헤더에 3D 새 곡 기획 바로가기 버튼 추가.
4. **네이버 웨일(Whale) 실제 창(1440x900) 실세션 검수 완료**:
   - 기획 목록, 키 설정 화면(4대 플랫폼 키발급 2단버튼), 가이드북, 새 곡 기획 폼 전면 검수 완료.
