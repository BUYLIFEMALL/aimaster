# AI 인물사진 자동화 (`portrait-photo`) — 인수인계 문서 (2026-10-14, v1.04)

다른 CLI(Codex·Gemini·다른 Claude 세션)가 이 대화 없이 바로 이어받을 수 있도록 정리한 한 장 요약입니다. 상세는 [`portrait-photo/AGENTS.md`](../portrait-photo/AGENTS.md), [`portrait-photo/docs/CLI_HANDOFF.md`](../portrait-photo/docs/CLI_HANDOFF.md), 원본 분석·계획은 [`portrait-photo/docs/DEVELOPMENT_PLAN.md`](../portrait-photo/docs/DEVELOPMENT_PLAN.md).

## 1. 개요
- 이름/slug: **AI 인물사진 자동화** / `portrait-photo` (이름은 주인님이 2026-10-14 확정). 주소: https://portrait-photo.buylife.xyz.
- 참고 원본: AI Studio "Cinematic Portrait Studio 2". 코드·문구·브랜드는 복제하지 않고 기능 구조만 참고, 원본의 버그(존재하지 않는 옵션 id)와 과장 문구("100% 통과")는 바로잡았다.
- 흐름: 사진 1장 + 촬영 목적 5종 프리셋 + 옵션 조합 → **회원 본인 Gemini 키**로 생성 → 브라우저 후처리(순백 정리·413×531·톤) → 저장. 사진·결과는 서버에 저장하지 않고 브라우저에만 최근 20장.

## 2. 등록 현황 (공용 Supabase `esgxyikcnnvmlhygjkth`)
| 항목 | 값 |
|---|---|
| `programs` | slug `portrait-photo`, 카테고리 이미지(`b5cec438-…`), 최소 등급 일반, 활성, 버전 **v1.01**, 배지 `new`(FREE 아님) |
| 요금제 | 1/2/3개월 = 10,000 / 20,000 / 30,000원 |
| 등급 접근 | VIP |
| 썸네일 | 실사 16:9 (§13 템플릿, `scripts/generate-program-thumbnail.mjs`) |
| DB 테이블 | `portrait_photo_saved`(v1.03, 선택 기능, RLS owner-only) + 비공개 버킷 `portrait-photo-files`. 키는 공용 `user_api_keys` provider `gemini` |
| 마이그레이션 | `portrait-photo/supabase/migrations/0001_register_program.sql` |

## 3. 배포
- Vercel 프로젝트 `portrait-photo`(팀 buylife), CLI 업로드: `cd portrait-photo && vercel deploy --prod --yes --scope buylife`.
- 환경변수 4종: `scripts/add-portrait-photo-vercel-env.mjs`. 도메인은 `vercel domains add portrait-photo.buylife.xyz portrait-photo --scope buylife`(와일드카드 DNS, 인증서 발급에 수 분).

## 4. 버전 이력
| 버전 | 내용 | 커밋 |
|---|---|---|
| 계획 | 원본 전수 분석·기존 프로그램 비교·개발 플랜 | `cca7f622`, `d0bf879f`(이름 확정) |
| v1.01 | 신규 구현·등록·배포 | `86a292b2` |
| v1.02 | 후보 2~4장 동시 생성, 규격 프리셋 4종, 원본 비교 슬라이더 | `264679df` |
| v1.03 | 서버 보관함(선택), 일괄 처리, 규격 5종(중국 비자·주민등록증 정정) | `a36b1ccc` |
| v1.04 | ZIP 일괄 저장, 규격 7종(캐나다·영국, 공식 확인·주의 문구), 보관 기간 설정 | git log `portrait-photo` |

## 5. 반드시 지킬 것
- 키는 회원 본인 것만, 폴백 금지. 원본 얼굴 사진은 서버 저장·로그 금지(생성 결과는 회원이 보관함을 켠 경우만 저장), 생성 전 "본인/동의받은 사진" 확인 체크.
- 공식 서류 통과 보장 문구 금지, "제출 기관 규정 확인" 안내 유지.
- 프롬프트는 옵션 **id만** 받아 서버가 조립(임의 문장 주입 불가), 영어 고정 템플릿, 첫 규칙은 얼굴 동일성.
- 새 옵션·프리셋은 `tests/portrait.test.mjs`(id 일관성)와 함께 수정.

## 6. 검수 방법
- `cd portrait-photo && npm test`(6건) → `npx tsc --noEmit` → `npm run build`.
- 실제 생성(비용 발생): `NODE_OPTIONS=--conditions=react-server node --import tsx test-artifacts/real-call.mts [flash|pro] [프리셋]`.
- 운영 확인은 로그인 Chrome에서 사진 올리기 → 생성 → 저장 → 기록 삭제까지, **테스트 기록은 [전체 삭제]로 정리**.

## 7. 남은 일
- 일반 회원(`buylifemall@naver.com`) 로그인 흐름 재확인(주인님 로그인 후).
- v1.02 후보: 후보 2~4장 동시 생성, 규격 프리셋 확장(여권·비자), 전/후 비교 슬라이더, 서버 보관(선택).
- FREE 배지 여부는 주인님 결정 사항(현재 FREE 아님).
