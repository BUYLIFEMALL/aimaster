// 변형 검사(3판): 고친 파일의 핵심 줄을 하나씩 망가뜨리고 시험이 빨강이 되는지 본다. 끝나면 원래대로 되돌린다.
const fs = require("fs"); const { spawnSync } = require("child_process");
const S = "insta_auto_poster/src/lib/cardnews/instagram/memberScheduler.ts", P = "ai-webtoon-studio/src/lib/instagram/posting.ts", R = "ai-webtoon-studio/src/app/api/instagram/dispatch/route.ts";
const M = [
  // 판정
  ["유효 방식 판정 제거", S, 'if (POLICY && mode === "vercel" && !(await platformEffective(service, userId, row))) return "cronjob";', ""],
  ["기본 방식에 연결점 미반영", S, "POLICY?.defaultMode ?? (SCHEDULER_IS_STANDALONE", "(SCHEDULER_IS_STANDALONE"],
  ["권한 판정 실패를 허용으로", S, "try { return (await POLICY.allowed(service, userId)) === true; } catch { return false; }", "try { return (await POLICY.allowed(service, userId)) === true; } catch { return true; }"],
  ["명시 선택 없이도 유효", S, 'if (!row || row.mode !== "vercel" || rowChoice(row) === null) return false;', 'if (!row || row.mode !== "vercel") return false;'],
  ["관리자 허용 없이도 유효", S, "  return memberPlatformAllowed(service, userId);\n}\n\n/** 선택 칸에 쓸 값", "  return true;\n}\n\n/** 선택 칸에 쓸 값"],
  ["선택 칸 이름이 없어도 선택으로 봄", S, "if (!POLICY?.choiceColumn || !row) return null;", 'if (!row) return null; if (!POLICY?.choiceColumn) return "있음";'],
  ["연결점 없는 앱의 행 조회 칸이 바뀜", S, '["user_id, mode, active, paused", POLICY?.choiceColumn, POLICY?.revisionColumn]', '["user_id, mode, active, paused", "platform_chosen_at", POLICY?.revisionColumn]'],
  ["cronjob으로 쓸 때 선택 기록을 안 지움", S, 'const written = await updateIfUnchanged(service, userId, row, { mode: "cronjob", ...choiceField(null), ...fields });', 'const written = await updateIfUnchanged(service, userId, row, { mode: "cronjob", ...fields });'],
  // 조건부 갱신
  ["판 번호 조건 없이 갱신", S, '.eq("user_id", userId).eq(POLICY.revisionColumn, rowRevision(seen));', '.eq("user_id", userId);'],
  ["판 번호를 올리지 않음", S, "payload[POLICY.revisionColumn] = rowRevision(seen) + 1;", "payload[POLICY.revisionColumn] = rowRevision(seen);"],
  ["갱신된 행 0을 성공으로", S, "if (error || !data?.length) return null;\n  return { ...seen, ...payload } as SchedulerRow;", "if (error) return null;\n  return { ...seen, ...payload } as SchedulerRow;"],
  ["갱신 오류를 성공으로", S, "if (error || !data?.length) return null;\n  return { ...seen, ...payload } as SchedulerRow;", "return { ...seen, ...payload } as SchedulerRow;"],
  ["유효한 Vercel을 덮음", S, 'if (!row || (await platformEffective(service, userId, row))) return "superseded";', 'if (!row) return "superseded";'],
  // Vercel 선택
  ["Vercel 바꾸기 권한 확인 제거", S, "if (!POLICY.choiceColumn || !(await memberPlatformAllowed(service, userId))) throw", "if (!POLICY.choiceColumn) throw"],
  ["Vercel 바꾸기에서 선택을 같이 안 씀", S, '{ mode: "vercel", active: false, ...choiceField(now()) }', '{ mode: "vercel", active: false }'],
  ["저장 실패를 성공으로", S, "  if (!saved) throw new Error(SAVE_FAILED_MESSAGE);", ""],
  ["사이트 스위치 off인데 Vercel 선택 허용", S, '  if (!platformSchedulerEnabled()) throw new Error("이 사이트는 Vercel 예약 호출이 꺼져 있어 「내 cron-job.org」 방식만 쓸 수 있습니다.");\n  if (!POLICY.choiceColumn', "  if (!POLICY.choiceColumn"],
  ["끈 뒤 다시 보기 없음(늦게 도착한 끄기)", S, '    if (after && rowRevision(after) !== rowRevision(saved) && after.mode === "cronjob" && !after.paused) {', "    if (false) {"],
  // cronjob 선택
  ["cronjob 선택이 그사이 선택을 덮음", S, '    if (!own.row) throw new Error(MODE_CONFLICT_MESSAGE);', '    if (!own.row) { await service.from(SCHEDULER_TABLE).update({ mode: "cronjob", ...choiceField(null), updated_at: now() }).eq("user_id", userId); own.row = seen; }'],
  ["되돌리기가 남의 쓰기를 덮음", S, "if (own.row) await updateIfUnchanged(service, userId, own.row, { mode: seen.mode, ...choiceField(rowChoice(seen)), active: false });", 'await service.from(SCHEDULER_TABLE).update({ mode: seen.mode, ...choiceField(rowChoice(seen)), active: false, updated_at: now() }).eq("user_id", userId).eq("mode", "cronjob");'],
  ["되돌리기가 예전 선택 기록을 버림", S, "{ mode: seen.mode, ...choiceField(rowChoice(seen)), active: false }", "{ mode: seen.mode, ...choiceField(null), active: false }"],
  ["되돌리기 없음", S, "if (own.row) await updateIfUnchanged(service, userId, own.row, { mode: seen.mode, ...choiceField(rowChoice(seen)), active: false });", ""],
  ["밀린 cronjob 선택을 성공으로", S, "      if (started.superseded) throw new Error(MODE_CONFLICT_MESSAGE);", ""],
  // 예약 시작
  ["유효한 Vercel인데 회원 작업을 켬", S, "  if (row && (await platformEffective(service, userId, row))) return { paused: false, superseded: true };\n  const url", "  const url"],
  ["Vercel에 밀렸는데 켠 작업을 안 끔", S, '    if (claimed !== "superseded") return { paused: false };\n    await setDispatchJobEnabled(apiKey, url, false).catch(() => undefined);', '    if (claimed !== "superseded") return { paused: false };'],
  ["다른 cronjob 요청에 밀렸는데 남의 작업을 끔", S, '    if (claimed !== "superseded") return { paused: false };', '    if (claimed === "ok") return { paused: false };'],
  ["토큰을 저장 못 했는데 작업을 만듦", S, '  if (stored === "superseded") return { paused: false, superseded: true };', ""],
  ["행 만들기 충돌을 오류로 끝냄", S, '      if (!(await schedulerRow(service, userId))) throw new Error("예약 실행 연결 정보를 저장하지 못했습니다.");', '      throw new Error("예약 실행 연결 정보를 저장하지 못했습니다.");'],
  // 키 삭제·상태
  ["키 삭제가 방식을 씀", S, "const cleared = { token_hash: `unset-${userId}`, cronjob_job_id: null, active: false };", 'const cleared = { token_hash: `unset-${userId}`, cronjob_job_id: null, active: false, mode: platformSchedulerEnabled() ? "vercel" : row.mode };'],
  ["연결점 없는 앱의 키 삭제가 달라짐", S, "  if (POLICY) {\n    // 연결점이 있는 프로그램은 방식을 쓰지 않는다", "  if (true) {\n    // 연결점이 있는 프로그램은 방식을 쓰지 않는다"],
  ["연결점 없는 앱이 정책 길을 탐(방식 바꾸기)", S, "  if (POLICY) return setModeWithPolicy(service, userId, mode);", "  if (true) return setModeWithPolicy(service, userId, mode);"],
  ["연결점 없는 앱이 정책 길을 탐(예약 시작)", S, "  if (POLICY) return ensureRunningWithPolicy(service, userId, apiKey);", "  if (true) return ensureRunningWithPolicy(service, userId, apiKey);"],
  ["연결점 없는 앱 응답에 새 칸", S, "let extra: { platformAllowed?: boolean; platformReselectNeeded?: boolean } = {};", "let extra: { platformAllowed?: boolean; platformReselectNeeded?: boolean } = { platformAllowed: true };"],
  ["상태가 선택 기록을 안 봄", S, 'if (rowMode === "vercel" && !(allowed && chosen)) mode = "cronjob";', 'if (rowMode === "vercel" && !allowed) mode = "cronjob";'],
  ["다시 고르기 안내 누락", S, 'platformReselectNeeded: allowed && rowMode === "vercel" && !chosen', "platformReselectNeeded: false"],
  // 실행 범위
  ["범위에서 일시정지 미제외", S, '.eq("mode", "vercel").eq("paused", false).not(', '.eq("mode", "vercel").not('],
  ["범위에서 방식 미확인", S, '.eq("mode", "vercel").eq("paused", false).not(', '.eq("paused", false).not('],
  ["범위에서 명시 선택 미확인", S, '.not(POLICY.choiceColumn, "is", null).in("user_id", allowedIds)', '.in("user_id", allowedIds)'],
  ["사이트 스위치 off인데 처리", S, "if (!platformSchedulerEnabled() || !POLICY.choiceColumn) return none;", "if (!POLICY.choiceColumn) return none;"],
  ["목록 실패 때 전원 처리", S, "try { allowedIds = await POLICY.listAllowedUserIds(service); } catch { return none; }", "try { allowedIds = await POLICY.listAllowedUserIds(service); } catch { return { excludeUserIds: [] }; }"],
  ["처리 직전 재확인 생략", S, "      return platformEffective(service, userId, row);", "      return true;"],
  ["처리 직전 일시정지 미확인", S, "if (!row || row.paused || !platformSchedulerEnabled()) return false;", "if (!row || !platformSchedulerEnabled()) return false;"],
  ["처리 직전 사이트 스위치 미확인", S, "if (!row || row.paused || !platformSchedulerEnabled()) return false;", "if (!row || row.paused) return false;"],
  ["연결점 없는 앱의 범위가 빈 제외 목록", S, "if (!POLICY) return { excludeUserIds: await membersExcludedFromPlatform(service) };", "if (!POLICY) return { excludeUserIds: [] };"],
  // 게시 처리·경로
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
