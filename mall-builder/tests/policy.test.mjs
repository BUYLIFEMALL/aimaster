import { test } from "node:test";
import assert from "node:assert/strict";
import { designPolicy, enforceFooter } from "../src/lib/builder/policy.ts";
import { DEFAULT_FOOTER } from "../src/lib/builder/frame.ts";

test("일반(본사·독립) 몰은 모두 열림", () => {
  for (const kind of ["standard", undefined, null, "unknown"]) {
    const p = designPolicy({ kind });
    assert.equal(p.footerBank, true);
    assert.deepEqual(p.notes, []);
    assert.equal(enforceFooter(p, { ...DEFAULT_FOOTER, show_bank: false }).show_bank, false);
  }
});

test("분양몰은 입금 계좌 칸 잠금 — 숨김으로 보내도 늘 보임으로 저장", () => {
  const p = designPolicy({ kind: "resale" });
  assert.equal(p.footerBank, false);
  assert.match(p.notes[0], /분양몰/);
  const f = enforceFooter(p, { ...DEFAULT_FOOTER, show_bank: false, note: "안내" });
  assert.equal(f.show_bank, true);
  assert.equal(f.note, "안내");
});
