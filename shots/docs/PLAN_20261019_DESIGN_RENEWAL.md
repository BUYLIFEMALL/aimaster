# 🚀 58번 YOUTUBE Shorts 자동화 디자인 리뉴얼 실행 계획서 (PLAN_20261019_DESIGN_RENEWAL.md)

- **일자**: 2026-10-19
- **대상**: 58번 YOUTUBE Shots(이미지 스토리) 자동화 (`shots/`, `auto-shorts-posting`)
- **도메인**: https://shots.buylife.xyz
- **목표 버전**: `v1.20`
- **사용자 요청**: "58번 유투브 느낌을 살려줘"

---

## 1. 단계별 실행 계획 및 완료 현황

1. **사전 플랜 수립 및 승인**: 사용자 "진행해줘" 지시에 따른 즉각 착수 [완료]
2. **유튜브 다크 콘솔 스타일 토큰 정의**:
   - `globals.css` 유튜브 스튜디오 테마 (`#0f0f0f`, `#181818`, `#ff0000`) 토큰화 [완료]
3. **사이드바 표준화 & 브랜딩 고도화**:
   - `Sidebar.tsx`: 유튜브 레드 플레이 버튼(▶), `v1.20 SHORTS LAB` 뱃지, 5단계 스텝퍼, `/guide` 신설, 모바일 햄버거 드로어 [완료]
4. **메인 워크스페이스 리뉴얼**:
   - `candidates/page.tsx`: `.studio-hero` 배너, 3대 KPI 카드, CandidateCollector/CandidateList 다크 테마 일체화 [완료]
5. **독립 비주얼 가이드북 신설**:
   - `/guide/page.tsx`: 5단계 파이프라인, 9:16 매트릭스 표, 3대 오디오 팁, FAQ 5종 레드 아코디언 [완료]
6. **버전 3중 동기화 (v1.20)**:
   - `package.json` (`1.20.0`), `version.ts` (`v1.20`), Supabase DB `programs` (`v1.20`) [완료]
7. **로컬 빌드 검증**:
   - Next.js 16.2.11 Turbopack 빌드 무결성 통과 [완료]
8. **Vercel 프로덕션 배포**:
   - `dpl_DAJtV5KLPT8KPpgv2FePCvcdpLf8` 배포 완료 (`READY`, `https://shots.buylife.xyz`) [완료]
9. **Microsoft Edge 포그라운드 실세션 검수**:
   - 6종 스크린샷 캡처 수집 완료 및 10분간 화면 유지 세션 진행 [완료]
10. **서브문서 6종 완비 및 루트 동기화**:
    - `AGENTS.md`, `README.md`, `DESIGN_HANDOFF.md`, `IMPROVEMENTS.md`, `IMPROVEMENT_BACKLOG.md`, `PLAN_*.md` 완비 [완료]
