# thumbnail-master CLI 인수인계 (2026-10-14, v1.01)

| 항목 | 값 |
|---|---|
| 이름 / slug | AI 썸네일 마스터 자동화 / `thumbnail-master` |
| 운영 주소 | https://thumbnail-master.buylife.xyz (Vercel `buylife/thumbnail-master`, Git 미연동) |
| 배포 | 폴더에서 `vercel deploy --prod --yes --scope buylife` (간헐적 `Not authorized`는 재시도) |
| DB | `thumbnail_master_projects`(RLS owner-only), Storage 비공개 `thumbnail-master-images`(0001), `programs` 등록·요금제 3종·VIP 등급 접근·썸네일(0002), 카테고리 유튜브 |
| 환경변수 | 공용 Supabase 3종만(`scripts/add-thumbnail-master-vercel-env.mjs`로 등록 완료) |
| 버전 | v1.01 (코드 `src/lib/version.ts`, DB `programs.version`) |

## 완료·검증 (2026-10-14)
- 순수 로직 11/11, 보이는 Chrome 하네스 14/14(필수 검증, 키 안내, 타겟 전달, 문구 길이 경고, A/B 병렬 생성, 수정→v2, v1 되돌리기, 다운로드 파일명, 문구 없음 옵션, 자동 저장, 프로젝트 목록·삭제), 빌드 통과.
- 실제 Gemini(운영자 본인 키): 전략 9초, 1K 이미지 18초(한글 문구 정확, 채널명·단색 테두리 반영), 수정 요청 18초(문구 색 변경 반영). JPEG 변환으로 1.7MB 이상의 원본이 약 180~570KB로 줄어든다.
- 운영 화면(로그인된 Chrome, 관리자): 새 프로젝트 → 주제 입력 → 전략 생성 → 2K 2종 생성(약 40초) → 결과 표시, DB(stage=image, 버전 1/1, 파일 2개) 대조 후 검수 데이터는 삭제.
- 카탈로그 썸네일(§13 실사: 크리에이터가 모니터의 A/B 썸네일 비교 화면을 보는 장면) 등록, 이미지 안 글자 없음.

## 남은 일 (우선순위)
1. 일반 회원(`buylifemall@naver.com`)으로 실제 로그인한 화면 검수(주인님 로그인 필요).
2. 수정 요청 반복·버전 5개 초과 시 오래된 파일 삭제를 운영에서 1회 확인(코드·모의는 확인됨).
3. 후속(계획서 §3): A/B 비교 보드, 참고 이미지 업로드(스타일 레퍼런스), 일괄 생성, 채널 로고 합성, 영어 UI.

## 알아둘 점
- 이미지 생성은 본인 키의 결제(유료) 설정이 필요할 수 있다(매뉴얼·설정 화면에 안내). 2종 생성 = 이미지 2건.
- `vercel link` 직후 폴더 `.env.local`에는 Supabase 값이 없다. 로컬 스크립트는 루트 `.env.local`을 읽는다.
- Supabase MCP `execute_sql`은 여러 문장 묶음을 거부할 수 있다(문장별 실행은 정상, DELETE도 거부될 수 있어 검수 데이터는 서비스 롤 스크립트로 정리).
- 프로젝트 이미지가 많아지면 저장소가 늘어난다: 프로젝트 30개 × 옵션별 5버전 × 약 0.2~0.6MB가 회원당 최대치.
