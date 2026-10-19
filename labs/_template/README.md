# __LAB_NAME__ (AIMaster_dev Lab)

> AIMaster_dev 개발·운영 지침을 따르는 독립 실험 프로그램: [`docs/AIMASTER_DEV_LAB_GUIDELINES.md`](../../docs/AIMASTER_DEV_LAB_GUIDELINES.md)
> 메인 사이트·운영 DB와 연결되지 않는다. DB는 AIMaster_dev(ref `rjjtjakljjxsgjelqgek`)만 쓴다.

- 목적:
- Vercel 프로젝트: `dev-__LAB_NAME__` / 주소: https://dev-__LAB_NAME__.vercel.app (첫 배포 후 실제 주소로 고치기)
- 테이블 이름표: `__LAB_PREFIX___` / 버킷 이름표: `__LAB_NAME__-`

## 실행
1. `.env.example`을 `.env.local`로 복사해 dev 값 입력
2. `supabase/migrations/*.sql`을 dev에 적용
3. `npm install && npm run dev`

## 배포
1. 처음 한 번: `vercel link --yes --project dev-__LAB_NAME__ --scope buylife` (프로젝트 이름은 반드시 `dev-`로 시작)
2. `vercel env add`로 dev 환경변수 등록
3. `vercel deploy --prod --yes --scope buylife`

## 삭제
`node scripts/lab/delete-lab.mjs __LAB_NAME__` (목록 확인) → `--yes` (실제 삭제)

## 남은 일
-
