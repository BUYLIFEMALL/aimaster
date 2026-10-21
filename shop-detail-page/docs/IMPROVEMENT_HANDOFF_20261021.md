# shop-detail-page 인수인계 — 2026-10-21 (이커머스 병합 E0 · v1.15)

> 작성: Claude Code(맥미니, 보조 계정). 대상 ① 운영 AIMaster, DB ref `esgxyikcnnvmlhygjkth`. 상세 변경: `AGENTS.md` v1.15. 병합 전체 계획: `../docs/analysis-ecommerce-consolidation-20261021/REPORT.md`.

## 상태
- 코드 완료·tsc 0·커밋(맥미니). **배포·마이그레이션·환경변수 확인·화면 검수는 윈도우 CLI 차례.**
- 다음 묶음 E1(12단 → 15p)은 E0 배포·검수가 끝난 뒤 맥미니가 이어서 구현.

## 윈도우 CLI 다음 첫 단계 (이 순서 그대로 — 순서가 바뀌면 이미지가 잠깐 깨짐)
1. `cd shop-detail-page && npm run build` (로컬 확인).
2. Vercel 환경변수 `CRON_SECRET`이 `shop-detail-page` 프로젝트 Production에 있는지 확인(`vercel env ls`). 없으면 주인님께 알리고 추가(값은 다른 프로그램과 같은 방식). 없어도 정리 작업만 401로 멈추고 앱은 동작함.
3. `vercel deploy --prod --yes` → Ready 확인(`vercel inspect`). **새 코드는 버킷이 공개여도 정상 동작**하므로 배포를 먼저 한다.
4. 배포 Ready 뒤 마이그레이션 `supabase/migrations/20261021_private_bucket_v1_15.sql` 적용(MCP `apply_migration` 또는 SQL). 확인: `select public from storage.buckets where id='shop-detail-images';` → false.
5. DB 버전: `update programs set version='v1.15', updated_at=now() where slug='shop-detail-page';`
6. 크롬 검수(시험 계정 `buylifemall@naver.com`, 비용 0 — 생성 버튼 누르지 않음):
   - 상품 목록 썸네일, 상품 상세의 섹션 이미지·버전 썸네일·확대 보기가 보이는지(`/api/image` → 서명 주소).
   - 「긴 이미지 내려받기」(AI 호출 없음)로 PNG가 받아지는지.
   - 목록 상단 30일·유예 안내 문구, 왼쪽 위 v1.15.
   - 옛 공개 주소(`…/object/public/shop-detail-images/…`)를 로그인 없이 열면 거부되는지.
7. 정리 작업 수동 호출 1회: `curl -H "Authorization: Bearer $CRON_SECRET" https://shop-detail-page.buylife.xyz/api/cron/cleanup-generated` → 2026-11-21 전에는 `{"skipped":"grace",…}`가 정상.
8. 결과를 이 문서 아래 「배포 결과」와 루트 `docs/HANDOFF.md`에 기록.

## 되돌리기
- 이미지가 안 보이는 문제가 생기면 마이그레이션 파일 맨 아래의 되돌리기 SQL로 버킷을 공개로 돌리면 즉시 복구(코드는 공개 버킷에서도 동작).

## 남은 일 / 주의
- D-48-01 중 「같은 섹션 동시 생성 시 이력 덮어쓰기」는 남음(읽기 직후 upsert라 창이 짧음). 필요하면 DB 함수로 원자적 추가(스키마 변경 승인 필요).
- 2026-11-21 이후 첫 실행에서 9월 자료(상품 4·파일 약 103)가 지워진다 — 정상.

---

# E1 · v1.16 (12단 → 15p) — 윈도우 CLI 다음 첫 단계

> E0(v1.15) 배포·검수를 끝낸 뒤 진행. 순서 중요: **마이그레이션이 배포보다 먼저**(v1.16 코드가 `layout_preset` 칸을 읽음 — 없으면 상품 화면 섹션이 비어 보임). 마이그레이션은 기본값이 있는 칸 추가 + 행 추가라 v1.15 코드에는 영향 없음.

