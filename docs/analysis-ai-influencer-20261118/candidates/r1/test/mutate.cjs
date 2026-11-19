// 변형 검사(2판): 고친 파일의 핵심 줄을 하나씩 망가뜨리고 시험이 빨강이 되는지 본다. 끝나면 원래대로 되돌린다.
const fs = require("fs"); const { spawnSync } = require("child_process");
const S = "insta_auto_poster/src/lib/cardnews/instagram/memberScheduler.ts", P = "ai-webtoon-studio/src/lib/instagram/posting.ts", R = "ai-webtoon-studio/src/app/api/instagram/dispatch/route.ts";
const M = [
  ["유효 방식 판정 제거", S, 'if (POLICY && mode === "vercel" && !(await platformEffective(service, userId, row))) return "cronjob";', ""],
  ["기본 방식에 연결점 미반영", S, "POLICY?.defaultMode ?? (SCHEDULER_IS_STANDALONE", "(SCHEDULER_IS_STANDALONE"],
  ["권한 판정 실패를 허용으로", S, "try { return (await POLICY.allowed(service, userId)) === true; } catch { return false; }", "try { return (await POLICY.allowed(service, userId)) === true; } catch { return true; }"],
  ["명시 선택 없이도 유효", S, 'if (!row || row.mode !== "vercel" || !rowChosePlatform(row)) return false;', 'if (!row || row.mode !== "vercel") return false;'],
  ["관리자 허용 없이도 유효", S, "  return memberPlatformAllowed(service, userId);\n}", "  return true;\n}"],
  ["선택 칸 이름이 없어도 선택으로 봄", S, "if (!POLICY?.choiceColumn || !row) return false;", "if (!row) return false; if (!POLICY?.choiceColumn) return true;"],
  ["연결점 없는 앱의 행 조회 칸이 바뀜", S, ': "user_id, mode, active, paused";', ': "user_id, mode, active, paused, platform_chosen_at";'],
  ["cronjob으로 쓸 때 선택 기록을 안 지움", S, "const clearChoice = (): Record<string, null> => (POLICY?.choiceColumn ? { [POLICY.choiceColumn]: null } : {});", "const clearChoice = (): Record<string, null> => ({});"],
  ["Vercel 바꾸기 권한 확인 제거", S, "if (!POLICY.choiceColumn || !(await memberPlatformAllowed(service, userId))) throw", "if (!POLICY.choiceColumn) throw"],
  ["Vercel 바꾸기에서 선택을 같이 안 씀", S, 'update({ mode: "vercel", active: false, [POLICY.choiceColumn]: now(), updated_at: now() })', 'update({ mode: "vercel", active: false, updated_at: now() })'],
  ["저장 실패를 성공으로", S, 'if (error || !saved?.length) throw new Error("실행 방식을 저장하지 못했습니다. 잠시 뒤 다시 시도해 주세요.");', ""],
  ["갱신된 행 0을 성공으로", S, "if (error || !saved?.length) throw", "if (error) throw"],
  ["작업 끄기를 저장보다 먼저", S, '    const { data: saved, error } = await service.from(SCHEDULER_TABLE).update({ mode: "vercel"', '    if (key) { try { await setDispatchJobEnabled(key, memberDispatchUrl(), false); } catch {} }\n    const { data: saved, error } = await service.from(SCHEDULER_TABLE).update({ mode: "vercel"'],
  ["키 삭제가 방식을 씀(vercel로 되돌림)", S, "...(POLICY ? {} : { mode: !options.keepMode && platformSchedulerEnabled() ? \"vercel\" : row.mode }),", "mode: !options.keepMode && platformSchedulerEnabled() ? \"vercel\" : row.mode,"],
  ["키 삭제가 읽어 둔 옛 방식을 덮어씀", S, "...(POLICY ? {} : { mode: !options.keepMode && platformSchedulerEnabled() ? \"vercel\" : row.mode }),", "mode: POLICY ? row.mode : (!options.keepMode && platformSchedulerEnabled() ? \"vercel\" : row.mode),"],
  ["예약 시작 때 행을 cronjob으로 안 맞춤", S, 'POLICY ? { mode: "cronjob", ...clearChoice(), active: true, updated_at: now() } : { active: true, updated_at: now() }', "{ active: true, updated_at: now() }"],
  ["연결점 없는 앱에도 행을 cronjob으로 씀", S, 'POLICY ? { mode: "cronjob", ...clearChoice(), active: true, updated_at: now() } : { active: true, updated_at: now() }', '{ mode: "cronjob", active: true, updated_at: now() }'],
  ["새 작업을 만든 뒤 방식 재확인 없음", S, '.eq("user_id", userId).eq("mode", "cronjob").select("user_id");\n    if (!still?.length)', '.eq("user_id", userId).select("user_id");\n    if (!still?.length)'],
  ["방식이 바뀌었는데 새 작업을 켠 채 둠", S, "if (!still?.length) await setDispatchJobEnabled(apiKey, url, false).catch(() => undefined);", ""],
  ["되돌리기가 그사이 선택을 덮음", S, 'active: false, updated_at: now() }).eq("user_id", userId).eq("mode", "cronjob");', 'active: false, updated_at: now() }).eq("user_id", userId);'],
  ["되돌리기가 예전 선택 기록을 버림", S, "[POLICY.choiceColumn]: previousChoice, active: false", "[POLICY.choiceColumn]: null, active: false"],
  ["연결점 없는 앱 응답에 새 칸", S, "let extra: { platformAllowed?: boolean; platformReselectNeeded?: boolean } = {};", "let extra: { platformAllowed?: boolean; platformReselectNeeded?: boolean } = { platformAllowed: true };"],
  ["상태가 선택 기록을 안 봄", S, 'if (rowMode === "vercel" && !(allowed && chosen)) mode = "cronjob";', 'if (rowMode === "vercel" && !allowed) mode = "cronjob";'],
  ["다시 고르기 안내 누락", S, 'platformReselectNeeded: allowed && rowMode === "vercel" && !chosen', "platformReselectNeeded: false"],
  ["범위에서 일시정지 미제외", S, '.eq("mode", "vercel").eq("paused", false).not(', '.eq("mode", "vercel").not('],
  ["범위에서 방식 미확인", S, '.eq("mode", "vercel").eq("paused", false).not(', '.eq("paused", false).not('],
  ["범위에서 명시 선택 미확인", S, '.not(POLICY.choiceColumn, "is", null).in("user_id", allowedIds)', '.in("user_id", allowedIds)'],
  ["사이트 스위치 off인데 처리", S, "if (!platformSchedulerEnabled() || !POLICY.choiceColumn) return none;", "if (!POLICY.choiceColumn) return none;"],
  ["목록 실패 때 전원 처리", S, "try { allowedIds = await POLICY.listAllowedUserIds(service); } catch { return none; }", "try { allowedIds = await POLICY.listAllowedUserIds(service); } catch { return { excludeUserIds: [] }; }"],
  ["처리 직전 재확인 생략", S, "      return platformEffective(service, userId, row);", "      return true;"],
  ["처리 직전 일시정지 미확인", S, "if (!row || row.paused || !platformSchedulerEnabled()) return false;", "if (!row || !platformSchedulerEnabled()) return false;"],
  ["처리 직전 사이트 스위치 미확인", S, "if (!row || row.paused || !platformSchedulerEnabled()) return false;", "if (!row || row.paused) return false;"],
  ["연결점 없는 앱의 범위가 빈 제외 목록", S, "if (!POLICY) return { excludeUserIds: await membersExcludedFromPlatform(service) };", "if (!POLICY) return { excludeUserIds: [] };"],
  ["빈 허용 목록인데 전체 조회", P, "if (options.onlyUserIds && !options.onlyUserIds.length) return [];", ""],
  ["허용 목록 조건 누락", P, 'if (options.onlyUserIds) query = query.in("user_id", options.onlyUserIds);', ""],
  ["재확인 거짓인데 처리", P, 'if (!allowedNow) { results.push({ id: post.id, status: "skipped" }); continue; }', ""],
  ["재확인 실패를 허용으로", P, "} catch { allowedNow = false; }", "} catch { allowedNow = true; }"],
  ["경로가 범위를 넘기지 않음", R, "    ...scope,", ""],
  ["건너뛴 글을 처리 수에 넣음", R, 'const results = all.filter((r) => r.status !== "skipped");', "const results = all;"],
  ["연결점 없는 앱 응답에 건너뜀 칸", R, '...("onlyUserIds" in scope ? { skipped: all.length - results.length } : {})', "skipped: all.length - results.length"],
  ["건너뜀 수를 세지 않음", R, '...("onlyUserIds" in scope ? { skipped: all.length - results.length } : {})', ""],
];
const CR = String.fromCharCode(13), LF = String.fromCharCode(10);
const lf = (t) => t.split(CR + LF).join(LF);
let red = 0; const green = [], missing = [];
for (const [name, file, find, rep] of M) {
  const raw = fs.readFileSync(file, "utf8"); const crlf = raw.includes(CR + LF); const src = lf(raw);
  if (src.split(find).length !== 2) { missing.push(name); continue; }
  const out = src.replace(find, () => rep);
  fs.writeFileSync(file, crlf ? out.split(LF).join(CR + LF) : out);
  const r = spawnSync(process.execPath, ["--import", "./test/register.mjs", "--test", "test/r1.test.mjs"], { encoding: "utf8" });
  fs.writeFileSync(file, raw);
  if (r.status !== 0) red += 1; else green.push(name);
}
console.log(`변형 ${M.length}개 중 빨강 ${red}개` + (green.length ? " · 못 잡음: " + green.join(" / ") : "") + (missing.length ? " · 자리 없음: " + missing.join(" / ") : ""));
if (green.length || missing.length) process.exitCode = 1;
