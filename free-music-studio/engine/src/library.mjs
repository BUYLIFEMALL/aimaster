// 내 PC 보관함 — 완성된 음원을 ACE-Step 임시 폴더(작업 기록이 지워지면 사라짐)에서
// 엔진 보관 폴더(dataDir/library/<곡 번호>.mp3)로 복사해 두고, 사이트 「모든 음악」이 다시 꺼내 쓴다.
// 곡 번호는 사이트 DB의 곡 id(uuid)와 같다. 파일은 회원 PC에만 있다.
import { createReadStream } from "node:fs";
import { mkdir, readdir, rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** 곡 번호 검사 — 경로 조작을 막으려고 uuid 모양만 받는다. */
export function isTrackId(id) {
  return typeof id === "string" && ID.test(id);
}

export function createLibrary(dataDir) {
  const dir = path.join(dataDir, "library");
  const fileOf = (id) => path.join(dir, `${id}.mp3`);

  return {
    dir,
    /** 음원 바이트를 받아 보관한다(임시 이름으로 쓴 뒤 바꿔 반쯤 쓰인 파일이 남지 않게). */
    async save(id, bytes) {
      await mkdir(dir, { recursive: true });
      const tmp = `${fileOf(id)}.part`;
      await writeFile(tmp, bytes);
      await rename(tmp, fileOf(id));
    },
    async list() {
      try {
        return (await readdir(dir)).filter((f) => f.endsWith(".mp3")).map((f) => f.slice(0, -4)).filter(isTrackId);
      } catch {
        return [];
      }
    },
    /** 파일이 있으면 { size, stream }, 없으면 null */
    async open(id) {
      try {
        const s = await stat(fileOf(id));
        return { size: s.size, stream: createReadStream(fileOf(id)) };
      } catch {
        return null;
      }
    },
    async remove(id) {
      await rm(fileOf(id), { force: true });
    },
  };
}
