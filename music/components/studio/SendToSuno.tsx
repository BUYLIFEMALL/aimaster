"use client";
import { useState } from "react";
import Link from "next/link";
import type { Track } from "@/lib/studio/config";
import { sendStudioTrackToSunoAction } from "@/lib/actions/studioSuno";

// 정밀 기획 → Suno 실제 생성(2026-10-21 병합 M1 3단계). 곡 편집기(빌더·보관함·앨범 곡) 아래에 붙는다.
// 기획한 제목·Style·가사를 GPT로 다시 쓰지 않고 그대로 보내고, 결과는 「음악 생성 · 트랙 관리」에서 이어진다.
// 모델 목록은 lib/ai/suno.ts SUNO_MODELS와 같게 둔다(서버 전용 파일이라 여기서 직접 불러오지 않음).
const MODELS = [
  { id: "V6", label: "V6 (기본·권장)" },
  { id: "V6_WILD", label: "V6 Wild — 더 실험적" },
  { id: "V6_MINI", label: "V6 Mini — 가볍고 빠름" },
];
const VARIETY = [
  { v: "", label: "다양성 기본(보통)" },
  { v: "0", label: "다양성 끔 — 기획에 가장 충실" },
  { v: "2", label: "다양성 높음" },
  { v: "3", label: "다양성 대담" },
  { v: "4", label: "다양성 최대" },
];

export function SendToSuno({ track, instrumental }: { track: Track; instrumental: boolean }) {
  const [model, setModel] = useState("V6");
  const [variety, setVariety] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [planningId, setPlanningId] = useState<string | null>(null);

  const ready = track.title.trim() && track.style.trim() && (instrumental || track.lyrics.trim());

  async function send() {
    setBusy(true);
    setMessage(null);
    setPlanningId(null);
    try {
      const res = await sendStudioTrackToSunoAction({
        title: track.title,
        summary: track.summary,
        style: track.style,
        exclude: track.exclude,
        lyrics: track.lyrics,
        voice: track.voice,
        instrumental,
        model,
        variety: variety === "" ? undefined : Number(variety),
      });
      if (res.needsApiKey) setMessage(`${res.needsApiKey === "suno" ? "Suno(sunoapi.org)" : res.needsApiKey} API 키를 [API 키 등록 · 플랫폼 연동]에서 먼저 등록해 주세요.`);
      else if (res.error) setMessage(res.error);
      else if (res.planningId) {
        setPlanningId(res.planningId);
        setMessage("Suno에 생성을 요청했습니다. 보통 1~3분 뒤 곡 2개가 완성됩니다.");
      }
    } catch {
      setMessage("요청을 보내지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="send-to-suno">
      <strong>🎵 이 기획 그대로 Suno로 생성</strong>
      <div className="actions">
        <select value={model} onChange={(e) => setModel(e.target.value)} disabled={busy} aria-label="Suno 모델">
          {MODELS.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
        <select value={variety} onChange={(e) => setVariety(e.target.value)} disabled={busy} aria-label="결과 다양성">
          {VARIETY.map((o) => (
            <option key={o.v} value={o.v}>
              {o.label}
            </option>
          ))}
        </select>
        <button className="primary" disabled={busy || !ready} onClick={send}>
          {busy ? "요청 중..." : "Suno로 생성"}
        </button>
      </div>
      <p className="muted">
        본인 sunoapi.org 키의 크레딧이 사용됩니다(1회에 보통 2곡). 완성된 곡은 「음악 생성 · 트랙 관리」에서 듣고 연장·MR·WAV·리믹스를 할
        수 있습니다.
      </p>
      {message && (
        <p className="notice" role="status">
          {message}{" "}
          {planningId && <Link href={`/plannings/${planningId}`}>트랙 관리에서 보기 →</Link>}
        </p>
      )}
    </div>
  );
}
