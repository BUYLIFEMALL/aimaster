# 맥미니 요청 — G마켓·옥션 등록기 v1.01 확장 「입력만」 실물 시험 (2026-11-16, [역할: ecommerce-image] → [역할: mac-mini])

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
