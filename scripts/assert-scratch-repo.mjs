#!/usr/bin/env node
// 「지금 폴더가 이 저장소(AIMaster) 안이면 멈춤」 — 2026-10-23 (Claude Code 윈도우)
// 재현·시험용 셸 명령에서 `&`가 `&&` 연결 전체에 걸려 cd가 백그라운드로 가고, 반복문이 실제 저장소에서 돌아 시험 커밋 16개가 들어간 사고 뒤에 만듦.
// 사용(셸 시험 명령 맨 앞, cd 직후):  cd "$T" && node /d/Antigravity/AIMaster/scripts/assert-scratch-repo.mjs || exit 1
//   지금 폴더가 이 저장소 안이면 종료코드 1과 안내, 아니면 0(아무 출력 없음).
// 시험 파일(*.test.mjs)에서는 import 해서 assertScratchRepo(dir)로 쓴다.
import { execFileSync } from "node:child_process";
import { realpathSync } from "node:fs";
import { dirname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const MAIN = realpathSync(resolve(dirname(fileURLToPath(import.meta.url)), ".."));
const norm = (p) => realpathSync(p).replace(/[\\/]+$/, "").toLowerCase();

/** dir(기본: 지금 폴더)이 이 저장소 안이거나, dir에서 git이 보는 최상위가 이 저장소면 예외 */
export function assertScratchRepo(dir = process.cwd()) {
  const d = norm(dir), main = norm(MAIN);
  if (d === main || d.startsWith(main + sep.toLowerCase()) || d.startsWith(main + "/")) throw new Error(`지금 폴더(${dir})가 실제 저장소(${MAIN}) 안입니다 — 시험을 멈춥니다.`);
  let top = null;
  try { top = execFileSync("git", ["rev-parse", "--show-toplevel"], { cwd: dir, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim(); } catch { /* git 저장소가 아직 아님 */ }
  if (top && norm(top) === main) throw new Error(`git 최상위(${top})가 실제 저장소입니다 — 시험을 멈춥니다.`);
}

if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  try { assertScratchRepo(); }
  catch (e) { console.error(`⛔ ${e.message}`); process.exit(1); }
}
