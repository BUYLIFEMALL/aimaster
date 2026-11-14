# 프로셀 쇼핑몰 화면 모듈 구조 분석 (공개 화면, 2026-11-14)

- 작성: [역할: mall-design-builder] `claude-win-20261114-mall-design`
- 주인님 지시: 「기존 프로셀 어떤 식으로 모듈화해 놓고 작업했는지 자세히 분석한 후에 작업할 수 있도록 해」
- 대상: https://aimastermall.prosell.kr/ 공개 화면 7개(첫 화면·상품 상세 `/products/96`·목록 `/category/best`·장바구니·공지·로그인·모바일 `/m/`). **로그인 없이 읽기만**, 화면 HTML과 공개 스크립트·스킨 파일의 이름·설정 칸만 확인(코드 복사 없음, 외부 스크립트 실행 없음 — 설정값은 JSON으로만 읽음).
- 원자료(저장소 밖): 세션 임시 폴더 `scratchpad/prosell/`(HTML 7개·스크립트 10여 개).
- 관리자 디자인 편집기 쪽은 주인님 로그인 뒤 [작업표](../DESIGN_BUILDER_TRACKER.md) D0-1·D0-2에서 보완.
- 권리: 다른 회사 상용 프로그램 → 구조·동작만 참고해 새로 만든다(CLAUDE.md 원칙 21).

## 1. 큰 그림 — 모듈이 세 층으로 나뉜다
| 층 | 프로셀 | 단위 | 바꿀 수 있는 것 |
|---|---|---|---|
| 1. 공통 틀(template) | `skin/{pc|m}/template/basic/` (header.css·footer.css·side.css) | 모든 화면에 같이 붙음 | 편집 구역 6종: 띠·광고 **banner**, 메뉴 **menu**(상단 A·주 메뉴·하단 A·B), **logo**, 상점 정보 **shop**, 입금 계좌 **bank**, 하단 아이콘 **ticon** |
| 2. 화면 종류(page skin) | `skin/{pc|m}/{account·cart·category·member·private·products·receipt·search·review}/basic/` | 화면 종류마다 스킨 **한 벌(basic)** | 스킨은 못 고르고, **켜고 끄는 표시 설정**으로 바꿈 |
| 3. 첫 화면 블록(main item) | `skin/{pc|m}/main/{showwindow·banner·bbs}/{스킨id}/` (css/common.css + js/common.js) | 블록 하나 = 종류 + 스킨 | 블록마다 **스킨 여러 벌** 중 고름 + 공통 설정 칸 |

- 각 화면은 필요한 스킨의 CSS·JS만 불러온다(첫 화면은 쓰인 블록 스킨 7벌만).
- 색·글꼴은 화면 전체 CSS 변수(`root.css`): `--color1/2`(포인트색)·`--rgb-color1`·`--bgcolor`·`--main-width:1200px`·`--layout-width:1260px`·`--family-light/regular/medium/bold`·`--weight-*`·아이콘 그림 변수.

## 2. 첫 화면 블록 모듈의 약속(가장 중요)
### 2-1. 블록 목록 데이터 `MAIN_OPTIONS`
```
skins : [{ id:"2_210702s", it_type:"2", it_skin:"210702s", folder:"banner" }, …]   // 이 화면에서 쓰는 스킨 목록(불러올 CSS·JS)
items : { "1": 쇼윈도 목록, "2": 배너 목록, "3": 게시물 목록, "4": 콘텐츠 목록 }   // 각 { id, it_section(구역 번호), it_num, it_title }
popup : [첫 화면 팝업]
```
- 블록 종류 번호: 1 쇼윈도(`showwindow`) · 2 메인 배너(`banner`) · 3 게시물(`bbs`) · 4 콘텐츠(HTML·iframe).
- 이 몰 실제: 쇼윈도 2 · 배너 4 · 게시물 1 · 콘텐츠 0, 쓰인 스킨 7벌(`210702s`·`190812m`·`190802s`·`210703m`·`200901m`·`200902m`·`190701r`).

### 2-2. 블록 하나의 공통 설정 칸(모든 종류가 같은 칸을 가짐)
| 칸 | 뜻 |
|---|---|
| `it_type`·`it_skin`·`it_section`·`it_num` | 종류·스킨·구역 순서·같은 구역 안 순서 |
| `it_title`·`it_url` | 블록 제목·제목 링크 |
| `it_t_type`·`it_t_align`·`it_t_color`·`it_t_family`·`it_t_size`·`it_t_spacing` | 제목 꾸밈(없음/글자/그림, 정렬·색·글꼴·크기·자간) |
| `it_width` | 전체 폭(100%) / 본문 폭(1200px) |
| `it_b_width`·`it_b_height` | 배너·칸 크기 |
| `it_rows_x`·`it_rows_y`·`it_limit` | 가로 칸 수·세로 줄 수·최대 개수 |
| `it_time` | 넘김 시간 |
| `it_bg_color`·`it_bg_file` | 배경색·배경 그림 |
| `it_other` | 종류별 기타 |
| `view1`~`view7` | 상품 카드에 보일 항목 켜기/끄기(할인율·배지·브랜드·상품명·판매가·정가 등) |
| 구역 상자 `padding-top/bottom` | 위아래 여백(구역마다) |

