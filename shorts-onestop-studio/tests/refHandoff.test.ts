// 로그인 경유 넘겨받기 보관·1회 꺼내기·이동 판정 시험 — 2026-11-20 영상 담당(MOV-ONESTOP-HANDOFF-UNICODE). 네트워크·브라우저 없음.
// 흐름: 로그인 화면이 주소 # 뒤를 sessionStorage에 보관 → 로그인 뒤 /topic → 주제 화면이 꺼내 쓰고 바로 지움(src/lib/refHandoff.ts)
// 실행: node --test tests/refHandoff.test.ts
import test from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";

// 앱 코드는 확장자 없는 상대 경로(Next 방식)라 시험에서만 `./x` → `./x.ts`로 찾게 한다(YVS creatorFinder 시험과 같은 방식)
registerHooks({
  resolve(specifier, context, next) {
    try {
      return next(specifier, context);
    } catch (err) {
      if (specifier.startsWith(".") && !/\.[a-z]+$/i.test(specifier)) return next(`${specifier}.ts`, context);
      throw err;
    }
  },
});

// 가짜 sessionStorage(탭 저장소)
class FakeStorage {
  map = new Map<string, string>();
  fail = false;
  getItem(k: string) { if (this.fail) throw new Error("blocked"); return this.map.has(k) ? this.map.get(k)! : null; }
  setItem(k: string, v: string) { if (this.fail) throw new Error("blocked"); this.map.set(k, String(v)); }
  removeItem(k: string) { if (this.fail) throw new Error("blocked"); this.map.delete(k); }
}
const store = new FakeStorage();
(globalThis as unknown as { sessionStorage: FakeStorage }).sessionStorage = store;

const rh = await import("../src/lib/refHandoff.ts");
const ps = await import("../src/lib/productShorts.ts");
const reset = () => { store.map.clear(); store.fail = false; };

const longHash = ps.productHandoffHash(
  { name: "가".repeat(100), points: ["나".repeat(60), "다".repeat(60), "라".repeat(60)], offer: "마".repeat(80) },
  "AI 상세페이지 자동화",
) + ps.productExtraHash({ id: "p_1", desc: "설".repeat(300), option: "옵".repeat(60) });

test("로그인 화면: 긴 상품 넘기기를 그대로 보관하고, 로그인 뒤 /topic으로 보낼 대상이 된다", () => {
  reset();
  assert.ok(longHash.length > 2500, `긴 주소(${longHash.length}자)`);
  assert.equal(rh.hasStashedRefHandoff(), false);
  assert.equal(rh.stashProductHandoff(longHash), true);
  assert.equal(store.getItem("onestop-product-handoff"), longHash, "주소 # 그대로 보관");
  assert.equal(rh.hasStashedRefHandoff(), true, "보관분이 있으면 로그인 뒤 /topic");
});

test("주제 화면: 보관분을 한 번만 꺼내고(바로 지움) 값이 그대로 온다", () => {
  reset();
  rh.stashProductHandoff(longHash);
  const first = rh.takeProductHandoffResult("");
  assert.equal(first.status, "ok");
  if (first.status !== "ok") return;
  assert.equal(first.product.name, "가".repeat(100));
  assert.deepEqual(first.product.points, ["나".repeat(60), "다".repeat(60), "라".repeat(60)]);
  assert.equal(first.product.offer, "마".repeat(80));
  assert.equal(first.from, "AI 상세페이지 자동화");
  assert.equal(first.extra.desc, "설".repeat(300));
  assert.equal(first.extra.option, "옵".repeat(60));
  assert.equal(first.extra.id, "p_1");
  assert.equal(store.getItem("onestop-product-handoff"), null, "꺼낸 뒤 보관분 삭제");
  assert.equal(rh.takeProductHandoffResult("").status, "none", "두 번째는 없음(1회만)");
  assert.equal(rh.hasStashedRefHandoff(), false);
});

test("주소에 # 가 있으면 보관분보다 주소를 먼저 쓰고, 보관분은 지운다", () => {
  reset();
  rh.stashProductHandoff(ps.productHandoffHash({ name: "보관분", points: [], offer: "" }));
  const r = rh.takeProductHandoffResult(ps.productHandoffHash({ name: "주소분", points: [], offer: "" }));
  assert.equal(r.status === "ok" && r.product.name, "주소분");
  assert.equal(store.getItem("onestop-product-handoff"), null);
});

test("예전 함수 takeProductHandoff도 같은 값(하위 호환)", () => {
  reset();
  rh.stashProductHandoff(longHash);
  const r = rh.takeProductHandoff("");
  assert.equal(r?.product.name, "가".repeat(100));
  assert.equal(r?.extra.desc.length, 300);
});

