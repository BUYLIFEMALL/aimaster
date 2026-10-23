# AI 블로그 콘텐츠 제작 자동화 (blog-content-maker) — 디자인 리뉴얼 개발 플랜

- **작성일**: 2026-10-18
- **작성자**: Antigravity CLI (agy)
- **대상 프로그램**: `blog-content-maker` (slug: `blog-content-maker`)
- **공식 서비스 URL**: [https://blog-content-maker.buylife.xyz](https://blog-content-maker.buylife.xyz)
- **현재 버전**: `v1.09` ➔ **목표 버전**: `v1.10` (package: `1.10.0`)
- **추천 디자인 템플릿**: **플로우 위저드 스타일 — 단계별 블로그 콘텐츠 에디션 (Flow Wizard Style — Step-by-Step Blog Content Edition)**

---

## 1. 리뉴얼 목적 및 비주얼 컨셉
- 긴 호흡의 블로그 원고 작성 및 퇴고 과정에서 시각적 피로도를 최소화하고 집중도를 극대화하는 **소프트 화이트 라이트 테마** 정돈.
- 1단계(글감/제목 찾기) ➔ 2단계(원고 만들기) ➔ 3단계(글 점검/다듬기) ➔ 4단계(이미지/장면 준비) ➔ 5단계(네이버로 옮기기)로 이어지는 **단계별 플로우 위저드 파이프라인**을 보다 명확하고 직관적인 비주얼로 표현.
- 텍스트 줄글 형태였던 가이드 화면을 비주얼 프로세스 다이어그램, 네이버 블로그 스마트에디터 ONE 연동 팁, FAQ 아코디언이 포함된 **비주얼 에디토리얼 가이드북 (`/guide`)**으로 전면 고도화 (`DESIGN.md` 9번·10번 원칙 준수).

---

## 2. 디자인 토큰 사양
```css
:root {
  --ink: #0f172a;              /* 고시인성 슬레이트 다크 텍스트 */
  --muted: #64748b;            /* 보조 설명 텍스트 */
  --line: #e2e8f0;             /* 은은한 슬레이트 테두리 */
  --brand: #2563eb;            /* 신뢰감 있는 인디고 블루 포인트 */
  --brand-alt: #10b981;        /* 완료/발행 에메랄드 그린 */
  --soft: #eff6ff;             /* 부드러운 블루 틴트 배경 */
  --bg: #f8fafc;               /* 소프트 슬레이트 화이트 메인 배경 */
  --card: #ffffff;             /* 퓨어 화이트 서피스 */
}
```

---

## 3. 세부 작업 단계
1. **버전 및 인프라 동기화**:
   - `blog-content-maker/package.json`: `"1.10.0"`
   - `blog-content-maker/src/lib/version.ts`: `"v1.10"`
   - `blog-content-maker/extension/manifest.json`: `"version": "1.10.0"`, `"version_name": "v1.10"`
   - Supabase DB `programs` (`slug: blog-content-maker`): `version: 'v1.10'`
2. **사이드바 메뉴명 표준화**:
   - `src/components/navigation.ts`: `guide` 메뉴명을 **`📖 연동 & 사용 매뉴얼`**로 표준화
3. **비주얼 에디토리얼 가이드북 (`src/components/SettingsView.tsx` `GuideView`) 고도화**:
   - 플로우 위저드 히어로 배너 및 `v1.10 단계별 블로그 콘텐츠 에디션` 배지 신설
   - 5-Step 블로그 자동화 파이프라인 비주얼 카드 및 스타일 칩 4종 수록
   - 네이버 블로그 스마트에디터 ONE 확장 연동 단계별 가이드
   - 자주 묻는 질문(FAQ 5종 아코디언 컴포넌트) 완비
4. **로컬 무결성 검증**:
   - `npm test`: 단위 테스트 실행
   - `npx tsc --noEmit`: TypeScript 컴파일 검사
   - `npm run build`: prebuild(확장 zip 생성) 및 Next.js Turbopack 빌드 성공
5. **Vercel 프로덕션 배포**:
   - `npx vercel --prod --yes --scope buylife`
6. **Microsoft Edge 최전면 포그라운드 실세션 검수 (headless: false, 10분 화면 유지)**:
   - 일반 회원 테스트 계정(`buylifemall@naver.com`) 세션으로 6종 스크린샷 캡처 및 화면 최전면 유지
7. **인수인계 6종 작성 및 Git 커밋/푸시**:
   - `AGENTS.md`(7대 규격), `README.md`, `DESIGN_HANDOFF.md`, `IMPROVEMENTS.md`, `IMPROVEMENT_BACKLOG.md`
   - 루트 마스터 현황판(`DESIGN.md`, `docs/ACTIVE_WORK.md`, `docs/HANDOFF.md`) 동기화
