"use client";

// v1.26(V4): 화면에서 바로 녹화 → 녹화본(WEBM)을 대기열에 넣는다. 서버로 보내지 않고 브라우저 메모리에서만 다룬다.
import { useEffect, useRef, useState } from "react";
import { MonitorUp, Square } from "lucide-react";
import {
  MAX_RECORD_SECONDS,
  canRecordScreen,
  pickRecordMime,
  recordedSeconds,
  recordingFileName,
  remainingSeconds
} from "@/lib/screenRecord";

type Props = {
  /** 녹화가 끝나면 녹화본과 녹화한 시간(초)을 넘긴다 */
  onRecorded: (file: File, seconds: number) => void;
  disabled?: boolean;
};

export default function ScreenRecorder({ onRecorded, disabled }: Props) {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [recording, setRecording] = useState(false);
  const [left, setLeft] = useState(MAX_RECORD_SECONDS);
  const [note, setNote] = useState("");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setSupported(
      canRecordScreen({ mediaDevices: navigator.mediaDevices, hasMediaRecorder: typeof MediaRecorder !== "undefined" })
    );
    // 화면을 떠나면 녹화·공유를 정리한다
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  function stop() {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
  }

  async function start() {
    setNote("");
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 30 }, audio: false });
    } catch (error) {
      // 화면 고르기 창에서 「취소」를 누른 경우는 조용히 끝낸다
      if (error instanceof DOMException && error.name === "NotAllowedError") return;
      setNote("화면 공유를 시작하지 못했습니다. 브라우저 주소창의 화면 공유 권한을 확인해 주세요.");
      return;
    }
    streamRef.current = stream;
    const mimeType = pickRecordMime((m) => MediaRecorder.isTypeSupported(m));
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    recorderRef.current = recorder;
    const chunks: Blob[] = [];
    const startedAt = performance.now();

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };
    recorder.onstop = () => {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
      stream.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      recorderRef.current = null;
      setRecording(false);
      setLeft(MAX_RECORD_SECONDS);
      const blob = new Blob(chunks, { type: recorder.mimeType || "video/webm" });
      const seconds = recordedSeconds(performance.now() - startedAt);
      if (!blob.size || seconds < 0.3) {
        setNote("녹화된 화면이 없습니다. 다시 녹화해 주세요.");
        return;
      }
      onRecorded(new File([blob], recordingFileName(new Date()), { type: "video/webm" }), seconds);
      setNote(`${seconds}초 녹화본을 대기열에 넣었습니다. 아래에서 구간을 고른 뒤 변환하세요.`);
    };
    // 브라우저의 「공유 중지」 막대를 눌러도 녹화를 끝낸다
    stream.getVideoTracks()[0]?.addEventListener("ended", stop);

    recorder.start(1000);
    setRecording(true);
    setLeft(MAX_RECORD_SECONDS);
    timerRef.current = setInterval(() => {
      const elapsed = performance.now() - startedAt;
      setLeft(remainingSeconds(elapsed));
      if (elapsed >= MAX_RECORD_SECONDS * 1000) stop();
    }, 250);
  }

  if (supported === null) return null;

  if (!supported) {
    return (
      <p className="rounded-2xl border border-[#30363d] bg-[#161b22] px-4 py-3 text-xs text-gray-400">
        🖥 화면에서 바로 녹화는 PC의 크롬·엣지·웨일 브라우저에서 쓸 수 있습니다. 휴대폰에서는 촬영한 영상 파일을 위에 넣어 주세요.
      </p>
    );
  }

  return (
    <div className="rounded-2xl border border-[#30363d] bg-[#161b22] px-4 py-3">
      <div className="flex flex-wrap items-center gap-3">
        {recording ? (
          <button
            type="button"
            onClick={stop}
            className="inline-flex items-center gap-2 rounded-xl bg-red-500 px-4 py-2 text-sm font-bold text-white hover:bg-red-400"
          >
            <Square className="h-4 w-4 fill-current" />
            녹화 멈추기
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void start()}
            disabled={disabled}
            className="inline-flex items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/15 px-4 py-2 text-sm font-bold text-amber-300 hover:bg-amber-500/25 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <MonitorUp className="h-4 w-4" />
            화면에서 바로 녹화
          </button>
        )}
        {recording ? (
          <span role="status" className="inline-flex items-center gap-2 text-sm font-bold text-red-300">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" />
            녹화 중 · {left}초 남음
          </span>
        ) : (
          <span className="text-xs text-gray-400">
            화면 전체·창·탭 중 하나를 골라 최대 {MAX_RECORD_SECONDS}초 녹화합니다(소리 없음). 상세페이지 사용법 GIF에 알맞습니다.
          </span>
        )}
      </div>
      {note && (
        <p role="status" className="mt-2 text-xs text-amber-200">
          {note}
        </p>
      )}
    </div>
  );
}
