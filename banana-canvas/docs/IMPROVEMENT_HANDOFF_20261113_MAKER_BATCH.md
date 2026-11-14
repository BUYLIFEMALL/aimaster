# 디자인 인수인계 — AI 바나나 캔버스 메이커 후속 「상품 대표사진 일괄 합성(/batch)」 UI (2026-11-13)

> **작성자**: [역할: design] Antigravity CLI(`agy`) `agy-win-inf-v1`  
> **수신자**: [역할: ecommerce-image] Claude Code `claude-win-sdp` (A 기능 총괄 담당), [역할: review] Codex `codex-win-20261113-plan-review` (F 검수 담당), 관리자(주인님)  
> **대상 프로그램**: `banana-canvas` (`/batch` 화면)  
> **연계 문서**: [`HANDOFF_20261113_MAKER_AGY_DESIGN.md`](file:///D:/AIMaster/docs/analysis-ecommerce-bundle-20261024/HANDOFF_20261113_MAKER_AGY_DESIGN.md), [`MAKER_UPDATE_REVIEW_20261113.md`](file:///D:/AIMaster/docs/analysis-ecommerce-bundle-20261024/MAKER_UPDATE_REVIEW_20261113.md), [`DESIGN.md`](file:///D:/AIMaster/DESIGN.md)

---

## 1. 개요 및 설계 목표

본 인수인계 문서는 메이커 셀링 도우미 후속 조사 결과 도출된 **P1(상품 대표사진 일괄 합성)** 및 **P2(원래 상품으로 반환 연계)** 기능을 `banana-canvas`의 `/batch` 경로에 기존 바나나 고유의 감성을 계승하면서도 고도화된 이커머스 작업 편의성을 제공하도록 설계한 UI/UX 명세서입니다.

### 핵심 조작 수치 목표 (주인님 자동화 최소 설정 지침 준수)
1. **최초 설정 4단계**:
   - `1단계`: 자료 입력 (엑셀 셀 붙여넣기 / 파일 드래그앤드롭 / 상세페이지 상품 불러오기)
   - `2단계`: 메인·서브 짝 확인 및 서브 모드 선택 ([A] 공용 서브 vs [B] 상품별 개별 서브)
   - `3단계`: 1:1 라이브 캔버스 미리보기 & 합성 규칙/파일명 템플릿 확정
   - `4단계`: 일괄 실행 & 결과 확인 및 원래 상품(상세페이지/마켓등록기) 반환
2. **반복 조작 2~3회**:
   - 로컬 브라우저 기억소(localStorage)에 이전 설정(앵커 위치, 서브 비율, 테두리, 파일명 접두 등) 자동 보존
   - 2회차 작업부터는 **「자료 붙여넣기 ➔ 미리보기 1초 확인 ➔ 실행 버튼 클릭」 (총 2~3클릭)**으로 작업 종결.
3. **기본 동의 1회**:
   - 로컬 브라우저 기반 무과금 연산(비용 0원, 서버 전송 0) 고지 1회. 유료 AI 생성이나 외부 등록이 아닌 한 추가 동의 창 없음.
4. **원클릭 안전 중단**:
   - 일괄 실행 중 언제든지 한 번의 클릭으로 멈출 수 있는 **`[⏸️ 전체 일괄 즉시 중단]`** 긴급 정지 버튼 상시 노출.

---

## 2. 4대 화면 UI 및 사용 흐름 상세 명세

### 01. 상품코드 작업표 & 짝짓기 (`01_table`)
- **상단 4단계 파이프라인 배너**: 현재 진행 단계를 시각적으로 명확히 표시
- **자료 넣기 도구함**:
  - `[📋 엑셀 셀 붙여넣기 (Ctrl+V)]`: 클립보드에 복사된 탭 구분 텍스트(TSV) 자동 파싱하여 그리드 행으로 변환
  - `[📁 대량 파일 끌어놓기]`: 파일명 내 상품코드 자동 감지 매칭
  - `[🛒 상세페이지 상품 불러오기]`: `shop-detail-page` 내 등록 상품을 원클릭으로 작업표에 로드
- **서브 이미지 모드 토글**:
  - `[옵션 A] 공용 서브 1개 적용`: 1개의 공용 뱃지/아이콘/로고를 모든 행의 메인 이미지에 동일 합성
  - `[옵션 B] 상품별 개별 서브 매칭`: 각 상품코드별 고유 서브 이미지(누끼컷, 연출컷)를 1:1 매칭
- **유효성 검사 요약 알림 바**:
  - 🟢 정상 매칭 (Ready) / 🟠 서브 누락 (Missing Sub) / 🔴 메인 누락 (Missing Main) 카운트 표시
  - `[⚠️ 문제 항목만 필터링 보기]` 버튼으로 오류 행만 즉시 필터링하여 교정 가능
- **데이터 그리드**: 체크박스, 상태 뱃지, 상품코드, 상품명, 메인 썸네일, 서브 썸네일, 옵션, 행별 수정 버튼

### 02. 실시간 미리보기 & 합성 규칙 (`02_preview`)
- **좌측: 1000×1000 라이브 캔버스 뷰파인더**:
  - 선택한 행의 메인+서브 이미지를 1000px 정사각형 캔버스에 실시간 합성 렌더링
  - 마그네틱 9-앵커 가이드라인 오버레이
  - 하단 행 전환 페이저(`‹ 이전 상품`, `다음 상품 ›`)로 작업 대상 실물 즉시 검수
- **우측: 합성 파라미터 조절 데크**:
  - **위치 앵커**: 9방향 셀렉터 (좌상, 상, 우상, 좌, 중앙, 우, 좌하, 하, 우하-기본값)
  - **서브 크기 비율**: `15% ~ 50%` 정밀 슬라이더 (기본 32%)
  - **테두리 마진 & 라운드**: 마진 `0~60px`, 라운드 `0~30px`
  - **외곽선 & 그림자**: 입체 드롭 섀도우, 2px 화이트 아웃라인 체크박스
  - **스마트 파일명 템플릿**: `{prefix}_{sku}_{option}_{role}.{ext}` 실시간 결과명 프리뷰 (`AIM_PROD-KR-1001_화이트Free_main.jpg`)

### 03. 일괄 실행 & 즉시 중단 콘솔 (`03_progress`)
- **상단 헤더 컨트롤 바**:
  - 펄스 애니메이션 인디케이터 + 실시간 진행 타이틀
  - **원클릭 `[⏸️ 전체 일괄 즉시 중단]` 긴급 정지 버튼**
- **실시간 프로그레스 바**: 진행률 퍼센트 게이지
- **4대 메트릭 요약 그리드**:
  - `진행률` (예: 45.0% / 27/60 완료)
  - `처리 속도` (FPS: 초당 처리 프레임수 실시간 계측)
  - `예상 잔여 시간` (남은 시간 카운트다운)
  - `브라우저 메모리 부하` (Canvas 힙 메모리 안전 범위 모니터링)
- **실시간 렌더링 스트림 피드**:
  - 방금 완료된 합성 결과물 썸네일이 실시간으로 스트림 카드에 추가되며 시각적 피드백 제공

### 04. 성공/실패 결과 리포트 & 원래 상품 반환 (`04_result`)
- **최종 결과 요약 히어로 카드**:
  - 총 처리 수, 성공 건수, 실패 건수, 소요 시간 요약
  - `[📦 ZIP 일괄 다운로드]` (개별 파일명 온전히 보존된 압축 파일)
  - `[📊 매핑 결과 CSV 내보내기]` (상품코드, 파일명, 규격, 처리일시 매핑 테이블)
- **원래 상품으로 반환 (P2 핵심 연계) 3단 액션 카드**:
  - `[🛒 상세페이지 (shop-detail-page)]`: 원래 상품의 대표사진 칸으로 58장 자동 덮어쓰기 반환
  - `[🏪 마켓 등록기 (스마트스토어/11번가/쿠팡)]`: 가공된 1000×1000 대표사진을 등록 대기열로 직접 전송
  - `[🏬 쇼핑몰 빌더 (mall-builder)]`: 입점몰/분양몰 상품 카탈로그 대표 이미지로 동기화
- **실패 항목 처리 데스크**:
  - 오류 발생 항목의 SKU, 상품명, 구체적 원인(파일 손상, 해상도 초과 등) 상세 명시
  - **`[🔄 실패 2건만 바로 재시도]`** 원클릭 복구 버튼 제공

---

## 3. 기능 담당(A: Claude `claude-win-sdp`)과의 협업 및 데이터 계약

### 3.1 파일 소유권 및 작업 시간 분리 방안
동일 프로그램(`banana-canvas`) 내 파일 충돌을 방지하기 위해 다음과 같이 소유권을 분리합니다:

| 구분 | 파일 경로 | 주 담당 | 역할 및 작업 내용 |
|---|---|---|---|
| **UI/화면** | `banana-canvas/src/app/(workspace)/batch/page.tsx` | **B (agy)** | 헤더, 안내 문구, 4단계 파이프라인 배너 마크업 |
| **컴포넌트** | `banana-canvas/src/components/batch/BatchPhotoBoard.tsx` | **B (agy)** ➔ **A (Claude)** | B가 4대 화면 UI 레이아웃/스타일링 컴포넌트 래핑 ➔ A가 기능 상태 및 이벤트 바인딩 |
| **신규 모델** | `banana-canvas/src/lib/batch/productBatch.ts` (신규) | **A (Claude)** | 상품코드 작업표 데이터 모델, 메인/서브 매칭 알고리즘, P2 반환 계약 |
| **합성 엔진** | `banana-canvas/src/lib/batch/layout.ts`, `render.ts` | **A (Claude)** | 1000×1000 정사각형 리사이즈, 9-앵커 서브 합성, EXIF 메타데이터 제거 |
| **반환 연계** | `banana-canvas/src/lib/batch/returnAction.ts` (신규) | **A (Claude)** | `shop-detail-page`, 마켓 등록기 대상 반환 API 연동 |

### 3.2 입출력 데이터 계약 (Data Contract)
```typescript
export interface ProductBatchRow {
  id: string;                      // 내부 임의 행 식별자 (uid)
  productId?: string;              // shop-detail-page 내부 상품 ID (P2 반환용)
  sku: string;                    // 상품코드 (외부 식별자, 필수)
  name: string;                   // 상품명
  mainImage: {
    file?: File;
    url?: string;
    width: number;
    height: number;
  } | null;
  subImage: {
    file?: File;
    url?: string;
    isCommon?: boolean;           // 공용 서브 여부
    width: number;
    height: number;
  } | null;
  optionLabel?: string;           // 옵션 구분값
  status: "ready" | "missing_main" | "missing_sub" | "duplicate" | "error";
  errorMessage?: string;
}

export interface BatchCompositeSettings {
  subMode: "common" | "individual";
  commonSubFile?: File | null;
  anchor: "top-left" | "top" | "top-right" | "left" | "center" | "right" | "bottom-left" | "bottom" | "bottom-right";
  subScalePct: number;            // 15 ~ 50%
  marginPx: number;               // 0 ~ 60px
  borderRadiusPx: number;         // 0 ~ 30px
  hasDropShadow: boolean;
  hasOutline: boolean;
  outlineColor: string;
  outputSize: 1000;               // 1000x1000 고정
  outputFormat: "jpg" | "png" | "webp";
  quality: number;                // 90
  filenameTemplate: string;       // "{prefix}_{sku}_{option}_main.jpg"
  stripExif: boolean;             // true
}
```

---

## 4. 디자인 시안 검수 링크 및 자산 안내

저장소 최상위 디자인 지침에 따라 4대 화면 × 3대 시안 = 총 12개 뷰를 구축 완료하였습니다:

1. 🌐 **단일 통합 쇼케이스 웹서버 URL**:  
   - `http://localhost:3800/showcase.html` (3열 그리드 + 1440px 라이트박스)
   - `http://localhost:3800/comparison.html` (상단 종합 비교표)
2. 🎨 **시안별 독립 뷰어 링크**:  
   - ⭐ **1안 (공식 추천)**: [68번 페이퍼 팝 독립 쇼케이스](file:///D:/Antigravity/Design/68_creative_atelier_paper_pop/banana-canvas_batch/showcase_12views.html)
   - **2안**: [104번 네오 B2B 콘솔 독립 쇼케이스](file:///D:/Antigravity/Design/104_neo_b2b_enterprise_console/banana-canvas_batch/showcase_12views.html)
   - **3안**: [62번 나노 뉴럴 랩 독립 쇼케이스](file:///D:/Antigravity/Design/62_nano_neural_art_canvas_lab/banana-canvas_batch/showcase_12views.html)
3. 📁 **로컬 영구 자산 보존 디렉토리**:  
   - `D:\Antigravity\Design\68_creative_atelier_paper_pop\banana-canvas_batch\`
   - `D:\Antigravity\Design\104_neo_b2b_enterprise_console\banana-canvas_batch\`
   - `D:\Antigravity\Design\62_nano_neural_art_canvas_lab\banana-canvas_batch\`
4. 🖼️ **12뷰 풀페이지 조감도 캡처**:  
   - [banana_batch_showcase_full_12views.png](file:///D:/Antigravity/Design/banana_batch_showcase_full_12views.png)

---

## 5. 결함 해결 보고 (2026-11-15 F-09 연결 모드 상품 유실 수정)

- **결함 내용(F-09)**: 상세페이지(`shop-detail-page`) 또는 쇼핑몰(`mall-builder`)에서 1개 이상의 상품을 바나나로 전송했을 때, `setFilesMap` 실행에 의해 파일 모드 짝짓기 `useEffect`가 트리거되어 `setJobs([])`로 상품 목록이 빈 배열로 날아가던 결함.
- **해결 내역**:
  1. `isLinkedMode` 상태를 신설하고 `readProductJob` 수신 시 `true`로 설정.
  2. 파일 모드 짝짓기 `useEffect` 상단에 `if (isLinkedMode || linkedJobId.current) return;` 가드를 배치하여 연결 모드 상품 목록 덮어쓰기 완전 차단.
  3. 일괄 실행 종료 시 조기 도착한 `saved` ACK 상태가 덮어써지지 않도록 `setResults` 병합 로직 보완.
  4. `tests/batchProduct.test.mjs`에 F-09 회귀 방어 단위 테스트 추가 (단위 테스트 98/98 전수 통과, tsc 통과, Next.js Turbopack 빌드 성공).

