# video-to-gif (AI 영상렌더 스튜디오) 디자인 리뉴얼 인수인계서 (v1.27)

> **프로그램명**: AI 영상렌더 스튜디오 (`video-to-gif`)  
> **버전**: `v1.27.0` (2차 전면 리뉴얼)  
> **채택 시안**: **1안 — 54. 시네마틱 헐리우드 네온 REC 렌더러 스타일**  
> **영구 아카이빙 폴더**: `D:\Antigravity\Design\54_cinematic_hollywood_neon_rec`  
> **완료 일자**: 2026-11-06  
> **담당 에이전트**: Antigravity (`agy`, 세션: `agy-win-mvs-v2`)  

---

## 1. 개요 및 변경 목적
- **목적**: 2026-10-29 숏폼/영상 도메인 톤앤매너 지침(어두운 다크 톤 지양, 헐리우드/쇼츠 아이코닉 레드 `#EF4444`/`#DC2626` & 골드 `#F59E0B`의 생동감 넘치는 크리에이터 스튜디오 감성) 및 2026-11-01 로그인 5단계 수직 레이아웃 표준 규격을 완벽 준수하여 전면 개편.
- **채택안 특징**:
  - LIVE 🔴 REC 타임코드 뷰파인더 덱 & 4단계 원스톱 파이프라인 인디케이터 배너
  - 스마트스토어(20MB), 쿠팡(10MB 이하), 고화질 50FPS, 초경량 5MB 마켓 최적화 원클릭 프리셋 칩
  - 3D 엠보싱 헐리우드 레드 버튼(`.btn-3d-red`, `.btn-3d-shorts`) & 시네마틱 골드 버튼(`.btn-3d-gold`)
  - 로그인 페이지 5단계 수직 레이아웃 완벽 이식 (64px 레드 글로우 로고 + `AIMASTER VIDEO TO GIF` 알약 뱃지 + 볼드 한글명 + 3D 레드 버튼 + 1행 축소 약관)

---

## 2. 배포 및 검증 결과
- **공식 운영 도메인**: [https://video-to-gif.buylife.xyz](https://video-to-gif.buylife.xyz)
- **Vercel 프로덕션 보조 링크**: [https://video-to-d5kv04j2z-buylife.vercel.app](https://video-to-d5kv04j2z-buylife.vercel.app)
- **배포 ID**: `dpl_6NfgPdQE296T4hkytWnDzhrSF8GP`
- **통합 쇼케이스 URL**: [http://localhost:3800/showcase.html](http://localhost:3800/showcase.html)
- **독립 비교표 URL**: [http://localhost:3800/comparison.html](http://localhost:3800/comparison.html)
- **로컬 영구 자산 경로**: `D:\Antigravity\Design\54_cinematic_hollywood_neon_rec`

---

## 3. 핵심 수정 파일
1. `video-to-gif/app/globals.css`:
   - 헐리우드 레드/골드 변수, `.btn-3d-red`, `.btn-3d-shorts`, `.btn-3d-gold` 3D 엠보싱 버튼 클래스, `.rec-pulse`, `.glow-red`, 뷰파인더 브래킷 글로우 스타일 추가
2. `video-to-gif/app/login/page.tsx`:
   - 2026-11-01 5단계 수직 레이아웃 표준 규격으로 전면 개편
3. `video-to-gif/components/ConverterWorkspace.tsx`:
   - LIVE 🔴 REC 타임코드 배너, 4단계 파이프라인 인디케이터, 마켓별 원클릭 프리셋 칩, 3D 엠보싱 레드/골드 액션 버튼 탑재
4. `video-to-gif/app/page.tsx`:
   - 랜딩 히어로 CTA 버튼 및 앰비언트 글로우 헐리우드 레드 & 쇼츠 네온 포인트 정렬
5. `video-to-gif/package.json` & `video-to-gif/lib/version.ts`:
   - `1.27.0` / `v1.27` 버전 업
