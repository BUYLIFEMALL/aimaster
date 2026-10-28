# 인수인계 — AI 스마트스토어 상품 자동등록기 (2026-10-28)

> 작성: Claude Code(윈도우) `claude-win-sdp` · [역할: ecommerce-image] · 운영 https://smartstore-register.buylife.xyz · 운영 DB `esgxyikcnnvmlhygjkth`
> 앞 문서: [`IMPROVEMENT_HANDOFF_20261027.md`](IMPROVEMENT_HANDOFF_20261027.md) · 재개 안내서 [`RESUME_GUIDE_20261027.md`](RESUME_GUIDE_20261027.md) · 상세 이력 [`../AGENTS.md`](../AGENTS.md) 2026-10-28 항목들

## 1. 지금 상태 한눈에
| 항목 | 상태 |
|---|---|
| 운영 버전 | **v1.23** (배포 `1ei77dyqs`, DB·확장·ZIP v1.23 OK) — v1.22 상품속성 AI 추천 + v1.23 판매자센터 화면 점검(7일 자동·「지금 점검」, 첫 점검 「정상」) |
| 미배포 대기 | 없음 |
| 실물 시험(ego lite) | 입력만 · 임시저장 · 연속 보내기 · 예약구매 · 바로 등록 · 반품 칸 · 상품속성 불러오기/고르기 **모두 통과** |
| 프로그램 배지 | `new`, `premium` — **주인님이 직접 지정(2026-10-28 18:52, 「내가 붙인거야」)**. 관리자 외 회원은 결제 구독 필요 → 회원 화면 시험은 관리자 계정으로 |
| ego 확장 연결 계정 | 관리자 `buylifemall@gmail.com`(시험 때문에 다시 연결). 판매자센터 로그인은 바이라이프몰(`buylifemall`) |

## 2. 오늘 한 일
| 시각(KST) | 일 | 결과 |
|---|---|---|
| 오후 | 연속 보내기 2개·예약구매 「임시저장까지」 | 통과(임시저장본 2→6건) |
| 16:09 | 「바로 등록」 | **판매자센터 거절**: 「조합형 옵션 상품은 상품 재고와 옵션 재고 합이 같아야」 → 재고 = 조합 재고 합계로 수정, `STEP_BUILDER` 6 |
| v1.20 | 재고 합계, 결과 기록 끝 「판매자센터: 스토어명 (계정)」, 이전 작성 창 취소·옵션 엑셀 재시도·옵션 개수 읽기 | 배포 `nrehzqsy4` |
| 16:46 | 「바로 등록」 재시험 | **성공**(재고 198, 상품 13836444099 전시중지 — 주인님 「전시 중지로 놔둬」) |
| 17:34·18:01 | 반품 칸 실물(테스트 기본값에 잠깐 넣고 뒤에 비움) | 반품 택배사는 `input`+selectize(보기 「기본 반품택배사 - CJ대한통운」)라 실패 → 보정 후 통과 |
| — | 상품번호 읽기 보강(완료 창 버튼 속성, 못 찾으면 완료 창 모양 기록) | 다음 실제 「바로 등록」 때 확인 |
| 저녁 | **상품속성 고르기** — 판매자센터 내부 데이터 주소를 확장이 읽기만 | DB 표 `smartstore_register_attr_lookups` 추가, v1.21 배포, 19:17 실물 통과 |
| 밤 | 필수 속성 안내, **상품속성 AI 추천(Claude)** | 커밋, 실제 호출 1회 통과(3.8초) |

## 3. 핵심 구조(새로 생긴 것)
| 부분 | 파일 | 요점 |
|---|---|---|
| 속성 데이터 주소(판매자센터 내부) | 플랜 [`PLAN_20261028_ATTRIBUTES.md`](PLAN_20261028_ATTRIBUTES.md) §9 | 카테고리 검색 `POST /api/category-search?_action=getCategoriesByIgnoreCase {query,isValid:true,leafOnly:true}`(결과 없으면 **빈 응답**), 속성 `GET /api/category-attribute/attribute-group?leafCategoryId=`(이름·`MULTI_SELECT`/`SINGLE_SELECT`·최대 개수·`attributeRequired`·보기 글자) |
| 요청 표 | `supabase/migrations/20261028_attr_lookups_v1_21.sql` | 회원 본인만(RLS), 30일 정리(`/api/cron/cleanup`) |
| 서버 | `src/lib/smartstore/attributes.ts` · `src/lib/actions/attributes.ts` · `/api/extension/attr-task`·`attr-result` | 7일 안 같은 조건 재사용, v1.21 미만 확장엔 안 넘김, 5분 멈춤 → 실패 |
| 확장 | `extension/background.js` `attrLookupMain`·`runLookup`·`sellerTabForRead` | 등록 작업이 없을 때만, 열린 판매자센터 탭은 건드리지 않고 그 안에서 fetch만(저장 없음). 검색어 → 마지막 낱말 → 상품 경로 단계 순서로 다시 찾음 |
| 화면 | `src/components/AttributePicker.tsx` | 불러오기·카테고리 후보 바꾸기·한 개/여러 개(최대 개수)·필수 표시·빈 필수 노란 안내·**✨ 추천**. 결과는 기존 `attributes` 글 칸(「이름: 값1, 값2」) → 확장 입력은 그대로 |
| AI 추천 | `src/lib/ai/claude.ts` · `suggestAttributesAction` | **회원 본인 `anthropic` 키**, `claude-opus-5-5` effort low, `json_schema`, `fallbacks:"default"`, 재시도 0, `sanitizeSuggestion`으로 보기 안 값만, **빈 속성만** 채움 |

