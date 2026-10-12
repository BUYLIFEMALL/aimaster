# 감성 글귀 이미지 v1.01

회원 본인 API 키로 글귀 5개와 배경을 만들고 한글 문구를 합성해 PNG/JPEG로 저장하는 도구입니다. 직접 입력 문구와 본인 Pixabay/Pexels 사진도 사용할 수 있습니다.

2026-10-12 현재 **구현·로컬 검수 완료 / 운영 연결 승인 대기**입니다. 프로덕션 배포와 정상 회원의 실제 생성·다운로드는 아직 검수하지 않았습니다. 참고 사이트 `emotion-writer.vercel.app`를 소유하거나 수정한 것은 아닙니다. 새 `buylife/emotion-writer` 프로젝트의 목표 주소는 `https://emotion-writer.buylife.xyz`입니다.

- [인수인계 및 남은 절차](docs/IMPLEMENTATION_HANDOFF_2026-10-12.md)
- [참고 분석](docs/REFERENCE_ANALYSIS.md) · [구현 전 계획](../docs/EMOTION_WRITER_IMPLEMENTATION_PLAN_2026-10-12.md)
- [운영 변경 승인안](docs/RELEASE_APPROVAL.md) · [프로젝트 지침](AGENTS.md)
- [데스크톱 초기 화면](docs/evidence/initial-desktop.png) · [모바일 초기 화면](docs/evidence/initial-mobile.png) — 정적 검토 자료이며 실제 API 실행 증거가 아닙니다.

## 개발

이 폴더에서 `npm ci`, `npm test`, `npm run lint`, `npm run build`, `npm run dev`를 실행합니다. Next.js 16.4.0 / React 19 / TypeScript / Tailwind 4입니다. 환경변수 이름은 `.env.example`에 있으며 비밀 값은 Git에 넣지 않습니다.

로그인·사용 권한은 AIMaster 공용 Supabase를 사용합니다. 모든 작업 API는 회원과 프로그램 사용 권한을 확인하고 해당 회원 키만 조회합니다. 회원별 브라우저 초안에는 문구·기본 선택값만 저장합니다. 사진·디자인은 페이지를 새로 열면 초기화됩니다.

## 준비된 운영 SQL

`supabase/migrations/20261012040157_emotion_writer_personal_photo_keys.sql`은 본인 사진 키 두 제공처를 기존 CHECK에 추가하는 **스키마 변경이며 승인 전 적용 금지**입니다. `20261012040558_emotion_writer_catalog.sql`은 배포 확인 후 실행할 프로그램/표준 3개 요금제 등록 DML입니다. 현재 둘 다 미적용입니다. 새 프로젝트 DB 환경변수 설정도 승인 전 실행하지 않습니다.