test("깨진 넘기기(상품명 잘림): 보관했다가 주제 화면에서 「broken」 — 안내 한 줄용, 칸은 채우지 않음", () => {
  reset();
  const broken = "#product-name=%EB%AC%BC%EB";
  assert.equal(rh.isBrokenProductHandoff(broken), true);
  assert.equal(rh.stashProductHandoff(broken), true, "로그인 뒤 안내하려고 보관");
  assert.equal(rh.hasStashedRefHandoff(), true);
  assert.deepEqual(rh.takeProductHandoffResult(""), { status: "broken" });
  assert.equal(rh.takeProductHandoff(broken), null, "예전 함수는 여전히 null(값을 지어내지 않음)");
  assert.match(rh.BROKEN_PRODUCT_HANDOFF_NOTICE, /읽지 못했습니다/);
});

test("상품 넘기기가 아닌 주소는 보관하지 않고 「none」", () => {
  reset();
  for (const h of ["", "#", "#ref-transcript=abc", "#product-point=a", "#x=1"]) {
    assert.equal(rh.stashProductHandoff(h), false, h);
    assert.equal(rh.isBrokenProductHandoff(h), false, h);
  }
  assert.equal(rh.hasStashedRefHandoff(), false);
  assert.deepEqual(rh.takeProductHandoffResult("#x=1"), { status: "none" });
});

test("저장소를 못 쓰는 브라우저: 예외 없이 지나가고 꺼낼 것도 없다", () => {
  reset();
  store.fail = true;
  assert.equal(rh.stashProductHandoff(longHash), true, "주소 모양은 맞음(보관만 실패)");
  assert.equal(rh.hasStashedRefHandoff(), false);
  assert.deepEqual(rh.takeProductHandoffResult(""), { status: "none" });
  const direct = rh.takeProductHandoffResult(longHash);
  assert.equal(direct.status, "ok", "주소에 직접 있으면 저장소 없이도 받음");
});

test("대사 넘기기: 경계 이모지에서도 멈추지 않고 보관·꺼내기", async () => {
  reset();
  const ref = await import("../src/lib/reference.ts");
  const text = "가".repeat(ref.REF_HANDOFF_MAX - 1) + "😀";
  const hash = ref.refHandoffHash(text, "가".repeat(39) + "😀");
  assert.equal(rh.stashRefHandoff(hash), true);
  assert.equal(rh.hasStashedRefHandoff(), true);
  const got = rh.takeRefHandoff("");
  assert.equal(got.text, "가".repeat(ref.REF_HANDOFF_MAX - 1));
  assert.equal(got.from, "가".repeat(39));
  assert.equal(rh.takeRefHandoff("").text, "", "1회만");
});

test("A2 참조 대사·대사 보낸 곳의 고립 반쪽(앞·가운데·끝) — 보내기 예외 없음, 보관·꺼내기 왕복에 고립 없음, 정상 이모지 보존", async () => {
  const ref = await import("../src/lib/reference.ts");
  const HI = String.fromCharCode(0xd83d), LO = String.fromCharCode(0xde00), SMILE = "😀";
  const lone = (s: string) => /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/.test(s);
  for (const bad of [HI, LO]) {
    for (const [text, from] of [[`${bad}대사입니다${SMILE}`, `${bad}보낸곳`], [`대사${bad}입니다${SMILE}`, `보낸${bad}곳`], [`대사입니다${SMILE}${bad}`, `보낸곳${bad}`]]) {
      reset();
      let hash = "";
      assert.doesNotThrow(() => { hash = ref.refHandoffHash(text, from); });
      assert.equal(rh.stashRefHandoff(hash), true);
      const got = rh.takeRefHandoff("");
      assert.equal(got.text, `대사입니다${SMILE}`);
      assert.equal(got.from, "보낸곳");
      assert.equal(lone(got.text) || lone(got.from), false);
    }
  }
});

test("A2 상품 넘기기 보관·꺼내기에서도 고립 반쪽이 없고 손상 안내 판정은 그대로", async () => {
  const HI = String.fromCharCode(0xd83d);
  reset();
  const hash = ps.productHandoffHash({ name: `물병${HI}😀`, points: [`가볍다${HI}`], offer: "" }, `보낸${HI}곳`);
  assert.equal(rh.stashProductHandoff(hash), true);
  const r = rh.takeProductHandoffResult("");
  assert.equal(r.status, "ok");
  if (r.status === "ok") {
    assert.equal(r.product.name, "물병😀");
    assert.deepEqual(r.product.points, ["가볍다"]);
    assert.equal(r.from, "보낸곳");
  }
  reset();
  assert.equal(rh.stashProductHandoff("#product-name=%ED%A0%BD"), true);
  assert.deepEqual(rh.takeProductHandoffResult(""), { status: "broken" }, "깨진 상품명은 여전히 안내 대상");
});
