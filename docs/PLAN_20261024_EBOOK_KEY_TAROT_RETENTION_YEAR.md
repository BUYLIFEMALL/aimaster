# 진행 플랜 — 전자책 본인 키·권한 / 타로 링크 공개 유지+30일 삭제 / 당해 연도 누락 7곳 (2026-10-24)

> 상태: **플랜(구현 전)** — 작성 `claude-win-dotori` [역할: analysis-planning]. 구현·배포는 담당 세션(주인님이 나중에 지정)이 이 플랜대로 한다.
> 근거: 카테고리 작업표 `docs/WORK_AUTOMATION_CONSOLIDATION_TASKS.md`(WA-U1~U3·U6), `docs/PERSONALITY_FORTUNE_CONSOLIDATION_TASKS.md`, 각 카테고리 작업표 「우선 처리」의 당해 연도 항목.

## 0. 주인님 결정 (2026-10-24, 절대 지시)
| 결정 | 내용 |
|---|---|
| 전자책 | **회원 본인 API 키를 등록한 뒤에만 사용**한다 |
| 타로 | **링크 공개(카카오 공유)는 그대로 할 수 있어야 한다** |
| 공개 저장소 | **공개 그대로 둔다**(카카오·인스타 공유 미리보기 유지). 대신 **작성 시점부터 한 달(30일) 뒤 자동 삭제** 기준을 공개 파일·기록에도 똑같이 적용한다 |
| 당해 연도 | 누락된 7곳에 당해 연도 지시를 넣는다(핵심 원칙 8) |

## 1. 전자책 `ebook-studio` v1.12 — 본인 키 등록 후 사용 + API 권한 확인

### 1-1. 지금 상태 (코드 확인)
| 위치 | 문제 |
|---|---|
| `src/app/api/ai/chapter/route.ts`·`outline/route.ts`·`cover/route.ts` | `getUser()`만 부르고 프로그램 권한 판정이 없다. 요청 본문의 `apiKey`(브라우저 저장 키)를 **먼저** 쓰고, 없을 때만 `user_api_keys`를 읽는다 → 로그인 안 해도 키만 보내면 실행 |
| `src/app/api/scrape/route.ts` | 로그인·권한 확인 없음, 받은 주소를 서버가 그대로 가져옴(사설·내부 주소 차단 없음) |
| `src/components/modals/SettingsModal.tsx` | Gemini 키를 브라우저 `localStorage`(`ebook_studio_gemini_api_key`)에 저장, 모델 선택지에 종료된 `gemini-1.5-*` |
| `src/app/api/user/key/route.ts` GET | 저장된 **키 원문을 그대로 브라우저에 돌려준다** → 가려서(앞뒤 4자) 돌려주도록 바꿔야 함 |
| `src/lib/access.ts` | `checkProgramAccessApi()`가 이미 있는데 API에서 부르지 않음 |

### 1-2. 고칠 순서
1. **API 4개 문 잠그기**: `ai/chapter`·`ai/outline`·`ai/cover`·`scrape` 맨 앞에서 `checkProgramAccessApi()`(정지→관리자→핸드폰→FREE→구독→등급+사용기간) 통과 뒤에만 실행. 네 파일에 `dynamic = "force-dynamic"`·`fetchCache = "force-no-store"`.
2. **키는 서버에서만**: 요청 본문 `apiKey`를 읽지 않는다. 항상 `user_api_keys`(provider `gemini`)에서만 읽고, 없으면 `{ needKey: true }` + 「API키등록·플랫폼연동에서 본인 Gemini 키를 등록해 주세요」(운영자 키 폴백 금지).
3. **설정 화면**: 키 입력은 `POST /api/user/key`로 서버 저장만, 화면에는 가린 키만 표시. 예전 `localStorage` 키가 있으면 「서버에 등록하기」 버튼으로 옮긴 뒤 지운다(첫 방문 1회 안내). GET은 가린 값만.
4. **웹 주소 가져오기 안전장치**: `http/https`만, 사설·내부 주소(127.*, 10.*, 172.16–31.*, 192.168.*, 169.254.*, `localhost`, IPv6 사설) 거부, 한 번에 12개·주소당 크기·시간 제한 유지.
5. **모델 목록**: `gemini-1.5-*` 제거, `ai-image-studio`·공용 모델 목록 기준으로 교체(글 모델은 실재 확인된 ID만).
6. **키 없음 팝업**: 생성 버튼에서 `needKey`면 등록 화면 안내 팝업(`ApiKeyRequiredModal` 패턴).

