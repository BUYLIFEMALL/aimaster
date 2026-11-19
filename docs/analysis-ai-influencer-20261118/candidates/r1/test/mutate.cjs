// 변형 검사: 고친 파일의 핵심 줄을 하나씩 망가뜨리고 시험이 빨강이 되는지 본다. 끝나면 원래대로 되돌린다.
const fs = require("fs"); const { spawnSync } = require("child_process");
const S = "insta_auto_poster/src/lib/cardnews/instagram/memberScheduler.ts", P = "ai-webtoon-studio/src/lib/instagram/posting.ts", R = "ai-webtoon-studio/src/app/api/instagram/dispatch/route.ts";
const M = [
  ["유효 방식 판정 제거", S, 'if (POLICY && mode === "vercel" && !(await platformChoiceEffective(service, userId))) return "cronjob";', ""],
  ["기본 방식에 연결점 미반영", S, 'POLICY?.defaultMode ?? (SCHEDULER_IS_STANDALONE', '(SCHEDULER_IS_STANDALONE'],
  ["판정 실패를 허용으로", S, 'try { return (await POLICY.allowed(service, userId)) === true; } catch { return false; }', 'try { return (await POLICY.allowed(service, userId)) === true; } catch { return true; }'],
  ["명시 확인 건너뜀", S, 'if (!POLICY.confirmed) return true;', 'return true;'],
  ["Vercel 바꾸기 권한 확인 제거", S, 'if (!(await memberPlatformAllowed(service, userId))) throw new Error("이 계정은', 'if (false) throw new Error("이 계정은'],
  ["명시 기록을 남기지 않음", S, 'if (POLICY.markConfirmed) await POLICY.markConfirmed(service, userId);', ''],
  ["키 삭제가 vercel로 되돌림", S, '!options.keepMode && !POLICY && platformSchedulerEnabled()', '!options.keepMode && platformSchedulerEnabled()'],
  ["예약 때 행을 cronjob으로 안 맞춤", S, 'POLICY ? { mode: "cronjob", active: true, updated_at: now() } : { active: true, updated_at: now() }', '{ active: true, updated_at: now() }'],
  ["연결점 없는 앱에도 행을 cronjob으로 씀", S, 'POLICY ? { mode: "cronjob", active: true, updated_at: now() } : { active: true, updated_at: now() }', '{ mode: "cronjob", active: true, updated_at: now() }'],
  ["연결점 없는 앱 응답에 새 칸", S, 'let extra: { platformAllowed?: boolean; platformReselectNeeded?: boolean } = {};', 'let extra: { platformAllowed?: boolean; platformReselectNeeded?: boolean } = { platformAllowed: true };'],
  ["범위에서 일시정지 미제외", S, '.eq("mode", "vercel").eq("paused", false).in("user_id", allowedIds)', '.eq("mode", "vercel").in("user_id", allowedIds)'],
  ["범위에서 방식 미확인", S, '.eq("mode", "vercel").eq("paused", false).in("user_id", allowedIds)', '.eq("paused", false).in("user_id", allowedIds)'],
  ["목록 실패 때 전원 처리", S, 'try { allowedIds = await POLICY.listAllowedUserIds(service); } catch { return none; }', 'try { allowedIds = await POLICY.listAllowedUserIds(service); } catch { return { excludeUserIds: [] }; }'],
  ["처리 직전 권한 재확인 생략", S, "      return platformChoiceEffective(service, userId);", "      return true;"],
  ["처리 직전 일시정지 미확인", S, 'if (!row || row.mode !== "vercel" || row.paused) return false;', 'if (!row || row.mode !== "vercel") return false;'],
  ["연결점 없는 앱의 범위가 빈 제외 목록", S, 'if (!POLICY) return { excludeUserIds: await membersExcludedFromPlatform(service) };', 'if (!POLICY) return { excludeUserIds: [] };'],
  ["빈 허용 목록인데 전체 조회", P, 'if (options.onlyUserIds && !options.onlyUserIds.length) return [];', ''],
  ["허용 목록 조건 누락", P, 'if (options.onlyUserIds) query = query.in("user_id", options.onlyUserIds);', ''],
  ["재확인 거짓인데 처리", P, 'if (!allowedNow) { results.push({ id: post.id, status: "skipped" }); continue; }', ''],
  ["재확인 실패를 허용으로", P, '} catch { allowedNow = false; }', '} catch { allowedNow = true; }'],
  ["경로가 범위를 넘기지 않음", R, '...(await platformDispatchScope(createAdminClient() as unknown as SupabaseClient)),', ''],
];
let red = 0; const green = [];
for (const [name, file, find, rep] of M) {
  const src = fs.readFileSync(file, "utf8");
  if (src.split(find).length !== 2) { console.log("자리 없음: " + name); process.exitCode = 1; continue; }
  fs.writeFileSync(file, src.replace(find, () => rep));
  const r = spawnSync(process.execPath, ["--import", "./test/register.mjs", "--test", "test/r1.test.mjs"], { encoding: "utf8" });
  fs.writeFileSync(file, src);
  if (r.status !== 0) red += 1; else green.push(name);
}
console.log(`변형 ${M.length}개 중 빨강 ${red}개` + (green.length ? " · 못 잡음: " + green.join(" / ") : ""));
