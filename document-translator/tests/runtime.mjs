import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
const base = process.env.TEST_URL ?? "http://localhost:4389";
const { emptyState } = await import("../src/lib/translation/model.ts");
const input = {
  operationId: randomUUID(),
  kind: "translate",
  options: emptyState().options,
  blocks: [{ id: "b1", text: "원문" }],
};
const paths = ["/api/keys", "/api/projects", "/api/glossaries"];
for (const path of paths) {
  const r = await fetch(base + path);
  assert.equal(r.status, 503);
  assert.match(r.headers.get("cache-control"), /private, no-store/);
  assert.match((await r.json()).error, /회원 연결/);
}
let r = await fetch(base + "/api/ai", {
  method: "POST",
  headers: { Origin: base, "Content-Type": "application/json" },
  body: JSON.stringify(input),
});
assert.equal(r.status, 503);
assert.match((await r.json()).error, /회원 연결/);
r = await fetch(base + "/api/ai", {
  method: "POST",
  headers: {
    Origin: "https://untrusted.example",
    "Content-Type": "application/json",
  },
  body: JSON.stringify(input),
});
assert.equal(r.status, 403);
r = await fetch(base + "/api/ai", {
  method: "POST",
  headers: { Origin: base, "Content-Type": "text/plain" },
  body: JSON.stringify(input),
});
assert.equal(r.status, 415);
r = await fetch(base + "/api/ai", {
  method: "POST",
  headers: { Origin: base, "Content-Type": "application/json" },
  body: JSON.stringify({ ...input, userId: randomUUID() }),
});
assert.equal(r.status, 400);
r = await fetch(base + "/dashboard", { redirect: "manual" });
assert.equal(r.status, 307);
assert.equal(r.headers.get("location"), "/setup");
console.log(
  "PASS 8 production-runtime boundaries: fail-closed config, private caching, origin, format, ownership, workspace gate. No external AI called.",
);