## 4. 오늘 정한 규칙(지침 반영 완료)
- **기본 AI = Claude** — 루트 `CLAUDE.md`·`AGENTS.md`·`GEMINI.md` 맨 위, [`../../docs/CLAUDE_CODE_API_CREDIT.md`](../../docs/CLAUDE_CODE_API_CREDIT.md) §2-1. 회원 기능은 회원 본인 `anthropic` 키, 개발·시험은 주인님 크레딧/관리자 본인 키, 기존 Gemini 코드는 일괄 교체 안 함.
- 배포는 「나중에 한 번에 모아서」(작은 수정 모아 배포 규칙과 같음).
- 일반 등급 2주 = 가입일 + 14일 유지.

## 5. 함정(다음 CLI 필독)
1. bash heredoc·`sed`로 확장 코드를 고치면 정규식 `\s` 역슬래시가 빠진다 → Write로 스크립트 파일 + `split/join`, 고친 뒤 해당 줄을 직접 읽어 확인.
2. ego 스크립트는 **Bash에서 실행하면 멈춘다** → PowerShell에서 `ego-browser.exe nodejs -e "await import('file:///…')"`. `page.evaluate`는 15초 제한(안에서 오래 기다리지 말 것).
3. ego 작업 공간이 열려 있으면 창이 잠겨 확장이 새 탭을 못 엶 → 보내자마자 `task.finish({keep:[]})`.
4. **PC 화면 잠금 중에는 확장이 멈추고**, 풀린 뒤 이어 돌면 이미지 서명 주소(15분)가 만료돼 실패.
5. 등록기 로그인이 풀릴 수 있음(ego에서 한 번 풀림) → 비밀번호는 주인님이.
6. Supabase SQL 편집기의 위험 확인 창 버튼 이름은 「Run query」.
7. 판매자센터 반품 택배사는 `select`가 아니라 `input`(계약 번호)+selectize.
8. 프리미엄 배지가 붙으면 일반 회원(테스트 계정)은 등록기·확장 모두 막힘 → 관리자 계정으로 시험하고 확장도 관리자로 다시 연결.

## 6. 남은 일(순서대로)
| 순서 | 할 일 | 주인님 할 일 |
|---|---|---|
| 1 | **v1.22 묶음 배포**(미배포 3건) → ego에서 「✨ 추천」 실물 확인 | 배포 승인(빌드 1회) |
| 2 | ~~화면 변경 조기 발견~~ ✅ v1.23 배포·실물 확인(대시보드 「🩺 판매자센터 화면 점검」) | — |
| 3 | 다음 실제 「바로 등록」 때 상품번호 기록 확인 | — |
| 4 | 카테고리별 다른 필수 칸 대비(실패 사례 생기면) | — |
| 5 | 쿠팡 → 11번가 → G마켓 → 옥션 등록기 | — |

**주인님께 여쭐 것**: ego 확장 연결 계정(관리자 그대로 둘지) · 판매자센터 시험 임시저장본 6건 정리 · 관리자 스토어 기본값 A/S 전화 `02-0000-0000`(시험값) 교체.

## 7. 비용(오늘)
Vercel 빌드 2회(v1.20·v1.21, 승인), DB 표 추가 1회(무료, 승인), Claude API 호출 1회(관리자 본인 `anthropic` 키, `claude-opus-5-5`, 약 $0.02 이하).

## 8. 추가(2026-10-28 밤)
- v1.22: 상품속성 AI 추천·필수 속성 안내 배포, 운영 화면 확인.
- v1.23: 판매자센터 화면 점검 — 표 `smartstore_register_health`, 점검 칸 표 `src/lib/smartstore/health.ts`(**`fields.ts` target과 같은지 시험이 확인 — 칸을 바꾸면 함께 고칠 것**), 확장 `healthScanMain`·`runHealth`(비활성 새 탭, 읽기만, 그 탭만 닫음), 대시보드 카드. 첫 자동 점검 20:43 정상.
