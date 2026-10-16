# 시네마틱 스토리보드 자동화 (`cinematic-storyboard-studio`) — 개선사항 인수인계서 (2026-10-16)

> **인수인계 일자**: 2026-10-16  
> **작성 에이전트**: Antigravity CLI (`agy`)  
> **대상 프로그램**: `cinematic-storyboard-studio` (`v1.05` → `v1.06`)  
> **상태**: 📋 개발 플랜 수립 및 리뉴얼 착수 단계

---

## 1. 개요 및 인수인계 목적
본 문서는 Antigravity CLI(agy), Codex, Claude Code 등 어떤 AI 코딩 에이전트가 이어서 작업하더라도 시네마틱 스토리보드 자동화 프로그램의 디자인 리뉴얼 작업 흐름을 끊김 없이 이어받을 수 있도록 작성된 인수인계서입니다.

---

## 2. 작업 대상 및 핵심 변경 범위

1. **디자인 시스템**:
   - 공식 스타일: `✨ 크리에이티브 아틀리에 스타일 (시네마틱 아틀리에)`
   - 단일 배경색: `bg-[#0b0f17]` (딥 시네마틱 차콜)
   - 포인트 컬러: 앰버 골드(`#f59e0b`) & 필름 클래퍼보드 레드(`#ef4444`)
2. **사이드바 표준화**:
   - `📖 연동 & 사용 매뉴얼` (`/guide`) 메뉴를 유틸리티 영역 최상단에 배치하고 앰버 골드 뱃지로 강조.
3. **가이드북(`/guide`) 전면 구축**:
   - 5단계 시네마틱 스토리보드 제작 파이프라인 인포그래픽.
   - Google Gemini 무료 API 키 연동 안내 카드 (최상위 절대 불변 규칙 준수).
   - 시네마틱 촬영 용어 & 앵글 무빙 치트시트.
   - 비디오 생성 AI (Runway Gen-3, Kling, Luma) 연동 노하우.
   - 자주 묻는 질문(FAQ) 아코디언 4종.
4. **전 화면 다크 콘솔 일체화**:
   - `/studio`, `/projects`, `/settings`, `/guide`의 카드 서피스, 폼 인풋, 캔버스 에디터 테마 통일.
5. **버전 및 배포**:
   - 버전: `v1.06` 판올림 및 DB `programs.version` 동기화.
   - Vercel 프로덕션 배포 및 Microsoft Edge (`msedge.exe`) 실세션 브라우저 검수.

---

## 3. 검수 체크리스트
- [ ] Next.js Turbopack 빌드 성공 (`npm run build`)
- [ ] Vercel 프로덕션 배포 완료 (`https://cinematic-storyboard-studio.buylife.xyz`)
- [ ] Microsoft Edge 브라우저로 일반 회원 테스트 계정(`buylifemall@naver.com`) 로그인 후 `/guide`, `/studio`, `/projects`, `/settings` 전 화면 다크 톤 일치 확인
- [ ] 모바일 390px 반응형 뷰 햄버거 메뉴 및 카드 가독성 점검
- [ ] `DESIGN.md` 상태를 `✅ 1차 작업완료 (v1.06, 크리에이티브 아틀리에 스타일)`로 갱신
- [ ] `docs/ACTIVE_WORK.md`에서 작업 행 삭제
