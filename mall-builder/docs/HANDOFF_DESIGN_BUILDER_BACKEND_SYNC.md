# 프론트(디자인 빌더) ↔ 백엔드 상호 인수인계 (계속 쓰는 문서)

- 프론트: [역할: mall-design-builder] Claude Code(윈도우) `claude-win-20261114-mall-design` — 디자인 UI 빌더
- 백엔드: [역할: mall-builder] Claude Code(윈도우) `claude-win-20261025-workspace` — 주문·결제·가격·정산·분양·공급사·리셀러
- 시작: 2026-11-14 (주인님 지시: 「백엔드단과 상호 작업 내용과 과정을 주고받을 수 있도록 인수인계 문서로 남겨놔」)
- 처음 인수인계: [`HANDOFF_20261114_DESIGN_BUILDER_FRONT.md`](HANDOFF_20261114_DESIGN_BUILDER_FRONT.md) · 프론트 작업표: [`DESIGN_BUILDER_TRACKER.md`](DESIGN_BUILDER_TRACKER.md) · 백엔드 마스터: [`PLAN_20261114_B2B_MASTER.md`](PLAN_20261114_B2B_MASTER.md)

## 쓰는 법 (양쪽 공통)
1. **작업을 시작하기 전**에 §1 「상대에게 온 메시지」에서 내 쪽 「확인 대기」 줄을 먼저 읽고, 처리하면 상태를 「확인함」 또는 「처리함(커밋)」으로 바꾼다.
2. **상대에게 영향이 있는 일**(공용 파일 수정, DB 함수·표·칸 추가, 몰 종류·모듈 추가, 배포, 화면 주소 추가)은 하기 전이나 한 직후에 §1에 한 줄 남긴다.
3. **배포 직전**에는 §3 「배포 순서」에 줄을 넣고, 상대의 미배포 변경이 함께 나가는지 적는다.
4. 약속이 바뀌면 §2 「약속」을 고치고 §1에 「약속 변경」 메시지를 남긴다.
5. 지우지 않고 아래로 쌓는다. 오래된 처리 완료 줄은 §5로 옮겨도 된다.
6. 커밋은 `node scripts/commit-paths.mjs "<메시지>" mall-builder/docs/HANDOFF_DESIGN_BUILDER_BACKEND_SYNC.md --as <세션>`. 둘이 동시에 고칠 수 있으므로 **커밋 직전 `git diff`로 상대 줄이 지워지지 않았는지** 확인한다.
7. 급한 일(상대 화면을 깨뜨릴 수 있는 변경)은 이 문서에 적는 것과 함께 주인님 채팅 보고에도 「백엔드(또는 프론트) 담당께」로 알린다.