### 1-3. 검수
- 로컬: `npx tsc --noEmit` · `npm run build` · 시험(비로그인 401 / 권한 없음 403 / 키 없음 needKey / 사설 주소 거부)
- 크롬(시험 계정 `buylifemall@naver.com`): 키 등록 → 장 집필 1회(가장 싼 모델) → 키 삭제 후 팝업 확인
- 배포 1회(빌드 1회 비용 — 실행 전 승인), 버전 v1.13(코드+DB)

## 2. 타로 `tarot-reading`(폴더 `tarot/`) v1.27 — 링크 공개 유지 + 30일 자동 삭제

### 2-1. 지금 상태
- 결과 화면 `/result`는 **의도적으로 비로그인 공개**(공유받은 사람이 보도록 — `tarot/middleware.ts` 주석). 리딩은 자동 저장되고 `?rid=<UUID>` 주소로 열린다. UUID는 추측이 어려워 「주소를 받은 사람만 보는 링크」 방식이다 → **주인님 결정대로 유지**.
- 카드 그림은 공개 저장소(`tarot/supabase/migrations/0003_card_images_storage.sql`) → **공개 유지**.
- 30일 자동 삭제 없음(리딩 행·그림 모두 기한 없이 남음). 해석 프롬프트에 당해 연도 없음(「한 해 운세」 포함).

### 2-2. 고칠 순서
1. **30일 자동 삭제**: 예약 작업 `/api/cron/cleanup`(매일 1회, `CRON_SECRET` 확인) — `tarot_readings.created_at < now() - 30일` 행과 그 행의 그림 파일(`card_images`) 삭제, 회원별 삭제 건수 기록. 기존 행은 **배포일부터 30일 유예** 뒤 첫 삭제(갑자기 지워지지 않게).
2. **링크 안내**: 결과·공유 화면에 「이 링크는 받은 사람 누구나 볼 수 있고, 만든 날부터 30일 뒤 자동으로 사라집니다」 한 줄. 30일이 지난 `rid` 주소는 「기간이 지나 사라진 결과입니다」 화면(카드 다시 뽑기 안내).
3. **옛 `?img=` 링크**: 최근 100건을 `user_id` 조건 없이 훑는 코드(`app/result/page.tsx` 270행 이하)는 30일 삭제 뒤 의미가 줄어든다 — 30일 안의 것만 찾도록 조건을 좁히고, 다음 판에서 지원 종료 검토.
4. **당해 연도**: §3 공통 함수로 해석 프롬프트에 주입(「한 해 운세」는 올해 기준 명시).
5. **「재미로 보는 결과」 안내**를 결과 화면에도 표시(지금은 해석 지시문에만 있음).

### 2-3. 검수
- 로컬 시험: 30일 지난 행만 지움·유예 기간 안에서는 안 지움·지운 뒤 `rid` 화면 문구
- 크롬: 리딩 1회 → 공유 링크를 로그아웃 창에서 열기(보이면 정상) → 카카오 미리보기 그림 확인
- 배포 1회(승인 필요), 버전 v1.28(코드+DB), `vercel.json`에 예약 작업 추가(운영 Vercel 예약 사용 — 운영 정리 작업이라 회원 cron-job.org 대상 아님, `docs/SCHEDULER_POLICY.md`)

