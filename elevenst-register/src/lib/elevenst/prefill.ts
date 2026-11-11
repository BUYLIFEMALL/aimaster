// 상세페이지 자동화(shop_products) 정보로 11번가 등록 칸을 미리 채우는 규칙(AI 없이 이름 맞추기, 화면·서버 공용 순수 함수).
// - specs: 상세페이지 「상품 정보」 줄글(예: 「품명: 스위스톤 여행백팩\r\n품번: ST4D18\r\n소재: 폴리에스테르」)
// - 고시 유형은 11번가 카테고리 경로(없으면 상세페이지 카테고리)로 고르고, 항목 값은 specs에서 찾는다. 못 찾은 항목은 기본 「상품상세설명 참조」.
import { DEFAULT_NOTI_TYPE, NOTI_DEFAULT_VALUE, NOTI_TYPES, type NotiType } from "./notification.ts";

const NOTI_MAX = 50; // 고시 항목당 50자(화면 안내와 같음)

const key = (s: string) => s.replace(/[\s()]/g, "").toLowerCase();

/** 「이름: 값」 줄을 읽는다. 같은 이름이 두 번이면 처음 것 */
export function parseSpecs(text: string | null | undefined): Map<string, string> {
  const out = new Map<string, string>();
  for (const line of (text ?? "").split(/\r?\n/)) {
    const m = line.match(/^\s*[-•·*]?\s*([^:：]{1,20}?)\s*[:：]\s*(.+?)\s*$/);
    if (!m) continue;
    const k = key(m[1]);
    if (k && !out.has(k)) out.set(k, m[2]);
  }
  return out;
}

const SYN = {
  brand: ["브랜드"],
  itemName: ["품명", "제품명", "상품명"],
  model: ["품번", "모델명", "모델"],
  color: ["색상", "컬러", "색"],
  material: ["소재", "재질", "원단", "주소재", "겉감"],
  origin: ["제조국", "원산지", "생산국"],
  maker: ["제조사", "제조자", "제조원", "수입자", "수입원", "제조자/수입자"],
  size: ["사이즈", "크기", "치수", "규격"],
  capacity: ["용량"],
  weight: ["중량", "무게"],
  kind: ["종류"],
} as const;

function pick(specs: Map<string, string>, names: readonly string[]): string {
  for (const n of names) {
    const v = specs.get(key(n));
    if (v) return v;
  }
  return "";
}

const join = (...xs: string[]) => xs.filter(Boolean).join(" / ");
const clip = (s: string) => ([...s].length > NOTI_MAX ? [...s].slice(0, NOTI_MAX).join("") : s);

/** 브랜드·원산지(제조국) 미리 채움 — 없으면 빈 문자열 */
export function prefillBasics(specs: Map<string, string>): { brand: string; origin: string } {
  return { brand: pick(specs, SYN.brand), origin: pick(specs, SYN.origin) };
}

// 카테고리 낱말 → 고시 유형 이름(위에서부터 먼저 맞는 것). 「골프의류」는 의류, 「책상」은 가구가 먼저 걸리도록 순서를 둔다.
const TYPE_RULES: [RegExp, string][] = [
  [/가방|백팩|배낭|캐리어|크로스백|토트백|숄더백|클러치/, "가방"],
  [/신발|구두|운동화|스니커즈|샌들|슬리퍼|부츠|로퍼/, "구두/신발"],
  [/시계|주얼리|귀걸이|목걸이|반지|팔찌|귀금속/, "귀금속/보석/시계류"],
  [/의류|티셔츠|셔츠|블라우스|바지|팬츠|청바지|원피스|아우터|자켓|재킷|코트|점퍼|니트|스커트|속옷|잠옷|언더웨어|레깅스/, "의류"],
  [/모자|벨트|장갑|스카프|머플러|양말|액세서리|지갑|선글라스|넥타이|패션잡화/, "패션잡화 (모자 / 벨트 / 액세서리 등)"],
  [/침구|이불|베개|커튼|블라인드/, "침구류/커튼"],
  [/가구|침대|소파|책상|의자|수납장|선반|서랍장/, "가구 (침대 / 소파 / 싱크대 / DIY제품 등)"],
  [/주방|조리|냄비|프라이팬|식기|텀블러|밀폐용기|수저|도마|보온컵/, "주방용품"],
  [/화장품|스킨케어|메이크업|향수|클렌징|선케어|바디케어|헤어케어/, "화장품"],
  [/유아|아동|어린이|완구|장난감|키즈|출산/, "어린이제품"],
  [/자동차|차량용|카용품/, "자동차용품 (자동차부품 / 기타 자동차용품 등)"],
  [/스포츠|골프|등산|캠핑|헬스|요가|자전거|낚시|수영/, "스포츠용품"],
  [/건강기능식품|영양제|비타민|유산균/, "건강기능식품"],
  [/과일|채소|정육|수산|쌀|농산물|축산/, "농수축산물"],
  [/식품|과자|음료|커피|라면|간식|소스|조미료/, "가공식품"],
  [/세제|섬유유연제|방향제|탈취제|표백제/, "생활화학제품"],
  [/도서|서적/, "서적"],
  [/악기|피아노|우쿨렐레/, "악기"],
];

/** 카테고리 경로(11번가 우선, 없으면 상세페이지)로 고시 유형 코드를 고른다. 못 고르면 「기타 재화」 */
export function guessNotiType(...paths: (string | null | undefined)[]): string {
  for (const path of paths) {
    if (!path) continue;
    for (const [re, name] of TYPE_RULES) {
      if (re.test(path)) return NOTI_TYPES.find((t) => t.name === name)?.type ?? DEFAULT_NOTI_TYPE;
    }
  }
  return DEFAULT_NOTI_TYPE;
}

/** 고시 항목 이름별 값 — specs에서 찾은 것만(나머지는 화면이 기본값으로 채움) */
function valueFor(itemName: string, specs: Map<string, string>, leafCategory: string): string {
  const n = itemName.replace(/\s/g, "");
  if (n === "색상") return pick(specs, SYN.color);
  if (/^(소재|재질|제품소재|주요소재|제품주소재)$/.test(n)) return pick(specs, SYN.material);
  if (n === "제조국") return pick(specs, SYN.origin);
  if (n === "제조자/수입자") return pick(specs, SYN.maker);
  if (n === "품명및모델명") return join(pick(specs, SYN.itemName), pick(specs, SYN.model));
  if (n === "품명") return pick(specs, SYN.itemName);
  if (n === "크기,용량,형태") return join(pick(specs, SYN.size), pick(specs, SYN.capacity));
  if (n === "치수") return pick(specs, SYN.size);
  if (n === "크기,무게") return join(pick(specs, SYN.size), pick(specs, SYN.weight));
  if (n === "중량" || n === "내용물의용량또는중량") return pick(specs, SYN.weight) || pick(specs, SYN.capacity);
  if (n === "종류") return pick(specs, SYN.kind) || leafCategory;
  return "";
}

/** 고시 유형 하나에 대해 항목 코드 → 값(못 찾으면 「상품상세설명 참조」). 채워진 항목 수도 돌려준다 */
export function prefillNoti(type: NotiType, specs: Map<string, string>, leafCategory = ""): { values: Record<string, string>; filled: number } {
  const values: Record<string, string> = {};
  let filled = 0;
  for (const [code, name] of type.items) {
    const v = clip(valueFor(name, specs, leafCategory).trim());
    if (v) filled++;
    values[code] = v || NOTI_DEFAULT_VALUE;
  }
  return { values, filled };
}
