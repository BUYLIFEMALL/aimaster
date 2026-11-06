# AI 시네마틱 스토리보드 자동화 (`cinematic-storyboard-studio`) 디자인 리뉴얼 인수인계서 (v1.19)

> **프로그램명**: AI 시네마틱 스토리보드 자동화 (`cinematic-storyboard-studio`)  
> **버전**: `v1.19.0` (2차 전면 리뉴얼 완료)  
> **채택 시안**: **1안 — 57. 헐리우드 9컷 시네마틱 디렉터스 뷰파인더 스타일**  
> **영구 아카이빙 폴더**: `D:\Antigravity\Design\57_hollywood_9cut_directors_viewfinder`  
> **완료 일자**: 2026-11-06  
> **담당 에이전트**: Antigravity (`agy`, 세션: `agy-win-mvs-v2`)  

---

## 1. 개요 및 변경 목적
- **목적**: 2026-10-29 숏폼/영상 도메인 톤앤매너 지침(어두운 다크 톤 지양, 헐리우드/쇼츠 아이코닉 레드 `#EF4444`/`#DC2626` & 골드 `#F59E0B`의 생동감 넘치는 크리에이터 스튜디오 감성) 및 2026-11-01 로그인 5단계 수직 레이아웃 표준 규격을 완벽 준수하여 전면 개편.
- **채택안 특징**:
  - LIVE 🔴 REC 실시간 타임코드 뷰파인더 덱 & 4단계 시네마틱 원스톱 파이프라인 인디케이터 배너 (① 이미지·시놉시스 입력 → ② 9컷 시퀀스 콘티 기획 → ③ 2K 마스터 시트 렌더 → ④ 영상 AI 프롬프트 연동)
  - 3D 엠보싱 헐리우드 레드 버튼(`.btn-3d-red`, `.btn-3d-shorts`) & 시네마틱 골드 버튼(`.btn-3d-gold`)
  - 2026-11-01 로그인 5단계 수직 레이아웃 표준 규격 준수 (64px 레드 글로우 로고 + `AIMASTER CINEMATIC STORYBOARD` 알약 뱃지 + 볼드 한글명 + 3D 레드 버튼 + 1행 축소 약관)
  - 9컷 시퀀스 뷰파인더 브래킷 덱 및 2K UHD 마스터 시트 원클릭 ZIP 분할 다운로드

---

## 2. 배포 및 검증 결과
- **공식 운영 도메인**: [https://cinematic-storyboard-studio.buylife.xyz](https://cinematic-storyboard-studio.buylife.xyz)
- **Vercel 프로덕션 보조 링크**: [https://cinematic-storyboard-studio-ldmufeco9-buylife.vercel.app](https://cinematic-storyboard-studio-ldmufeco9-buylife.vercel.app)
- **배포 ID**: `dpl_6MkrHSfBnVZ56chuejUx2YZBKbAz`
- **통합 쇼케이스 URL**: [http://localhost:3800/showcase.html](http://localhost:3800/showcase.html)
- **독립 비교표 URL**: [http://localhost:3800/comparison.html](http://localhost:3800/comparison.html)
- **로컬 영구 자산 경로**: `D:\Antigravity\Design\57_hollywood_9cut_directors_viewfinder`

---

## 3. 핵심 수정 파일
1. `src/app/globals.css`:
   - 헐리우드 레드/골드 변수, `.btn-3d-red`, `.btn-3d-shorts`, `.btn-3d-gold` 3D 엠보싱 버튼 클래스, `.rec-pulse`, `.glow-red`, 뷰파인더 코너 브래킷 스타일 추가
2. `src/app/(auth)/login/page.tsx`:
   - 2026-11-01 5단계 수직 레이아웃 표준 규격으로 전면 개편
3. `src/components/studio/StudioWorkspace.tsx`:
   - LIVE 🔴 REC 타임코드 뷰파인더 배너, 4단계 파이프라인 인디케이터, 3D 엠보싱 레드 콘티 렌더 버튼 및 골드 마스터 저장 버튼 탑재
4. `src/app/(dashboard)/guide/page.tsx`:
   - 헐리우드 뷰파인더 헤더 배너 및 3D 엠보싱 레드 CTA 버튼 정렬
5. `package.json` & `src/lib/version.ts`:
   - `1.19.0` / `v1.19` 버전 업
