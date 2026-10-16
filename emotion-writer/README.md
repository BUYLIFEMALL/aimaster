# 감성 글귀 이미지 v1.01

후속: 프로그램 목록·기본 요금제·썸네일 등록 완료. [등록 기록](docs/catalog/REGISTRATION.md). 목록에는 운영 준비 상태를 표시하며 앱 배포는 아직입니다.

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


## 2026-10-16 DB 연동 변수 호환 — v1.09 (emotion-writer)

작업 전 [최상위 데이터베이스 연동 지침](../docs/DATABASE_CONNECTION_POLICY.md)과 [전체 전환 인수인계](../docs/DATABASE_CONNECTION_HANDOFF.md)를 먼저 읽습니다. 공개 키는 새 PUBLISHABLE 이름 우선·기존 ANON 이름 호환, 서버 키는 새 SECRET 이름 우선·기존 SERVICE_ROLE 이름 호환입니다. 새 값 없음/공백일 때만 같은 종류의 기존 값을 사용하며, 인증 실패 후 다른 키로 재시도하지 않습니다. 기존 변수·실제 키·회원 권한·Cron은 유지합니다. 배포·회원 검수 결과는 전체 인수인계의 프로그램별 기록에서 확인합니다. 기존 변수 삭제와 실제 키 폐기는 별개이며 안정화 확인 전 삭제하지 않습니다.
