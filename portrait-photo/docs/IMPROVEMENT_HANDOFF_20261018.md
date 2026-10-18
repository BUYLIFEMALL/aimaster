# 인수인계 — 2026-10-18 디자인 리뉴얼 v1.22 (Claude Code 윈도우)

## 한 일
- 「크리에이티브 아틀리에 — 포토 스튜디오 그래파이트 변형」 적용(전 화면 같은 배경), 단계 칩, 결과 무대 초점 표시, 비주얼 매뉴얼, 메뉴 이름 표준화. 기능·프롬프트·API 무변경.
- 문서: `PLAN_20261018_DESIGN_RENEWAL.md`, `DESIGN_HANDOFF.md`, `IMPROVEMENTS.md`, `IMPROVEMENT_BACKLOG.md`, 이 문서, `README.md`(신규), `AGENTS.md`(버전·모델 설명 정정, 7대 항목).

## 상태
- 배포: Vercel 프로덕션 1회(2026-10-18, Ready), DB v1.22.
- 크롬 확인 결과: `DESIGN_HANDOFF.md` 7절.
- 플랜과 다른 점: 목적 아이콘은 코드에 이미 있던 값(✨ SNS · 🎨 자유)을 그대로 씀(플랜의 📱·✨ 대신, 데이터 무변경). `package.json` 버전은 기술용이라 그대로 둠.

## 다음 첫 단계
- `IMPROVEMENT_BACKLOG.md`에서 「결과 무대 배경 밝기 전환」(사진 판단 편의, 작음) 또는 「안 쓰는 CSS 정리」부터. 시작 전에 플랜을 주인님께 보이고 `docs/ACTIVE_WORK.md`에 줄을 넣는다.

## 검수 방법
- `npx tsc --noEmit`, `npm test`(20), `npm run build`. 화면은 메인 크롬, 시험 계정 `buylifemall@naver.com`(주인님 로그인), 데스크톱·390px.

## 추가 작업 — v1.23 규격 저장 추천 영역 (같은 날, Claude Code 윈도우)
- 한 일: [규격 저장]이 머리 측정값이 있으면 공식 머리 기준에 맞춘 추천 영역으로 자동 저장(`recommendSizedCrop`). 별도 [얼굴 확대 자르기] 버튼 삭제. 상세는 `AGENTS.md` v1.23 절, 플랜 `PLAN_20261018_SIZED_SAVE_RECOMMEND.md`.
- 배포: Vercel 프로덕션(같은 날 두 번째 — 주인님 "오늘 배포해" 지시), DB v1.23.
- 확인한 것: 단위 테스트 4경우, 크롬 버전 v1.23·매뉴얼 문구·스튜디오 오류 없음.
- 못 한 것: 생성 사진으로 [머리 비율 검사 또는 직접 지정] → [규격 저장] 파일 확인(사진 생성이 필요해 비용 — 주인님 확인 후 Flash 1회로 진행 예정).
- 다음 첫 단계: 위 실제 흐름 확인 → 일괄 ZIP도 같은 함수로 통일(백로그).

## 추가 작업 2 — v1.24 일괄 저장 통일·머리 검사 강조·프로필 세트 (같은 날, Claude Code 윈도우)
- 한 일: `AGENTS.md` v1.24 절 참고. 구현·로컬 검수(tsc 0·테스트 22/22·빌드)·커밋까지.
- **미배포**: 오늘 이미 두 번 배포해 **10-19에 배포**. 다음 첫 단계: `vercel deploy --prod --yes`(portrait-photo) → `vercel inspect`로 Ready 확인 → DB `programs.version`='v1.24' → 크롬에서 버전·머리 검사 강조 안내·[얼굴 위치 직접 지정 (무료)] 바로가기·[프로필 세트 저장] 버튼 확인 → 역량 지도 버전 → `docs/ACTIVE_WORK.md` 줄 삭제.
- 생성 사진으로 저장 파일 확인은 Flash 1회 필요(주인님 확인 후).

https://portrait-photo.buylife.xyz