### 2-4. 같은 기준을 적용할 다른 공개 저장소 (각 담당이 같은 방식으로)
| 프로그램 | 공개 저장소 | 30일 삭제 현황 | 근거 |
|---|---|---|---|
| 캐릭코드 `mbti-character` | 캐릭터 그림 | 없음 | `docs/PERSONALITY_FORTUNE_CONSOLIDATION_TASKS.md` |
| 감성 글귀 → INSTA | `insta-post-images/<회원>/` | 정리 대상 아님 | `docs/IMAGE_CONSOLIDATION_TASKS.md` IM-U1 |
| 네이버 카페 | `post-images` | 없음 | `docs/NAVER_CONSOLIDATION_TASKS.md` NV-P3·P4 |
| 글쓰기 에디터 | 본문 그림 | 개수 제한만 | `docs/WORK_AUTOMATION_CONSOLIDATION_TASKS.md` |
| Shots | `shots-videos` | 파일은 정리, 행·배경음악은 남음 | `docs/YOUTUBE_CONSOLIDATION_TASKS.md` YT-U3·U6 |
| 카카오 뉴스레터 | 리포트 그림 | 없음 | `docs/CRM_CONSOLIDATION_TASKS.md` CRM-P7 |

### 2-5. 공개 저장소 공통 기준 (주인님 결정 2026-10-24 — 모든 프로그램 공통)
| 상황 | 결정 | 할 일 |
|---|---|---|
| 공개 저장소 자체 | **공개 그대로** | 비공개 전환·임시 주소 작업은 하지 않는다 |
| 보관 기한 | **작성 시점부터 한 달(30일) 뒤 자동 삭제** | 위 §2-4 표의 프로그램마다 매일 1회 정리 작업(파일 + 기록 행), 기존 자료는 배포일부터 30일 유예 |
| 글쓰기 에디터 본문 그림 | **한 달 뒤 자동 삭제 + 「사용 후 그림을 내려받으세요」 공지를 잘 보이게** | ① 그림 올리는 칸·문서 편집 화면 위쪽에 노란 안내 띠: 「본문 그림은 올린 날부터 30일 뒤 자동으로 지워집니다. 블로그 등에 붙여 쓰셨다면 그림을 꼭 내려받아 두세요.」 ② 그림마다 「내려받기」 버튼과 남은 날짜(D-n) 표시 ③ 내보내기(복사·다운로드) 때 「그림은 30일 뒤 사라집니다 — 그림 파일도 함께 받으세요」 확인 ④ 30일 지난 그림 자리는 「기간이 지나 지워진 그림」 표시 |
| 다른 프로그램으로 넘기기(바나나 → 변환 스튜디오 등) | **지금처럼 공개 주소로 바로 가져간다** | 바꾸지 않음. 넘겨받은 쪽도 자기 저장소에 복사한 뒤 같은 30일 기준을 따른다 |
| 유튜브 업로드 | 서버가 파일을 직접 올림 — 영향 없음 | 바꾸지 않음 |
| 인스타·쓰레드 게시 | 공개 주소 그대로 사용 | 바꾸지 않음(게시 뒤 원본 파일은 30일 기준으로 삭제) |
| 카카오 공유 미리보기 | 공개 주소 그대로 | 30일 뒤엔 미리보기 그림도 사라짐 — 공유 화면에 「30일 뒤 사라집니다」 안내 |

## 3. 당해 연도 누락 7곳 — 공통 함수 하나로

