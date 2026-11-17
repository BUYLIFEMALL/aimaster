# 맥미니 요청 — ESM 등록기 v1.02 「입력만」 + 쇼핑제휴 v1.89 네이버 수집 실물 시험 (2026-11-17 정정, [역할: ecommerce-image] → [역할: mac-mini])

> **2026-11-17 정정(이 절이 아래 2026-11-16 원 요청보다 우선)**: 주인님 직접 지시 「master에게 테스트 요청해」「이것도 맥미니 몫이야」. Master msg_a042112fc563. 아래 옛 절(v1.01·관리자 계정·옛 상품)은 기록으로만 보존합니다.

## 최신 기준 (2026-11-17)
| 항목 | ESM 등록기 | 쇼핑제휴 |
|---|---|---|
| 운영 버전 | **v1.02** (`esm-register-rl1ce5afz` Ready) | **v1.89** (`threads-affiliate-poster-qkncpet55` Ready) |
| 확장 ZIP (내려받기) | https://esm-register.buylife.xyz/downloads/esm-register-extension-latest.zip — 안의 manifest `version_name` v1.02 (2026-11-17 `check-extension-release` OK) | https://threads-affiliate-poster.buylife.xyz/downloads/threads-affiliate-poster-extension-latest.zip — v1.89 (2026-11-17 OK) |
| 확장 목록 이름 | AI G마켓·옥션 상품 자동등록기 · v1.02 | Threads 쇼핑제휴 자동화 · v1.89 |
| 시험 계정 | `buylifemall@naver.com` (이미 로그인된 세션 사용) | 같음 |
| 시험 대상 | 상품 「시험용 스테인리스 텀블러 500ml」 `82deeddc-58c8-4b14-9d59-66728bb876af`, 등록 방식 **입력만** | 네이버 브랜드커넥트 **실제 상품 링크 1개** |
| 하지 않을 것 | ESM+ 저장·임시저장·등록하기 버튼 0, 같은 실패 자동 반복 0 | 대기열 「등록」·글 생성(유료 AI) 0 — Master가 따로 승인할 때만 |

## 사람 조작 한 묶음 (주인님, 처음에 한 번)
1. 맥미니 ego lite에서 위 두 ZIP을 받아 **지우지 않을 폴더**에 풀고, `chrome://extensions` → 개발자 모드 → 「압축해제된 확장 프로그램을 로드합니다」로 **manifest.json이 바로 들어 있는 폴더**를 각각 고르기(폴더 선택 창은 사람 몫).
2. https://www.esmplus.com 로그인(주인님 직접, 비밀번호 입력은 에이전트가 하지 않음).
3. 네이버 로그인(주인님 직접) + 브랜드커넥트에서 시험할 상품 링크 1개 복사해 맥미니 세션에 전달.

## 맥미니가 할 일 (사람 조작 뒤)
**ESM 등록기 v1.02**
1. https://esm-register.buylife.xyz/extension → 「🔗 확장 연결하기」 → 연결됨·v1.02 확인.
2. (선택, 비용 없음) 대시보드 「ESM+ 화면 점검」 1회 → 못 찾은 「구역|칸」 원문 기록.
3. https://esm-register.buylife.xyz/products/82deeddc-58c8-4b14-9d59-66728bb876af → 카테고리 검색어 「보온병」(또는 「텀블러」) · **입력만** → 「🛒 확장으로 G마켓·옥션 보내기」 1회.
   - 시험 계정은 ESM+ 기본값(배송·출고지·반품지) 미등록 — 보내기는 막히지 않고 배송 칸은 ESM+ 기본 설정을 씀. 칸 채우기 확인이 목적이라 기본값은 새로 저장하지 않습니다.
   - 확장이 `item.esmplus.com/goods/new`를 열고 위에서부터 채움 → 멈추면 그 자리에서 끝(정상). /history의 상태(「입력 완료(회원 확인)」 또는 멈춘 칸·오류 원문)와 ESM+ 화면 캡처.
   - 채운 값 확인: 상품명·판매가(15,900, 10원 단위)·카테고리 경로·대표 사진·상세 이미지 860px 합본 1장·고시·원산지.
4. ESM+ 탭은 저장하지 않고 닫기(「나가기」 확인 창은 사람 몫). 만들어진 작업이 대기로 남으면 /history에서 취소.

**쇼핑제휴 v1.89**
1. https://threads-affiliate-poster.buylife.xyz 에서 확장 연결 상태·v1.89 확인.
2. 「네이버 수집」 칸에 받은 실제 링크 1개 → 확장이 상품 화면을 열어 수집 → **대기열에 표시**되는지(상품명·가격·이미지·고지 문구) 확인. 「등록」은 누르지 않음.

## 결과 남길 곳
- 이 문서 맨 아래 「맥미니 결과」 표(항목·결과·근거·캡처 경로), 캡처는 `esm-register/docs/evidence/`(쇼핑제휴는 `threads-affiliate-poster/docs/evidence/`).
- 결과는 Master 경유로 [역할: ecommerce-image]에 전달 → 칸 찾기 보정은 윈도우가 합니다.
- 비용: 없음(빌드·배포·AI 0). ESM+·네이버에 실제 상품·글을 만들지 않음.

