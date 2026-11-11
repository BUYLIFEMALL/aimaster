// elevenst-register Vercel 프로젝트에 CRON_SECRET(30일 정리 예약 작업 보호용)을 등록한다 (주인님 승인 2026-11-12 채팅 「진행해」).
// 값은 이 자리에서 무작위로 만들어 표준입력으로만 전달하며 출력·기록하지 않는다. Vercel 예약 호출이 같은 값을 Authorization 헤더로 보낸다.
// 이미 있으면 덮어쓰지 않는다(--force 없음) — 다시 만들려면 Vercel에서 지운 뒤 실행.
import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";

const value = randomBytes(32).toString("base64url");
try {
  execFileSync("vercel", ["env", "add", "CRON_SECRET", "production", "--scope", "buylife"], {
    cwd: "D:/AIMaster/elevenst-register", input: value, stdio: ["pipe", "ignore", "pipe"], shell: true,
  });
  console.log("등록 완료: CRON_SECRET (production)");
} catch (e) {
  console.error(`실패: CRON_SECRET — ${String(e.stderr || e.message).slice(0, 300)}`);
  process.exitCode = 1;
}
