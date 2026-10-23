import test from "node:test";
import assert from "node:assert/strict";
import { POLISH_MAX, SLOW_AFTER_SEC, isSlow, parsePolishResponse, polishRequestBody } from "../lib/promptPolish.ts";

const reply = (text) => ({ candidates: [{ content: { parts: [{ text }] } }] });

test("요청 본문: 설명·화풍·카메라·길이·사진 여부가 들어가고 JSON으로 받는다", () => {
  const b = polishRequestBody({ idea: "  한옥 마당에 내리는 첫눈 ", style: "cinematic live-action", camera: "slow push-in", seconds: 5, hasImage: true });
  const text = b.contents[0].parts[0].text;
  assert.match(text, /^Idea \(Korean\): 한옥 마당에 내리는 첫눈\n/);
  assert.match(text, /Visual style: cinematic live-action/);
  assert.match(text, /Camera: slow push-in/);
  assert.match(text, /about 5 seconds/);
  assert.match(text, /start frame image/);
  assert.equal(b.generationConfig.responseMimeType, "application/json");
  assert.match(b.systemInstruction.parts[0].text, /Korean/);
  assert.match(b.systemInstruction.parts[0].text, /no|Never/);
  assert.match(b.systemInstruction.parts[0].text, /3 clearly different versions/);
});

test("요청 본문: 화풍·카메라·사진이 없으면 그 줄을 빼고, 설명은 최대 길이로 자른다", () => {
  const b = polishRequestBody({ idea: "가".repeat(POLISH_MAX + 50), seconds: 8, hasImage: false });
  const text = b.contents[0].parts[0].text;
  assert.doesNotMatch(text, /Visual style|Camera:|start frame/);
  assert.equal(text.split("\n")[0].length, "Idea (Korean): ".length + POLISH_MAX);
});

test("응답 해석: 3안 형식, 같은 설명은 하나만, 최대 3개", () => {
  const opts = [
    { prompt: "Calm version of a hanok courtyard in snow.", note: "차분하게" },
    { prompt: "Dynamic version with swirling snow and wind.", note: "역동적으로" },
    { prompt: "Calm version of a hanok courtyard in snow.", note: "중복" },
    { prompt: "Moody version lit by warm lanterns at dusk.", note: "분위기" },
    { prompt: "Fourth version that should be dropped here." },
  ];
  const r = parsePolishResponse(reply(JSON.stringify({ options: opts })));
  assert.deepEqual(r.map((x) => x.note), ["차분하게", "역동적으로", "분위기"]);
});

test("응답 해석: 예전 1안 형식·코드 블록도 받는다", () => {
  const ok = parsePolishResponse(reply('{"prompt":"A young Korean woman walks slowly\\n under an umbrella.","note":"빛과 걸음걸이를 보강했습니다."}'));
  assert.deepEqual(ok, [{ prompt: "A young Korean woman walks slowly under an umbrella.", note: "빛과 걸음걸이를 보강했습니다." }]);
  const fenced = parsePolishResponse(reply('```json\n{"options":[{"prompt":"Snow falls gently on a hanok courtyard."}]}\n```'));
  assert.deepEqual(fenced, [{ prompt: "Snow falls gently on a hanok courtyard.", note: "" }]);
});

test("응답 해석: 빈 응답·깨진 JSON·너무 짧은 설명은 빈 목록", () => {
  assert.deepEqual(parsePolishResponse({}), []);
  assert.deepEqual(parsePolishResponse(reply("")), []);
  assert.deepEqual(parsePolishResponse(reply("not json")), []);
  assert.deepEqual(parsePolishResponse(reply('{"prompt":"short"}')), []);
  assert.deepEqual(parsePolishResponse(reply('{"options":[{"prompt":123}]}')), []);
});

test("응답 해석: 긴 설명은 최대 길이로 자른다", () => {
  const r = parsePolishResponse(reply(JSON.stringify({ options: [{ prompt: "a".repeat(POLISH_MAX + 100) }] })));
  assert.equal(r[0].prompt.length, POLISH_MAX);
});

test("오래 걸림 판단: 240초부터", () => {
  const start = "2026-10-24T00:00:00.000Z";
  const t0 = new Date(start).getTime();
  assert.equal(SLOW_AFTER_SEC, 240);
  assert.equal(isSlow(start, t0 + 239_000), false);
  assert.equal(isSlow(start, t0 + 240_000), true);
});
