# 검토 — Gemini AI 비서 웹 검색 지원 (2026-11-15, [역할: workspace])

백로그 「Gemini AI 웹 검색 지원 검토」. 코드는 바꾸지 않았다(검토만).

## 1. 지금 상태
- AI 비서 웹 검색은 Claude·OpenAI 키에서만 된다. Gemini 키는 웹 **페이지 읽기(`web_fetch`)**만 되고 **웹 검색은 빠져 있다**.
  - `src/litpage/server/ai/models.ts` `capabilities()` — gemini는 `dynamicWebTools: false`
  - `src/litpage/server/ai/providers/geminiTranslate.ts` 머리 주석 「web_search → 1차에서는 쓰지 않음」
- 그래서 Gemini 키만 등록한 회원은 「웹 검색」을 켜도 검색 없이 답한다.

## 2. Gemini 공식 문서(2026-11-15 확인, ai.google.dev → aistudio.google.com/docs 로 넘어감)
| 항목 | 내용 |
|---|---|
| 도구 이름 | `google_search`(최신 모델 공통. 옛 모델은 `google_search_retrieval`) |
| 함수 도구와 같이 쓰기 | **Gemini 3·4 모델만**, 미리보기 기능. `function_declarations`와 `google_search`를 같은 `tools`에 넣으면 됨. 이때 `auto` 방식은 안 되고 `validated` 방식 |
| 문서의 예시 주소 | 새 **Interactions API**(`POST /v1beta/interactions`) 기준. 우리 어댑터는 `generateContent` 형식이라, `generateContent`에서 같은 조합과 출처(groundingMetadata)가 그대로 오는지는 문서에서 확인되지 않음 |
| 출처 표시 | Interactions 응답: `google_search_call`(검색어) · `url_citation`(글 구간 ↔ 출처 주소). 우리 화면의 「검색함·출처」 표시로 바꿔 끼워야 함 |
| 요금(회원 본인 Gemini 키) | Gemini 3 이상: **월 5,000회 무료(유료 등급 프로젝트), 그 뒤 1,000회당 $14**, 하루 1,500회 한도. 모델이 실제로 실행한 검색어마다 1회. 무료 등급 키는 대부분 「지원 안 함」 |

## 3. 판단
- **가능**: 회원 본인 Gemini 키로 구글 검색을 붙일 수 있다(최상위 규칙 그대로 — 운영자 키 없음).
- **걸리는 점**
  1. 무료 등급 Gemini 키는 검색이 안 될 수 있다 → 실패하면 「검색 없이 답함 + 안내」로 내려가야 한다.
  2. 우리 어댑터(`generateContent`)에서 함수 도구와 검색을 같이 쓸 때의 응답 모양이 문서로 확정되지 않았다 → **실제 호출 1~3회로 확인 필요**(시험 계정 본인 Gemini 키, 무료 범위 안).
  3. 검색 1,000회당 $14가 회원 키로 청구된다 → 비서 설정 「웹 검색」 켜기 안내에 Gemini 요금 한 줄을 넣어야 한다.
- **작업량**: 어댑터에 도구 추가 + 응답의 검색어·출처를 기존 `web_search` 단계 표시로 바꾸기 + 실패 시 검색 없이 진행 + 시험. 중간 규모(반나절~하루).

## 4. 추천
1. 시험 계정 Gemini 키로 `generateContent` + `google_search` + 함수 도구 조합을 **1~3회 실제 호출**해 응답 모양을 확인한다(비용: 무료 범위 또는 몇 원).
2. 된다면 Gemini 3 이상 모델에서만 켜고(`dynamicWebTools`), 무료 등급 키 실패는 조용히 검색 없이 진행 + 안내.
3. 안 된다면(`generateContent`에서 조합 불가) Interactions API 전환은 범위가 커서 보류하고, 「Gemini는 웹 검색 대신 웹 페이지 읽기만」 안내를 매뉴얼에 적는다.

## 5. 주인님 결정 대기
- 위 1번 실제 호출(시험 계정 본인 Gemini 키, 1~3회) 진행 여부

## 6. 실제 호출 결과 (2026-11-15, 주인님 「진행해」, 시험 계정 본인 Gemini 키, `gemini-3.8-flash`, `generateContent`, 3회)
| 호출 | 결과 |
|---|---|
| ① `tools: [{google_search:{}}]`만 | ✅ 200 — 검색어 2개(「2026년 최저임금 고시」 등) 실행, 출처 3곳(`groundingMetadata.groundingChunks`, 첫 출처 moel.go.kr), 답에 출처 표기. 토큰 입력 323·출력 113 |
| ② `google_search` + 함수 도구 | ❌ 400 `INVALID_ARGUMENT: Please enable tool_config.include_server_side_tool_invocations to use Built-in tools with Function calling.` |
| ③ (②에 설정을 켜려 했으나 스크립트 수정이 적용 안 돼 ②와 같은 요청) | ❌ 같은 400 — 세션 실수, 승인 3회를 다 써서 추가 호출하지 않음 |

### 알게 된 것
- `generateContent`(우리 어댑터 방식)에서도 **구글 검색 자체는 된다** — 응답은 `groundingMetadata`(검색어·출처) 모양. Interactions API로 바꿀 필요 없음.
- 비서는 함수 도구(워크스페이스 검색 등)를 늘 함께 쓰므로 **`toolConfig.includeServerSideToolInvocations: true`를 함께 보내야 한다**(오류 문구로 확인). 이 설정을 켠 실제 호출 1회는 아직 못 했다.
- 첫 출처 주소는 `vertexaisearch.cloud.google.com` 경유 주소(구글이 감싼 주소) — 화면에는 출처 제목(도메인)을 보여 주면 된다.

### 다음 단계
- 「검색 도구 고르기」(`docs/PLAN_20261115_SEARCH_TOOL_CHOICE.md`)의 「모델 내장 검색」 선택지에 Gemini `google_search`를 넣는다. 구현 때 설정을 켠 호출 1회로 함수 도구 조합을 확인한다(주인님 승인 필요).

## 7. 연결 (2026-11-15, 주인님 「진행해」)
- 확인 호출 1회(스트리밍, `toolConfig.includeServerSideToolInvocations: true` + 함수 도구): ✅ 200. 응답 조각 순서 `toolCall` → `toolResponse` → 글 → 마지막 조각 `groundingMetadata`(검색어 2·출처 2, moel.go.kr), 답 「시급 10,320원」.
- 어댑터(`geminiTranslate.ts`): web_search 서버 도구 → `{google_search:{}}`(함수 도구가 있으면 설정 켬), `toolCall`·`toolResponse` → 「검색 중」 단계 블록(원래 조각·서명 보관, 다음 요청에 그대로), `groundingMetadata` → `web_search_tool_result`(출처). `webSearch.ts` 「자동·내장」에 Gemini 포함.
- 시험: gemini.test.ts 기대값 갱신 + 구글 검색 응답 변환 시험 추가.
