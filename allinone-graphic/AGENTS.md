# allinone-graphic — 에이전트 인수인계 문서

## 1. 개요
- **프로그램명**: AI 올인원 그래픽 자동화 (`allinone-graphic`)
- **라이브 도메인**: https://graphic.buylife.xyz
- **버전**: v1.05

## 2. 핵심 로직 & 파일 구조
- `src/app/(auth)/login/page.tsx`: 표준 2탭 세그먼트 로그인/회원가입 페이지 (크리에이티브 아틀리에 앰버 테마)
- `src/app/guide/page.tsx`: 정식 `/guide` 사용 매뉴얼 (크리에이티브 아틀리에 앰버 골드 비주얼 가이드북)
- `src/lib/templates.ts`: 19개 직군 123종 프리셋 템플릿 데이터베이스
- `src/lib/gemini.ts`: 회원 본인 Gemini 키 기반 렌더링, 인페인팅, AI 자동 입력 도우미
- `src/components/studio/AllInOneGraphicApp.tsx`: 4컬럼 스튜디오 작업 환경
- `src/components/layout/Sidebar.tsx`: 5대 그룹 아코디언 및 `📖 연동 & 사용 매뉴얼` 메뉴 탑재 표준 사이드바
- `docs/DESIGN_HANDOFF.md`: 디자인 완료 인수인계서 (크리에이티브 아틀리에 스타일)
- `docs/PLAN_20261017_LOGIN_RENEWAL.md`: 로그인 2탭 표준화 개발 플랜
- `docs/IMPROVEMENTS.md`: 프로그램 개선사항 관리 대장
- `docs/IMPROVEMENT_HANDOFF_20261017.md`: 개선사항 인수인계서

## 3. v1.05 (2026-10-17) — 로그인/회원가입 표준 2탭 레이아웃 개편 (allinone-graphic)
- **표준 레이아웃 적용**: `threads-comment-reply` 표준 규격에 맞춘 `[로그인]` / `[회원가입]` 2탭 세그먼트 전환 구조 구축.
- **크리에이티브 아틀리에 테마 일관성**: `#090d16` 딥 미드나잇 배경 + 24px 앰버 모눈 격자, 카드 다크 글래스모피즘, 앰버-오렌지(`#f59e0b` ➔ `#ea580c`) 그라디언트 탭 & 액션 버튼 일관 적용.
- **인풋 및 링크 최적화**: 이메일/비밀번호 좌측 아이콘(42px 패딩), 비밀번호 찾기 우측 링크, 회원가입 모드 전환 시 통합 계정 혜택 3종 및 무료 회원가입 CTA 버튼 배치.
- **Edge 실세션 검수 완료**: 데스크톱(1280x900) 로그인/회원가입 탭, 모바일(390x844) 반응형 캡처 3종 확인 완료.
- **버전 동기화**: `src/lib/version.ts`, `package.json`, Supabase 공유 DB `programs.version` 모두 `v1.05` 동기화 완료.

## 4. v1.04 (2026-10-16) — 크리에이티브 아틀리에 스타일 리뉴얼 & 가이드북 신설 (allinone-graphic)
- **적용 템플릿**: `✨ 크리에이티브 아틀리에 스타일` (Creative Atelier Style — 앰버 골드 `#f59e0b` & 딥 미드나잇 다크 `#0a0d14`)
- **신규 라우트**: 정식 `/guide` 비주얼 가이드북 전면 구축 (5단계 파이프라인 인포그래픽, Gemini 키 1분 발급 가이드, 19개 직군 123종 프리셋 맵 치트시트, 스마트 매직 에디터 인페인팅 팁, FAQ 4종)
- **사이드바 표준화**: 좌측 유틸리티 영역 최상단에 `📖 연동 & 사용 매뉴얼` (`/guide`) 메뉴 탑재, 계정 블록 12px 간격 밀착 정렬.
- **검수**: Microsoft Edge 전용 실세션 검수 완료 (데스크톱 1440px 및 모바일 380px 반응형).
- **버전 동기화**: `src/lib/version.ts`, `package.json`, Supabase 공유 DB `programs.version` 모두 `v1.04` 동기화 완료.

## B5 (2026-10-15) — 한국 시간 현재 월 기준 추가 (v1.02)

- 주 생성·분석 지침에 한국 시간 기준 현재 연·월을 반영하고, 계절·시기 표현은 현재 월에 맞추며 불필요한 계절·연도 표현을 덧붙이지 않도록 했습니다.

## 2026-10-16 DB 연동 변수 호환 — v1.03 (allinone-graphic)

작업 전 [최상위 데이터베이스 연동 지침](../docs/DATABASE_CONNECTION_POLICY.md)과 [전체 전환 인수인계](../docs/DATABASE_CONNECTION_HANDOFF.md)를 먼저 읽습니다. 공개 키는 새 PUBLISHABLE 이름 우선·기존 ANON 이름 호환, 서버 키는 새 SECRET 이름 우선·기존 SERVICE_ROLE 이름 호환입니다. 새 값 없음/공백일 때만 같은 종류의 기존 값을 사용하며, 인증 실패 후 다른 키로 재시도하지 않습니다. 기존 변수·실제 키·회원 권한·Cron은 유지합니다. 배포·회원 검수 결과는 전체 인수인계의 프로그램별 기록에서 확인합니다. 기존 변수 삭제와 실제 키 폐기는 별개이며 안정화 확인 전 삭제하지 않습니다.