---

## (보존) 2026-11-16 원 요청 — v1.01·관리자 계정·옛 시험 상품 기준, 위 정정으로 대체됨

### 맥미니 요청 — G마켓·옥션 등록기 v1.01 확장 「입력만」 실물 시험 (2026-11-16, [역할: ecommerce-image] → [역할: mac-mini])

> 주인님 지시(2026-11-16): 「맥미니에 테스트 요청해」. 플랜 `docs/PLAN_20261115_ESM_EXTENSION.md`, 화면 분석 `docs/ESM_FORM_ANALYSIS_20261115.md`, 프로그램 인수인계 `esm-register/AGENTS.md`를 먼저 읽어 주세요.

## 지금 상태
- 웹 v1.01 운영 배포 끝(`esm-register-7xufzg73q`, Ready): https://esm-register.buylife.xyz
- 운영 DB 적용 끝(표 4개, 프로그램 비공개 카테고리 `backup` → 관리자·시험 계정만 보임).
- 관리자 계정 기본값 저장 끝: CJ택배 · 출고지/반품지 「바이라이프」 · 배송비 정책 37246700 · 고시 「기타 재화」.
- 확장 v1.01(1.1.0)은 **아직 실제 ESM+ 화면에서 한 번도 돌려 보지 않았습니다.** 칸 찾기(구역 제목 → 칸 이름 → 입력칸)가 실물에서 맞는지 확인하는 것이 이번 목적입니다.

## 확인 순서 (맥미니 ego lite, 관리자 계정 `buylifemall@gmail.com`)
1. **확장 설치**: `chrome://extensions` → 개발자 모드 → 「압축해제된 확장 프로그램을 로드합니다」 → `/Volumes/gt1_mega/AIMaster/esm-register/extension` 폴더(사용자 직접 선택, handOff). 이름 「AI G마켓·옥션 상품 자동등록기」, 버전 v1.01 확인.
2. **ESM+ 로그인**: https://www.esmplus.com 에 주인님이 직접 로그인(비밀번호 입력 안 함).
3. **확장 연결**: https://esm-register.buylife.xyz/extension 「이 계정으로 연결」 → 팝업에 연결됨 표시 확인.
4. **화면 점검 1회**(비용 없음): 대시보드(https://esm-register.buylife.xyz/home) 「ESM+ 화면 점검」 카드의 「지금 점검」 → `item.esmplus.com/goods/new`에서 「구역|칸」 목록 중 못 찾은 칸 원문을 기록.
5. **「입력만」 1회**: https://esm-register.buylife.xyz/products 에서 시험 상품 「스위스톤 확장형 여행백팩」(`44a9cfc4-0ef0-4c64-9ecd-ba506e5e9ea3`), 카테고리 검색어 「백팩」, 등록 방식 **입력만** → 보내기. 확장이 새 탭으로 「상품등록 2.0」을 열고 위에서부터 채움.
   - **저장·임시저장·등록하기 버튼은 누르지 않습니다.** 확장도 「입력만」에서는 누르지 않습니다.
   - 멈추면 그 자리에서 끝(첫 실패에서 멈춤이 정상 동작). 「등록 기록」(/history)에 남은 멈춘 칸·오류 문구 원문과 ESM+ 화면 캡처를 함께 남깁니다.
   - 채워진 칸마다 값이 맞는지(상품명·판매가 10원 단위·카테고리 경로·대표/추가 사진·상세 이미지 1장 합본·고시·배송·반품) 캡처로 확인.
6. 끝나면 ESM+ 탭은 저장하지 않고 닫고(「나가기」 확인 창은 사용자 몫), 작업 공간 `finish({keep:[]})`.

## 하지 않을 것
- 임시저장·실제 등록 시험은 이번 요청 범위가 아닙니다(칸 보정 뒤 윈도우 세션이 따로 진행).
- 같은 실패를 자동으로 반복하지 않습니다. 코드 수정·빌드·배포·운영 DB 직접 쓰기 없음.
- 배송비·출고지 새로 만들기 등 ESM+ 설정 변경 없음.

## 남길 것
- 이 문서 맨 아래 「맥미니 결과」 표(항목·결과·근거)와 `esm-register/docs/IMPROVEMENTS.md` 맨 위(없으면 새로 만듦)에 멈춘 칸·오류 원문·화면 구조 차이(실제 구역 제목·칸 이름·버튼 글자)·캡처 경로.
- 캡처는 `esm-register/docs/evidence/`.
- 결과함 `node scripts/dev-requests.mjs report`로 [역할: ecommerce-image] 앞으로 전달.
- 비용: **없음**(AI 호출·빌드·배포 0). ESM+ 상품도 만들지 않음.

## 맥미니 결과
(맥미니 세션이 채움)
