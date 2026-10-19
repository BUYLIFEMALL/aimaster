# 캐릭코드(MBTI) 측정기 (`mbti-character`) 개선 인수인계서 (2026-10-19)

## 1. 개요
- **버전**: `v1.20`
- **적용 디자인**: 크리에이티브 아틀리에 스타일 — 파스텔 크림 캐릭터 에디션
- **작업자**: Antigravity (Windows)
- **배포 주소**: `https://mbti-character.buylife.xyz`

---

## 2. 작업 완료 내역
1. **디자인 테마 적용**:
   - `app/globals.css`: 크리에이티브 아틀리에 파스텔 테마 토큰 및 컴포넌트 클래스(.atelier-hero, .stat-card-pastel, .pipeline-bar-pastel, .atelier-matrix-table, .rule-card-atelier, .faq-atelier) 탑재.
2. **헤더 & 내비게이션 개편**:
   - `app/layout.tsx`: `DESIGN.md` 9번 원칙에 따라 `📖 연동 & 사용 매뉴얼` (`/guide`) 메뉴 신설, `v1.20` 파스텔 배지, 56px 모바일 반응형 헤더 구축.
3. **메인 화면 리뉴얼**:
   - `app/page.tsx`: 아틀리에 히어로 배너, 3대 핵심 KPI 통계 카드, 4단계 파이프라인 가이드 바, API 키 연동 및 선호 화풍 카드 비주얼 강화.
4. **독립 비주얼 가이드북 신설**:
   - `app/guide/page.tsx`: 4단계 분석 & 생성 파이프라인 다이어그램, 16대 오리지널 캐릭터 매트릭스 도감 표, 7대 황금 수칙, FAQ 5종 아코디언 구현.
5. **버전 3중 동기화 (`v1.20`)**:
   - `package.json` (`1.20.0`), `lib/version.ts` (`v1.20`), Supabase DB `programs` (`v1.20`).
6. **로컬 빌드 및 Vercel 배포 완료**:
   - Next.js 로컬 빌드 성공.
   - Vercel 프로덕션 배포 완료 (`https://mbti-character.buylife.xyz`).
7. **Microsoft Edge 포그라운드 실세션 검수 완료**:
   - 7종 캡처 수집 및 10분간 화면 노출 유지 세션 실행.

---

## 3. 다음 작업자를 위한 인수인계 포인트
- **캐릭터 저작권 준수**: `lib/characters.ts`의 16개 캐릭터는 100% 자체 제작 오리지널 캐릭터이므로 실존 애니메이션/게임 캐릭터 명칭이나 설정을 임의로 추가하지 않도록 주의.
- **API 키 정책**: Gemini 키는 공용 `user_api_keys` 테이블(회원별 격리)을 통해 관리되므로 별도의 로컬 스토리지 키 관리로 변경하지 않음.
- **공유 카드(OG) 경로**: `/api/og` 경로는 SNS 크롤러 접근을 위해 로그인 체크에서 제외되어 있음(`middleware.ts`).