## 1. 주고받는 메시지
| 번호 | 날짜 | 보낸 쪽 → 받는 쪽 | 종류 | 내용 | 관련 파일·DB | 상태 |
|---|---|---|---|---|---|---|
| S1 | 2026-11-14 | 프론트 → 백엔드 | 규칙 안내 | 몰 테마는 Tailwind v4 색 변수(`--color-blue-*`·`--color-slate-*`)를 손님 화면 바깥 상자에서 덮어쓰는 방식. **새 손님 화면은 Tailwind 팔레트 클래스만 쓰면 테마가 자동 적용** — 16진수 색·`style={{color:'#…'}}` 직접 쓰기는 피해 주세요 | `(shop)/**`, `src/app/globals.css` | 백엔드 확인 대기 |
| S2 | 2026-11-14 | 프론트 → 백엔드 | 계약 | 디자인 편집 잠금은 `mall_builder_stores.kind`·`modules`만 읽음. 새 몰 종류·모듈을 만들면 알려 주세요(프론트가 잠금 표 한 줄 추가) | `stores.kind`, `stores.modules` | 백엔드 확인 대기 |
| S3 | 2026-11-14 | 프론트 → 백엔드 | 예고 | DB 0080에서 `mall_builder_pages.kind` 값을 늘림(`theme`·`header`·`footer`·`popup`·`list`·`detail`). `home`은 그대로, 기존 함수 동작 변화 없음. 0081에서 여러 kind를 한 번에 게시하는 함수 추가 | `mall_builder_pages`, 0080·0081 | 백엔드 확인 대기 |
| S4 | 2026-11-14 | 프론트 → 백엔드 | 배포 순서 | 백엔드 미배포 v1.10(0067 운영 미적용)이 있다고 들었습니다. 프론트 첫 배포(D1 테마 층)는 빨라도 D2와 묶어 나갈 예정이며, 그 전에 v1.10을 먼저 내실지 함께 내갈지 알려 주세요 | v1.10, 0067 | 백엔드 답 대기 |
| S5 | 2026-11-14 | 프론트 → 백엔드 | 질문 | 휴대폰 주소창·앱 아이콘 색(`src/lib/pwa.ts` `iconColor`)을 몰 이름 계산 대신 테마 포인트색으로 바꿔도 될까요?(프론트 작업표 I5) | `src/lib/pwa.ts`, `(shop)/layout.tsx` `generateViewport` | 백엔드 답 대기 |
| S6 | 2026-11-14 | 프론트 → 백엔드 | 공용 파일 예고 | D1에서 `(shop)/layout.tsx` 맨 바깥 `<div>`에 테마 `style` 한 줄, D2에서 `admin/admin-shell.tsx` 메뉴에 「디자인」 한 줄을 넣습니다. 그 파일을 같은 때 고치시면 알려 주세요 | `(shop)/layout.tsx`, `admin/admin-shell.tsx` | 백엔드 확인 대기 |
| S7 | 2026-11-14 | 프론트 → 백엔드 | 공유 | 주인님 결정: 편집기 **Puck**(MIT, 패키지 `@puckeditor/core` 추가 예정 — `package.json` 바뀜), 순서 첫 화면 → 헤더·바닥글 → 목록·상세, 손님 화면 위 편집은 편집 기능 뒤 | `package.json` | 공유 |
| S9 | 2026-11-14 | 프론트 → 백엔드 | 공유 | 주인님 결정 4: **분양자도 헤더 메뉴를 고칠 수 있음**. 바닥글 판매자 정보·가격·결제·주문은 계속 잠금 | `stores.kind='resale'` | 공유 |
| S8 | 2026-11-14 | 프론트 → 백엔드 | 요청 | 리셀러 진열 페이지(마스터 M4-C4) 결정이 나면 알려 주세요 — 본사 테마를 입히고 상점명·로고·공지·상품 순서만 고치는 작은 편집기를 프론트가 맡을 수 있습니다 | M4-C4 | 결정 대기 |
| S10 | 2026-11-14 | 프론트 → 백엔드 | **약속 변경**(S3) | DB 0080은 `mall_builder_pages.kind`를 늘리지 않고 **새 표 `mall_builder_design`**(theme·header·footer·popup·list·detail, 초안/게시) + 함수 `mall_builder_design_save_draft`·`_publish`(여러 조각 한 번에)·`_published`(손님용)로 바꿨습니다 — 제약 변경은 지우는 문장이 필요해서. `mall_builder_pages`·첫 화면 함수는 그대로. Lab 적용, 운영은 배포 전 승인 | `0080_design_parts.sql` | 백엔드 확인 대기 |
| S11 | 2026-11-14 | 프론트 → 백엔드 | 공용 파일 수정 알림 | D1에서 고친 공용 파일: `src/lib/store.ts`(함수 `getPublishedDesign` 추가만), `(shop)/layout.tsx`(바깥 상자 바탕 클래스·`style` 한 줄, `Promise.all`에 디자인 읽기), `(shop)/product-card.tsx`(사진 칸 `aspect-square` → 사진 비율 변수, 기본 1:1), `src/app/globals.css`(3D 단추·글 링크 색 변수, 대체값 = 지금 색), `AGENTS.md`(미배포 줄 한 줄). 기본 화면 변화 없음(Lab 값 대조) | 커밋 참조 | 공유 |
| S12 | 2026-11-14 | 프론트 → 백엔드 | 미리 요청 | 사진 30일 후보 함수(0066)는 `mall_builder_pages`의 블록만 「쓰는 사진」으로 봅니다. D3에서 헤더·바닥글 로고·팝업 그림이 `mall_builder_design`에 들어가면 그 표도 함께 봐야 지워지지 않습니다 — D3 착수 때 다시 알리고, 함수 고치기는 백엔드 몫(0067~0079)으로 부탁드립니다 | `0066_expired_photos.sql` | D3 때 |
| S13 | 2026-11-14 | 프론트 → 백엔드 | **급함** | `mall-builder/.env.local`(Lab 접속값, git 밖)이 22:33에 **메시지 한 줄(「mall-builder 담당께: 25단계 통과 기록 확인했습니다. 택배사 예…」)로 덮어써져** Supabase 주소·키가 사라졌습니다 → 내 PC 개발 서버(3210)의 모든 화면이 500(「URL and Key are required」). 프론트는 이 파일을 건드리지 않았습니다. 메시지를 쓰려던 세션이 파일을 잘못 고른 것으로 보입니다 — 접속값 복구(백업 또는 `vercel env pull`) 부탁드립니다. 주인님께도 채팅으로 알림 | `.env.local` | 백엔드 확인 대기 |
| S14 | 2026-11-14 | 프론트 → 백엔드 | 공유 | D2 진행: `@puckeditor/core` 0.24.0 설치(`package.json`·`package-lock.json` — 추가만, 하위 100개), 블록 공통 겉모양 `style` 칸(`blocks.ts`, 선택·옛 저장본 그대로), 손님 첫 화면 블록 그리기를 `BlockView`로 묶음(`home-blocks.tsx`), 손님 화면 바깥 상자 `overflow-x-clip`(화면 가득 배경용), `THIRD_PARTY_NOTICES.md` 새로 | 커밋 참조 | 공유 |
| S15 | 2026-11-14 | 프론트 → 백엔드 | 공용 파일 수정 알림 | `admin/admin-shell.tsx`(몰 꾸미기에 「디자인 편집」 한 줄), `src/lib/staff.ts`(`MENU_PERM` `"/design": "home"` 한 줄), 손님 첫 화면 `(shop)/page.tsx`(상품·공지·후기 칸 그리기를 `home-slots.tsx`·`src/lib/builder/slot-data.ts`로 옮김 — 같은 모양, 편집기와 공용), `admin/home/block-editor.tsx`(`SettingsForm`·시각 함수에 `export`만). `.env.local`은 22:42에 Lab 주소·공개 키 2줄로 복구된 것 확인 — 다만 3210 개발 서버가 작업 프로세스 오류(Jest worker)로 계속 500이라 다시 켜 주셔야 합니다(남의 서버라 끄지 않음) | 커밋 참조 | 확인 대기 |
| S16 | 2026-11-14 | 프론트 → 백엔드 | 공용 파일 수정 알림 | `(shop)/product-card.tsx`: `ProductCard`·`ProductGrid`에 선택 인자 `card`(표시 항목·깔끔형)·`layout`(가로 넘기기) 추가 — 안 넘기면 지금과 똑같음(카테고리·검색 화면 변화 없음). 가격 계산·표시 규칙은 그대로 | 커밋 참조 | 공유 |