### 2-3. 스킨 = 이름으로 등록된 그리기 모듈
- 스킨 스크립트 하나가 `m_<종류폴더>_<스킨id>` 이름으로 자기를 등록한다(예: `m_showwindow_200902m`, `m_banner_210702s`, `m_bbs_190701r`).
- 화면은 블록마다 「종류_스킨」 이름으로 그 모듈을 불러 **공통 설정 칸 전체**를 넘기고, 스킨은 그중 **필요한 칸만** 읽는다(배너 스킨은 크기·제목·넘김 시간, 쇼윈도 스킨은 칸 수·개수·view1~7).
- 스킨 id 끝 글자: `s`·`m`·`r`(추정: 한 장/여러 장/게시물 계열) — 날짜형 id라 이름만으로 모양을 알 수 없다.
- PC와 모바일이 **스킨을 따로 고른다**(모바일 첫 화면은 `200402m`·`210801s`·`190801m`·`190802m` 등 다른 스킨).

## 3. 화면 종류 모듈 — 스킨 한 벌 + 표시 설정
### 3-1. 상품 상세 `PRODUCTS_OPTIONS`(데이터와 표시 설정이 한 객체)
- 표시 설정 예: `gallery`·`share`·`sideoption`(옆 옵션창)·`detail_type`·영역 켜기 `description_mode`·`information_mode`·`delivery_mode`·`return_mode`·`as_mode`·`header_mode`·`video`, 보기 옵션 `order_time_view`·`time_sale_view`·`option_thumb_view`·`image_round`·`summary_view`·`wish_view`·`naverpay_view`·`kakaopay_view`·`search_keyword_view`·`image_overflow_hidden`·`products_image_open`.
- 데이터 칸(가격·옵션·배송·쿠폰·후기·문의·재고 알림 등)이 같은 객체에 섞여 있다.

### 3-2. 목록(카테고리)
- 스킨 `category/basic` 안에 공통 부분(`skin-base.js`)과 **보기 방식별 그리기 파일**(`skin-list-0.js` 바둑판형 / `skin-list-1.js` 목록형)이 따로 있다.
- 상품은 화면을 연 뒤 스크립트가 불러와 그린다. 카드 한 장이 쓰는 값: 정가·판매가·할인율·후기 수·후기 점수·판매 수량·배송비·공급사 이름·아이콘·성인·주문 상태.

## 4. 편집 모드와 모듈의 관계(`sst`)
- 관리자로 보면 모든 모듈 상자에 `data-sst-item`(종류)·`data-sst-id`가 붙고, 그 위에 편집 단추가 뜬다 → **모듈 단위 = 편집 단위**.
- 첫 화면 순서 바꾸기는 구역 id 목록을 보내 즉시 저장, 고친 뒤에는 서버가 다시 그린 첫 화면과 새 스킨 CSS·JS를 받아 통째로 갈아 끼운다(초안 없음).

## 5. 장단점
| 좋은 점(가져올 것) | 약한 점(우리가 낫게 할 것) |
|---|---|
| 블록 종류가 달라도 **공통 설정 칸 하나** → 편집 칸·저장 구조가 단순 | 즉시 저장 — 실수가 바로 손님 화면에 나감 |
| 스킨 = 이름으로 등록된 모듈 → 스킨 추가가 파일 추가만으로 끝남 | 스킨 id가 날짜라 이름만 보고 모양을 모름 |
| 화면 종류는 스킨 한 벌 + 켜고 끄기 → 유지보수 쉬움 | PC·모바일 스킨·설정을 두 번 관리 |
| 쓰인 스킨만 불러옴 → 가벼움 | 데이터와 표시 설정이 한 객체에 섞임 |
| 공통 틀 6개 구역으로 헤더·바닥글 편집 범위가 분명 | jQuery로 화면을 통째로 갈아 끼움 → 편집 중 상태가 쉽게 깨짐 |

## 6. 우리 빌더 설계에 반영할 것 (→ [플랜](../PLAN_20261114_DESIGN_BUILDER.md) §3-6)
| 프로셀 구조 | 우리 구현 |
|---|---|
| 블록 공통 설정 칸 | `blocks.ts` 블록마다 공통 `style`(여백·폭·배경색/그림·PC/휴대폰 보이기) + 공통 `title`(제목 글·정렬·크기·색·링크) 두 묶음. 종류별 `settings`는 지금처럼 |
| 스킨 = 이름 등록 모듈 | 블록 종류마다 **모양(variant) 등록표**: `{ id: "showcase.grid", label: "바둑판 4칸", Component }`. 블록에 `variant` 칸(없으면 기본) — 이름은 읽을 수 있게(날짜형 금지) |
| `view1~7` 카드 항목 켜기 | 상품 카드 표시 묶음 `card: { discount, badge, brand, name, price, list_price, review }` — 쇼윈도·탭·타임세일·목록이 같은 카드 컴포넌트를 씀 |
| 화면 종류 = 스킨 한 벌 + 켜고 끄기 | D4: 목록·상세는 「모양 고르기」 대신 **표시 설정 묶음**(상세: 갤러리·공유·옆 옵션창·영역 켜기·찜·둥근 사진·요약 / 목록: 보기 방식·열 수·정렬 기본) |
| 목록 보기 방식 파일 분리 | 목록 카드 모양 variant(바둑판·목록형) |
| 공통 틀 6구역 | D3 헤더·바닥글 구역: 띠 배너·메뉴·로고·상점 정보(법정, 잠금)·입금 계좌·하단 아이콘 |
| 쓰인 스킨만 불러옴 | 블록 모양 컴포넌트는 Next 동적 불러오기로 쓰인 것만 |
| PC/모바일 따로 | 반응형 한 벌 + 블록별 PC/휴대폰 보이기(필요하면 휴대폰 전용 variant 칸 — 확장) |
| 즉시 저장·통째 갈아 끼우기 | 초안→게시, 편집 중엔 React 상태(Puck)로 화면 일부만 다시 그림 |
| 데이터+표시 설정 섞임 | 표시 설정은 디자인 문서(`mall_builder_pages`), 데이터는 기존 표 — 분리 유지 |
