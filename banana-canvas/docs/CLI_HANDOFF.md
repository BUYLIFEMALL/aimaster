# banana-canvas CLI 인수인계 (2026-10-14, v1.01)

| 항목 | 값 |
|---|---|
| 이름 / slug | AI 바나나 캔버스 자동화 / `banana-canvas` |
| 운영 주소 | https://banana-canvas.buylife.xyz (Vercel `buylife/banana-canvas`, Git 미연동) |
| 배포 | 폴더에서 `vercel deploy --prod --yes --scope buylife` (간헐적 `Not authorized`는 재시도) |
| DB | `banana_canvas_results`(RLS owner-only), Storage 비공개 `banana-canvas-files`(0001), `programs` 등록·요금제 3종·VIP 등급 접근·썸네일(0002), 카테고리 이미지 |
| 환경변수 | 공용 Supabase 3종만(`scripts/add-banana-canvas-vercel-env.mjs`로 등록 완료) |
| 버전 | v1.01 (코드 `src/lib/version.ts`, DB `programs.version`) |

## 완료·검증 (2026-10-14)
- 순수 로직 7/7, 보이는 Chrome 하네스 17/17(생성·편집·합성·빠른 작업·부분 삭제 마스크·스토리/레시피 다중 결과·다운로드·계속 편집·기록), 빌드 통과.
- 실제 Gemini + 실제 Storage(운영자 본인 키): 생성·편집·업스케일(2688×1536)·배경 제거·부분 삭제·만화·증명사진·스토리 8컷(98초)·레시피 7단계(41초) 모두 정상, 결과 이미지 육안 확인.
- 운영 화면(로그인된 Chrome, 관리자): 업로드 → 배경 제거 → 투명 PNG(체커보드) 표시, DB(kind=bgremove, 결과 1건)·Storage(in 1, out 1) 대조 후 검수 데이터 전부 삭제.
- 카탈로그 썸네일(§13 실사: 디자이너가 모니터에서 한 인물 사진의 스타일 변환 4종을 보는 장면, 바나나 아이콘) 등록.

## 남은 일 (우선순위)
1. 일반 회원(`buylifemall@naver.com`)으로 실제 로그인한 화면 검수(주인님 로그인 필요).
2. 부분 삭제는 작은 영역에서 효과가 좋고, 큰 영역/글자 위에서는 모델이 거의 그대로 돌려주는 경우가 있다(실측) — 필요하면 프롬프트·마스크 팽창 보정 검토.
3. 배경 제거는 피사체와 비슷한 색의 배경·유리/연기 같은 반투명 피사체에서 가장자리가 거칠 수 있다. 개선안: 복잡한 경우 두 번째 키 색(청색) 재시도.
4. 후속(계획서 §3): 브러시 아웃페인팅 영역 지정, 결과 비교 슬라이더, 일괄 처리, 사용자 정의 스타일, 영어 UI.

## 알아둘 점
- 이미지 생성·편집은 본인 키의 결제(유료) 설정이 필요할 수 있다. 연속 스토리 8건·레시피 6~8건은 본인 키 사용량이 크다(화면 안내).
- 계획서의 "Storage 버킷 2개"는 구현에서 **1개(`banana-canvas-files`, `in/`·`out/` 폴더)**로 단순화했다. 스타일 수는 계획서 초안의 17종이 아니라 실제 원본의 **20종**이다.
- `vercel link` 직후 폴더 `.env.local`에는 Supabase 값이 없다. 로컬 스크립트는 루트 `.env.local`을 읽는다.
- 골격을 다른 프로그램에서 복사했다면 `src/lib/version.ts`의 이름·slug가 그대로 남아 화면 제목이 옛 이름으로 나온다(이번에 한 번 발생) — 복사 직후 `grep`으로 옛 이름을 확인한다.
