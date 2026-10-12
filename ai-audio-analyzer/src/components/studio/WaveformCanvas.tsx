"use client";

import React, { useEffect, useRef, useState } from "react";
import { Play, Pause, Volume2, VolumeX, RotateCcw } from "lucide-react";

interface WaveformCanvasProps {
  audioUrl: string | null;
  fileName?: string;
}

export default function WaveformCanvas({ audioUrl, fileName }: WaveformCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [waveformData, setWaveformData] = useState<number[]>([]);

  // Decode audio data to extract waveform peaks
  useEffect(() => {
    if (!audioUrl) {
      setWaveformData([]);
      return;
    }

    let isCancelled = false;
    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();

    fetch(audioUrl)
      .then((res) => res.arrayBuffer())
      .then((buffer) => audioContext.decodeAudioData(buffer))
      .then((audioBuffer) => {
        if (isCancelled) return;
        setDuration(audioBuffer.duration);

        const rawData = audioBuffer.getChannelData(0); // Left channel
        const samples = 120; // Number of bars
        const blockSize = Math.floor(rawData.length / samples);
        const filteredData: number[] = [];

        for (let i = 0; i < samples; i++) {
          const blockStart = blockSize * i;
          let sum = 0;
          for (let j = 0; j < blockSize; j++) {
            sum += Math.abs(rawData[blockStart + j]);
          }
          filteredData.push(sum / blockSize);
        }

        // Normalize data to 0..1
        const multiplier = Math.pow(Math.max(...filteredData), -1);
        const normalized = filteredData.map((n) => Math.max(0.08, n * multiplier));
        setWaveformData(normalized);
      })
      .catch((err) => {
        console.error("Waveform extraction failed:", err);
      })
      .finally(() => {
        audioContext.close();
      });

    return () => {
      isCancelled = true;
    };
  }, [audioUrl]);

  // Handle Play/Pause
  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(console.error);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || duration === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    const targetTime = pos * duration;
    audioRef.current.currentTime = targetTime;
    setCurrentTime(targetTime);
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    audioRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  if (!audioUrl) return null;

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-3">
      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onEnded={() => setIsPlaying(false)}
        onLoadedMetadata={() => {
          if (audioRef.current) setDuration(audioRef.current.duration);
        }}
      />

      {/* 헤더 & 파일 정보 */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 truncate max-w-[70%]">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-bold text-slate-800 truncate">{fileName || "오디오 파일"}</span>
        </div>
        <div className="font-mono text-[11px] text-slate-500 font-semibold">
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>
      </div>

      {/* 인터랙티브 파형 바 컨테이너 */}
      <div
        onClick={handleSeek}
        className="h-16 bg-slate-50 rounded-xl px-3 flex items-center gap-0.5 cursor-pointer relative overflow-hidden border border-slate-200/50 hover:border-indigo-300 transition-colors"
      >
        {/* 진행률 오버레이 백그라운드 */}
        <div
          className="absolute inset-y-0 left-0 bg-indigo-50/60 pointer-events-none transition-all duration-75"
          style={{ width: `${progressPercent}%` }}
        />

        {/* 파형 바 */}
        {waveformData.length > 0 ? (
          waveformData.map((val, idx) => {
            const barProgress = (idx / waveformData.length) * 100;
            const isPassed = barProgress <= progressPercent;
            return (
              <div
                key={idx}
                className="flex-1 flex items-center justify-center h-full pointer-events-none"
              >
                <div
                  className={`w-full max-w-[4px] rounded-full transition-all duration-75 ${
                    isPassed ? "bg-indigo-600" : "bg-slate-300"
                  }`}
                  style={{ height: `${Math.max(12, val * 100)}%` }}
                />
              </div>
            );
          })
        ) : (
          <div className="w-full flex items-center justify-center text-slate-400 text-xs">
            파형 생성 중...
          </div>
        )}
      </div>

      {/* 재생 컨트롤 바 */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={togglePlay}
            className="w-8 h-8 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center transition-transform active:scale-95 shadow-xs"
          >
            {isPlaying ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
          </button>

          <button
            type="button"
            onClick={() => {
              if (audioRef.current) {
                audioRef.current.currentTime = 0;
                setCurrentTime(0);
              }
            }}
            title="처음으로"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <RotateCcw size={14} />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleMute}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </button>
        </div>
      </div>
    </div>
  );
}