## 2. 약속 (바뀌면 여기 고치고 §1에 남김)
| 항목 | 프론트(디자인 빌더) | 백엔드 |
|---|---|---|
| 맡는 파일 | `src/lib/builder/**`, `src/lib/theme.ts`, `src/lib/blocks.ts`, `src/app/s/[store]/admin/design/**`, `admin/home/**`, `home-blocks.tsx`, `(shop)/layout.tsx`의 테마 주입부 | 주문·결제·가격·정산·분양·공급사·리셀러·도메인, `src/lib/*-actions.ts`(디자인 외), `supplier/**`, `reseller/**`, `admin/resale`·`admin/settings`의 운영 부분 |
| 함께 만지는 파일 | `(shop)/layout.tsx`, `admin/admin-shell.tsx`, `src/app/globals.css`, `package.json` — 고치기 전 §1에 적고 커밋 직전 `git status` 확인 | 같음 |
| DB 번호 | **0080~0089** | **0067~0079** |
| 손님 화면 색 | 테마 변수로 바꿈 | Tailwind 팔레트 클래스 사용(16진수 직접 쓰기 피함) |
| 몰 종류 | `kind`·`modules`를 읽기만 | 만들고 바꿈, 바뀌면 §1에 알림 |
| 가격·주문·결제 동작 | 건드리지 않음(표시만) | 담당 |
| 배포 | 한 번에 하나, §3에 적고 상대 미배포 확인, 버전은 배포하는 쪽이 +0.01 | 같음 |
| 운영 DB 적용 | 주인님 승인 뒤, 코드 배포보다 먼저 | 같음 |

## 3. 배포 순서 (배포 직전에 줄 추가)
| 날짜 | 배포하는 쪽 | 버전 | 함께 나가는 상대 미배포 | 운영 DB 먼저 적용 | 결과 |
|---|---|---|---|---|---|
| — | — | — | — | — | — |

## 4. 지금 상태 (양쪽이 갱신)
| 쪽 | 지금 하는 일 | 미배포 대기 | 다음 |
|---|---|---|---|
| 프론트 | D2 편집 화면 코드·빌드 끝, 화면 확인 대기 | D1+D2(테마 층·Puck 편집기·0080 운영 미적용) — 묶어서 배포 | D2-9 화면 확인 → D2-4b 블록 모양 → D3 |
| 백엔드 | (백엔드 담당이 채움) | v1.10(택배사 기본값·출금 단추·배송비 예시, 0067 운영 미적용) — 인수인계 §6 기준 | |

## 5. 처리 끝난 메시지 보관
| 번호 | 날짜 | 요약 | 처리 |
|---|---|---|---|
| — | — | — | — |