1. 마이그레이션 `supabase/migrations/20261021_layout_presets_v1_16.sql` 적용 → 확인: `select layout_preset, count(*) from shop_prompt_templates where user_id is null group by 1;` → shop15 15 · coupang12 12 · smartstore9 9.
2. `cd shop-detail-page && npm run build && vercel deploy --prod --yes` → Ready.
3. `cd detail-page-12p && npm run build && vercel deploy --prod --yes` → Ready(이동 안내 화면 v1.10).
4. SQL `docs/analysis-ecommerce-consolidation-20261021/E1_grant_and_hide_12p.sql` 0→1→2→3→4 순서(권한 연장 4명, 12단 `is_active=false`, 두 앱 DB 버전).
5. 크롬 검수(시험 계정, **AI 생성 버튼 누르지 않음 — 비용 0**):
   - 15p 새 상품 화면: 6번 규격 3개 카드·「📄 사양서 불러오기」 버튼, TXT 파일 선택 시 원본 정보 칸에 내용이 들어가는지.
   - 15p 목록: 「📦 12단 자료 가져오기」 → `/products/import` 화면.
   - 12단 `https://detail-12p.buylife.xyz`: 이동 안내 화면·백업 버튼(자료 없으면 안내 문구)·「상세페이지 자동화 열기」 링크.
   - 12단 생성 API가 410: `curl -s -X POST https://detail-12p.buylife.xyz/api/generate-detail` (로그인 없이도 410).
   - 휴대폰 폭(390px)에서 규격 카드가 1열로.
6. 실제 생성 확인이 필요하면(쿠팡 12단 섹션 1장) **비용을 주인님께 먼저 알린 뒤** 가장 저렴한 이미지 모델로 1장만.

---

# E2 · v1.17 (자동생성기 v1 → 15p HTML 내보내기) — 윈도우 CLI 다음 첫 단계

> E1 배포·검수 뒤 진행. DB 스키마 변경 없음.

1. `cd shop-detail-page && npm run build && vercel deploy --prod --yes` → Ready.
2. `cd auto-detail-page && npm run build && vercel deploy --prod --yes` → Ready(이동 안내 v1.21). 프로덕션 별칭 `shop-page-seven.vercel.app`은 건드리지 않음(auto-detail-page/AGENTS.md §3).
3. SQL `docs/analysis-ecommerce-consolidation-20261021/E2_hide_auto_detail_and_catalog.sql`(자동생성기 숨김·버전·15p 이름 「AI 상세페이지 자동화」·설명). 공개 상세 `https://www.buylife.xyz/programs/shop-detail-page` 단락 모양 확인.
4. 크롬 검수(시험 계정): 15p 상품 화면 아래 HTML 내보내기 패널(템플릿 3개 카드·안내 문구), 자동생성기 첫 화면 이동 안내, `curl -s -X POST https://auto-detail-page.buylife.xyz/api/generate` → 410.
5. **실제 HTML 생성 1회는 비용이 듭니다(Gemini 텍스트 1회, 회원 본인 키 — 수 원~수십 원 수준).** 주인님께 먼저 알리고 승인 시, 섹션 이미지가 있는 시험 상품에서 1회만 → 미리보기·파일 내려받기·이미지가 들어갔는지 확인.
6. 마무리: 역량 지도·보고서 §6은 맥미니가 갱신함. 결과를 루트 `docs/HANDOFF.md`와 이 문서 「배포 결과」에 기록, `DESIGN.md` 해당 프로그램 상태 확인.

