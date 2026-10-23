# reverse-prompt CLI 인수인계 (2026-10-14, v1.01)

| 항목 | 값 |
|---|---|
| 이름 / slug | AI 리버스 프롬프트 자동화 / `reverse-prompt` |
| 운영 주소 | https://reverse-prompt.buylife.xyz (Vercel `buylife/reverse-prompt`, Git 미연동; 기본 별칭은 `reverse-prompt-mu.vercel.app` — `reverse-prompt.vercel.app`은 선점됨) |
| 배포 | 폴더에서 `vercel deploy --prod --yes --scope buylife` (간헐적 `Not authorized`는 재시도) |
| DB | `reverse_prompt_history`(RLS owner-only, 0001), Storage 비공개 `reverse-prompt-tmp`(0001), `programs` 등록·요금제 3종·VIP 등급 접근·썸네일(0002), `programs.version = v1.01` |
| 환경변수 | 공용 Supabase 3종만(`scripts/add-reverse-prompt-vercel-env.mjs`로 등록 완료, production·development) |
| 버전 | v1.01 (코드 `src/lib/version.ts`, DB `programs.version`) |

## 완료·검증 (2026-10-14)
- 순수 로직 15/15, 보이는 Chrome 하네스 16/16(형식·크기 거부, 키 미등록 안내, 분석·편집·재조합, JSON 저장, 재분석 시 재업로드 없음, 보관 만료 자동 재업로드, 오디오 대상 전환, 기록 필터·삭제), 빌드 통과.
- 실제 Gemini(운영자 본인 키): 이미지 12초·오디오 14초(Files API)·영상 18초(Files API) 모두 정상, 모델 `gemini-3.5-flash`.
- 실제 Storage: 서명 업로드(anon+토큰)·서버 다운로드·삭제 정상, 공개 읽기·anon 다운로드 차단 확인.
- 운영 화면(로그인된 Chrome, 관리자): `.buylife.xyz` SSO로 진입 → 이미지 업로드 → 분석 → 결과 표시 → DB 기록(thumb 포함)·임시 파일 존재 확인 → [삭제]로 임시 파일 0건 확인. 검수 기록은 지웠다.

## 남은 일 (우선순위)
1. 일반 회원(`buylifemall@naver.com`)으로 실제 로그인한 화면 검수(주인님 로그인 필요).
2. 큰 파일(영상 40~50MB) 실측: Files API 처리 시간·`maxDuration 300` 여유 확인.
3. 후속(계획서 §3): 영상 구간 지정 분석, 여러 파일 일괄 분석, 결과→이미지 생성 연결, 즐겨찾기 폴더, 영어 UI.

## 알아둘 점
- `vercel link` 직후 폴더 `.env.local`에는 Supabase 값이 없다. 로컬 스크립트는 루트 `.env.local`을 읽는다.
- Supabase MCP `execute_sql`은 여러 문장 묶음을 "Invalid or expired requestState"로 거부할 수 있다(문장별 실행은 정상). DELETE 같은 파괴적 문장도 같은 이유로 거부될 수 있다.
- 임시 파일은 분석 후에도 1시간 남는다(같은 파일 재분석용). 사용자가 [삭제]/파일 교체 시 즉시 삭제, 그 외에는 본인의 다음 업로드 때 1시간 지난 것을 정리한다.
