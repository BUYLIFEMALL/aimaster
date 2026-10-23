import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { evaluateProgramAccess, checkProgramAccess } from "../src/lib/programAccess.ts";
import { cookieDomainForHost } from "../src/lib/supabase/cookieDomain.ts";
const base = { isAdmin:false, isSuspended:false, hasPhone:true, isFree:false, requiredGradeId:"normal", hasActiveSubscription:false, hasIndividualGrant:false, userGradeSortOrder:1, requiredGradeSortOrder:1 };
test("platform access precedence: suspended/admin/phone/FREE/subscription/grant", () => {
  const run = patch => evaluateProgramAccess({ ...base, ...patch });
  assert.equal(run({ isAdmin:true, isSuspended:true }).allowed, false);
  assert.equal(run({ isAdmin:true, hasPhone:false }).allowed, true);
  assert.equal(run({ isFree:true, hasPhone:false }).reason, "phone_required");
  assert.equal(run({ isFree:true, userGradeSortOrder:null }).allowed, true);
  assert.equal(run({ hasActiveSubscription:true }).allowed, true);
  assert.equal(run({}).allowed, false);
  assert.equal(run({ hasIndividualGrant:true, individualGrantExpiresAt:"2099-01-01" }).allowed, true);
  assert.equal(run({ hasIndividualGrant:true, individualGrantExpiresAt:"2000-01-01" }).allowed, false);
});
test("an unregistered program is denied, including administrators", async () => {
  const query = { select() { return this; }, eq() { return this; }, maybeSingle:async () => ({ data:{ is_admin:true }}), single:async () => ({ data:null }) };
  assert.deepEqual(await checkProgramAccess({ from: () => query }, "member", "markdown-studio"), { allowed:false, reason:"not_found", programId:null });
});
test("SSO cookie domains do not leak to lookalike domains or localhost", () => {
  assert.equal(cookieDomainForHost("markdown-studio.buylife.xyz"), ".buylife.xyz");
  for (const host of ["localhost:3000", "markdown-studio.vercel.app", "buylife.xyz.evil.test", "evilbuylife.xyz"]) assert.equal(cookieDomainForHost(host), undefined);
});
test("the entitlement implementation matches the current platform source", () => {
  assert.equal(readFileSync(new URL("../src/lib/programAccess.ts", import.meta.url),"utf8"), readFileSync(new URL("../../lib/access/checkProgramAccess.ts",import.meta.url),"utf8"));
});
