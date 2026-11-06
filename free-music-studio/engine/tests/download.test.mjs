import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { downloadVerified } from "../src/download.mjs";

const bytes = Buffer.from("0123456789".repeat(1000));
const sha256 = createHash("sha256").update(bytes).digest("hex");
const asset = { url: "https://x/model.bin", bytes: bytes.length, sha256 };

/** buf만 보낸 뒤 끊기는 응답(먼저 읽힌 다음에 끊겨야 받은 부분이 남는다) */
const brokenBody = (buf) => {
  let sent = false;
  return new ReadableStream({
    async pull(c) {
      if (!sent) {
        sent = true;
        c.enqueue(buf);
      } else {
        await new Promise((r) => setTimeout(r, 50)); // 파일에 다 쓴 뒤 끊긴다(실제 연결처럼)
        c.error(new Error("connection reset"));
      }
    },
  });
};

test("받기(0.6.9): 끊기면 받은 부분부터 Range로 이어받아 완성", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "fms-dl-"));
  try {
    const calls = [];
    const fetchImpl = async (_url, init) => {
      const range = init?.headers?.Range ?? null;
      calls.push(range);
      if (calls.length === 1) return new Response(brokenBody(bytes.subarray(0, 4000)), { status: 200 });
      const from = Number(/bytes=(\d+)-/.exec(range)[1]);
      return new Response(bytes.subarray(from), { status: 206 });
    };
    const dest = path.join(dir, "model.bin");
    await downloadVerified(asset, dest, { fetchImpl, retryDelayMs: 1 });
    assert.deepEqual(calls, [null, "bytes=4000-"]);
    assert.ok((await readFile(dest)).equals(bytes));
    await assert.rejects(stat(`${dest}.part`));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("받기(0.6.9): 이어받기를 무시하는 서버면 처음부터, 이미 받은 파일은 다시 받지 않음", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "fms-dl-"));
  try {
    const dest = path.join(dir, "model.bin");
    await writeFile(`${dest}.part`, bytes.subarray(0, 3000));
    let n = 0;
    const fetchImpl = async () => (n++, new Response(bytes, { status: 200 }));
    await downloadVerified(asset, dest, { fetchImpl });
    assert.ok((await readFile(dest)).equals(bytes));
    await downloadVerified(asset, dest, { fetchImpl });
    assert.equal(n, 1);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("받기(0.6.9): 404는 다시 시도하지 않고, 여러 번 끊기면 받은 부분을 남긴다", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "fms-dl-"));
  try {
    let n = 0;
    await assert.rejects(downloadVerified(asset, path.join(dir, "a.bin"), { fetchImpl: async () => (n++, new Response("no", { status: 404 })) }), /HTTP 404/);
    assert.equal(n, 1);
    const dest = path.join(dir, "b.bin");
    await assert.rejects(
      downloadVerified(asset, dest, { fetchImpl: async () => new Response(brokenBody(bytes.subarray(0, 100)), { status: 200 }), attempts: 2, retryDelayMs: 1 }),
      /여러 번 끊겼습니다/
    );
    assert.ok((await stat(`${dest}.part`)).size > 0);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
