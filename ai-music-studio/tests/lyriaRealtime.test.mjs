// Lyria RealTime 서버 녹음 — 실제 연결 없이(무료) 가짜 WebSocket으로 메시지 순서·WAV 만들기·버전 재시도를 검사한다.
import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { recordLyriaRealtime, pcmFormat, pcmToWav } from "../lib/providers/lyriaRealtime.ts";

const RealWS = globalThis.WebSocket;
afterEach(() => { globalThis.WebSocket = RealWS; });

function fakeWS(script) {
  const made = [];
  class FakeWS {
    static OPEN = 1;
    constructor(url) { this.url = url; this.sent = []; this.readyState = 0; made.push(this); queueMicrotask(() => script(this, made.length)); }
    send(s) { this.sent.push(JSON.parse(s)); this.onSent?.(JSON.parse(s)); }
    close() { this.readyState = 3; }
    open() { this.readyState = 1; this.onopen?.(); }
    msg(obj) { this.onmessage?.({ data: JSON.stringify(obj) }); }
  }
  globalThis.WebSocket = FakeWS;
  return made;
}

test("pcmFormat·pcmToWav: 형식 읽기와 44바이트 머리글", () => {
  assert.deepEqual(pcmFormat("audio/l16;rate=44100;channels=1"), { rate: 44100, channels: 1 });
  assert.deepEqual(pcmFormat(undefined), { rate: 48000, channels: 2 });
  const wav = pcmToWav(new Uint8Array(8), 48000, 2);
  assert.equal(wav.byteLength, 52);
  assert.equal(new TextDecoder().decode(wav.subarray(0, 4)), "RIFF");
  assert.equal(new DataView(wav.buffer).getUint32(24, true), 48000);
});

test("녹음: setup → 설명·설정·PLAY → 1초 분량 모으면 STOP·WAV", async () => {
  const sec = Buffer.alloc(48000 * 4).toString("base64"); // 1초(48kHz·스테레오·16비트)
  const made = fakeWS((ws) => {
    ws.onSent = (m) => {
      if (m.setup) ws.msg({ setupComplete: {} });
      if (m.playbackControl === "PLAY") { ws.msg({ serverContent: { audioChunks: [{ data: sec, mimeType: "audio/l16;rate=48000;channels=2" }] } }); }
    };
    ws.open();
  });
  const r = await recordLyriaRealtime({ prompt: "calm piano", durationS: 1 }, "GK");
  const ws = made[0];
  assert.match(ws.url, /^wss:\/\/generativelanguage\.googleapis\.com\/ws\/google\.ai\.generativelanguage\.v1beta\.GenerativeService\.BidiGenerateMusic\?key=GK$/);
  assert.deepEqual(ws.sent.slice(0, 4), [
    { setup: { model: "models/lyria-realtime-exp" } },
    { clientContent: { weightedPrompts: [{ text: "calm piano", weight: 1 }] } },
    { musicGenerationConfig: {} },
    { playbackControl: "PLAY" },
  ]);
  assert.deepEqual(ws.sent.at(-1), { playbackControl: "STOP" });
  assert.equal(r.contentType, "audio/wav");
  assert.equal(r.durationS, 1);
  assert.equal(r.data.byteLength, 44 + 48000 * 4);
});

test("연결 단계에서 거절되면 v1alpha로 한 번 더(생성 전이라 비용 없음)", async () => {
  const sec = Buffer.alloc(48000 * 4).toString("base64");
  const made = fakeWS((ws, n) => {
    if (n === 1) { ws.open(); ws.onclose?.({ code: 1007, reason: "unsupported" }); return; }
    ws.onSent = (m) => {
      if (m.setup) ws.msg({ setupComplete: {} });
      if (m.playbackControl === "PLAY") ws.msg({ serverContent: { audioChunks: [{ data: sec }] } });
    };
    ws.open();
  });
  const r = await recordLyriaRealtime({ prompt: "x", durationS: 1 }, "K");
  assert.equal(made.length, 2);
  assert.match(made[1].url, /\.v1alpha\./);
  assert.equal(r.durationS, 1);
});

test("생성이 시작된 뒤 소리 없이 닫히면 다시 시도하지 않고 오류(키는 메시지에 없음)", async () => {
  const made = fakeWS((ws) => {
    ws.onSent = (m) => { if (m.setup) ws.msg({ setupComplete: {} }); if (m.playbackControl === "PLAY") ws.onclose?.({ code: 1008, reason: "API key not valid" }); };
    ws.open();
  });
  await assert.rejects(recordLyriaRealtime({ prompt: "x", durationS: 5 }, "SECRET"), (e) => /API 키/.test(e.message) && !e.message.includes("SECRET"));
  assert.equal(made.length, 1);
});
