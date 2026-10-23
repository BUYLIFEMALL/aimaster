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
});

test("요청 본문: 화풍·카메라·사진이 없으면 그 줄을 빼고, 설명은 최대 길이로 자른다", () => {
  const b = polishRequestBody({ idea: "가".repeat(POLISH_MAX + 50), seconds: 8, hasImage: false });
  const text = b.contents[0].parts[0].text;
  assert.doesNotMatch(text, /Visual style|Camera:|start frame/);
  assert.equal(text.split("\n")[0].length, "Idea (Korean): ".length + POLISH_MAX);
});

test("응답 해석: 정상 JSON, 코드 블록 감싼 JSON", () => {
  const ok = parsePolishResponse(reply('{"prompt":"A young Korean woman walks slowly\\n under an umbrella.","note":"빛과 걸음걸이를 보강했습니다."}'));
  assert.deepEqual(ok, { prompt: "A young Korean woman walks slowly under an umbrella.", note: "빛과 걸음걸이를 보강했습니다." });
  const fenced = parsePolishResponse(reply('```json\n{"prompt":"Snow falls gently on a hanok courtyard."}\n```'));
  assert.equal(fenced.prompt, "Snow falls gently on a hanok courtyard.");
  assert.equal(fenced.note, "");
});

test("응답 해석: 빈 응답·깨진 JSON·너무 짧은 설명은 null", () => {
  assert.equal(parsePolishResponse({}), null);
  assert.equal(parsePolishResponse(reply("")), null);
  assert.equal(parsePolishResponse(reply("not json")), null);
  assert.equal(parsePolishResponse(reply('{"prompt":"short"}')), null);
  assert.equal(parsePolishResponse(reply('{"prompt":123}')), null);
});

test("응답 해석: 긴 설명은 최대 길이로 자른다", () => {
  const r = parsePolishResponse(reply(JSON.stringify({ prompt: "a".repeat(POLISH_MAX + 100) })));
  assert.equal(r.prompt.length, POLISH_MAX);
});

test("오래 걸림 판단: 240초부터", () => {
  const start = "2026-10-24T00:00:00.000Z";
  const t0 = new Date(start).getTime();
  assert.equal(SLOW_AFTER_SEC, 240);
  assert.equal(isSlow(start, t0 + 239_000), false);
  assert.equal(isSlow(start, t0 + 240_000), true);
});