## 배포 결과
### 2026-10-22 Claude Code(윈도우, 메인 계정) — E0·E1·E2 한 번에 적용
- **순서(두 조건을 모두 지키며 15p 빌드를 1회로 줄임)**: 코드가 이미 HEAD(v1.17)에 E0~E2가 모두 들어 있어, ① E1 마이그레이션 `20261021_layout_presets_v1_16.sql`(칸·행 추가, 옛 코드 영향 없음) → ② shop-detail-page v1.17 배포 → ③ E0 마이그레이션 `20261021_private_bucket_v1_15.sql`(배포 뒤) → ④ detail-page-12p v1.10·auto-detail-page v1.21 배포 → ⑤ `E1_grant_and_hide_12p.sql` → ⑥ `E2_hide_auto_detail_and_catalog.sql`. DB 작업은 모두 운영 ① ref `esgxyikcnnvmlhygjkth`, 주인님 크롬 SQL Editor(파일을 클립보드로 붙여 넣고 글자 수 대조 후 실행).
- 배포(모두 Ready): `shop-detail-page-kh9whxyb3`, `detail-page-12p-d94rdq3jr`, `auto-detail-page-3ms78mvlc`. 로컬 `npm run build` 3곳 통과 후 배포. 별칭 `shop-page-seven.vercel.app`은 건드리지 않음.
- 환경변수: shop-detail-page Production에 `CRON_SECRET`이 없어 루트 `.env.local`과 같은 값으로 추가(값 미출력).
- DB 확인: 규격별 기본 템플릿 shop15 15 · coupang12 12 · smartstore9 9 / 버킷 `shop-detail-images` public=false / 권한 연장 대상 4명 → 0명(15p 만료 2026-10-16 → 12단 만료일) / 12단 `is_active=false` v1.10 / 자동생성기 `is_active=false` v1.21 / 15p 「AI 상세페이지 자동화」 v1.17 활성·설명 교체(원문 백업 `backup-programs-before-merge-e.json`).
- 운영 확인: 12단 `POST /api/generate-detail` 410, 자동생성기 `POST /api/generate` 410, 정리 작업 비밀값 없이 401·비밀값으로 `{"skipped":"grace","graceEnd":"2026-11-21T00:00:00+09:00","retentionDays":30}`, DB에 저장된 옛 공개 이미지 주소 400(차단).
- 크롬(메인 크롬, **관리자 계정으로 로그인돼 있어 관리자 화면으로 검수** — 시험 계정 전환은 주인님 몫, 시험 계정은 15p 상품 0개): 목록 v1.17·「12단 자료 가져오기」·30일 안내 / 관리자 8월 상품 상세에서 이미지가 `/api/image` 서명 경로로 표시(깨진 이미지 0) / HTML 내보내기 패널 3개 카드 / 새 상품 화면 규격 3개·「사양서 불러오기」 / 12단·자동생성기 이동 안내 화면 / 공개 상세 `https://www.buylife.xyz/programs/shop-detail-page` 새 이름·5단락·카드.
- 비용: Vercel 빌드 3회(이 묶음) — 생성 버튼은 누르지 않아 AI 호출 0회.
- 못 한 것: 시험 계정 로그인 상태 화면, 「긴 이미지 내려받기」 실제 내려받기, 휴대폰 폭 규격 카드 1열, 실제 섹션 생성·HTML 생성(비용 — 주인님 승인 시 1회).
- 다음: 2026-11-21 이후 첫 정리 작업 실행(9월 자료 삭제 — 정상) Vercel 기록 확인.

### 2026-10-22 Claude Code(맥미니, 보조 계정) — 실제 생성 시험 (주인님 승인)
- 시험 계정 `buylifemall@naver.com`, 맥미니 크롬, 회원 본인 Gemini 키. 시험 상품 「시험용 스테인리스 텀블러 500ml」(쿠팡 12단, `82deeddc-58c8-4b14-9d59-66728bb876af`, 브라우저 캔버스로 그린 텀블러 그림을 대표 사진으로 사용 — 30일 정리 대상).
- 결과 — **모두 정상**:
  1. 상품 분석(`gemini-3.5-flash` 1회): 입력칸 채움 + 「AI 추정」 안내 표시, 규격 3종 카드, 저장 버튼 문구가 규격 따라 「쿠팡 12단 상세페이지 만들기」로 바뀜, 저장 후 12섹션(프로모션 배너~구성품·FAQ) 표시.
  2. 섹션 이미지 1장(#01 프로모션 배너, Nanobanana2 가성비, 1792×2400): 한글 상품명 정확, 그린 텀블러 모양 유지, `/api/image` 비공개 경로로 표시.
  3. HTML 내보내기(쿠팡 스타일, `gemini-3.5-flash` 1회, 약 150KB): `<script>` 0·`on*` 속성 0·남은 `[IMAGE_N]` 0·860px JPEG 1장 포함, 후기·만족도·판매량·인증 문구 0, 미리보기 iframe `sandbox=""`.
  4. 📱 모바일 미리보기: 휴대폰 틀 안 세로 스크롤 정상.
- 사용량: Gemini 텍스트 2회(분석·HTML) + 이미지 1장(화면 기준 장당 $0.101) — 합계 약 150원. 「12개 섹션 전체 생성」은 처음 생성할 때 유일한 버튼이라, 브라우저 `fetch`에 생성 요청 1건만 통과시키는 임시 차단을 걸고 눌러 #02 이후 요청은 서버로 나가지 않게 함(차단 1건 기록, 마무리 상태 변경은 정상).
- 내려받기(HTML 파일·긴 PNG)는 파일 저장이라 누르지 않음.
- 발견한 개선점은 `IMPROVEMENTS.md` §3(2026-10-22).