### 3-1. 기준 코드
- 이미 쓰는 구현: `ebook-studio/src/app/api/ai/chapter/route.ts`의 `koreaNowRule()`(한국 시간 기준 연·월 문장, 서버가 UTC여도 한국 날짜), 같은 방식이 `naver-blog-agent/src/lib/ai/pipeline.ts`·`insta_auto_poster/src/lib/cardnews/ai/copyPrompts.ts`에도 있다.
- **공용 모듈로 등록**(`docs/SHARED_MODULES.md`, 공용 기준 코드 규칙): 이름 `korea-now-rule`, 기준 파일 1곳(예: `naver-blog-agent/src/lib/koreaNowRule.ts`)을 만들고 7곳은 `node scripts/check-shared-modules.mjs --sync` 사본으로 가져다 쓴다. 문장: `[기준 시점: 한국 시간으로 지금은 YYYY년 M월입니다. 모든 연도·정책·트렌드·제목은 YYYY년 기준으로 쓰고, 과거 연도(2023·2024년 등)를 현재처럼 쓰지 마세요. 계절 표현은 현재 월에 맞추세요.]`
- 블로그의 결과 보정(`year-policy`)은 블로그 전용으로 그대로 두고, 이번 7곳은 **프롬프트 주입만** 한다(결과 보정은 필요해지면 따로).

### 3-2. 대상과 넣을 곳
| 순서 | 프로그램(현재 버전) | 넣을 곳(프롬프트 파일) | 메모 |
|---|---|---|---|
| 1 | 상품소싱 `trending-product-finder` v1.24 | `lib/ai/` 시스템 프롬프트 2개 파일 | 트렌드·시즌 상품 판단에 직접 영향 — 먼저 |
| 2 | 쓰레드 포스팅 `auto-threads-posting`(폴더 `threads/`) v1.33 | `src/lib/` 글 생성 프롬프트(글감·본문) | |
| 3 | 쇼핑제휴 `threads-affiliate-poster` v1.84 | `src/lib/` 글 생성 프롬프트 | 같은 쓰레드 묶음이라 2와 같은 날 |
| 4 | 네이버 카페 `naver-cafe-poster` v1.28 | `src/lib/ai/` 프롬프트 | DUP-3(중복 게시)와 같은 배포에 묶기 |
| 5 | Shots `auto-shorts-posting`(폴더 `shots/`) v1.43 | `src/lib/ai/script.ts`·`collector.ts`·`posting.ts` | DUP-4와 같은 배포에 묶기 |
| 6 | 타로 v1.27 | `app/api/generate-reading/route.ts` | §2와 같은 배포 |
| 7 | 부동산 `real-estate-sales`(폴더 `real_estate_sales/`) v1.18 | `src/lib/ai/analyze.ts` | 지역 분위기 프롬프트는 이미 날짜 있음 — 매물 분석만 |

### 3-3. 검수와 배포
- 프로그램마다 시험 1개 추가: 프롬프트 문자열에 올해 연도가 들어가는지(유료 호출 없이 문자열만 검사) + `tsc` + `build`.
- **배포는 「작은 수정은 모았다가」 규칙대로**: 4·5·6은 위 묶음과 같은 배포로, 1·2·3·7은 각 프로그램의 다음 배포 때 함께(급하면 1만 먼저). 버전은 실제 배포할 때만 +0.01, 미배포 대기는 각 `docs/IMPROVEMENTS.md`·`docs/PENDING_DEPLOYS.md`에.

## 4. 비용
| 항목 | 횟수·대상 | 비용 |
|---|---|---|
| 빌드(배포) | 전자책 1 · 타로 1 · 연도 묶음 최대 5(카페·Shots는 DUP 묶음과 합쳐 0 추가 가능) | 빌드 1회당 Vercel 요금 — **실행 전 승인** |
| AI 시험 호출 | 전자책 장 집필 1회(시험 계정 본인 키, 가장 싼 모델) | 몇 원 수준 |
| DB 변경 | 타로 예약 삭제는 코드만(표 변경 없음) · 버전 SQL | 없음 |

## 5. 주인님께 여쭐 것
- 담당 세션 지정(이 플랜 3개를 누가 구현할지) — 지금은 「나중에 지정」.
- 타로 기존 리딩 유예 기간 30일로 할지(추천), 바로 지울지.
- 연도 1번(상품소싱)만 먼저 배포할지, 다음 배포 때 모아서 할지.
