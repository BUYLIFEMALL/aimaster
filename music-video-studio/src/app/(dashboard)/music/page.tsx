"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Check, Copy, Download, FileUp, Loader2, Wand2 } from "lucide-react";
import { GENRES } from "@/lib/music/presets";
import { useStudio } from "@/components/studio/ProjectProvider";
import { BTN_GHOST, BTN_PRIMARY, Card, ErrorNote, Field, INPUT, SELECT, StepHeader, copyText } from "@/components/studio/ui";

function CopyButton({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      disabled={!text.trim()}
      onClick={async () => {
        if (await copyText(text)) {
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        }
      }}
      className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-40"
      aria-label={`${label} 복사`}
    >
      {done ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
      {done ? "복사됨" : "복사"}
    </button>
  );
}

export default function MusicPage() {
  const { project, update, exportJson, importJson, resetProject } = useStudio();
  const [loading, setLoading] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<{ message: string; needKey?: boolean } | null>(null);
  const [fileError, setFileError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const generate = async () => {
    setConfirm(false);
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/music/lyrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: project.topic, genre: project.genre }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError({ message: data.error || "가사를 만들지 못했습니다.", needKey: data.needApiKey });
        return;
      }
      update((p) => ({ ...p, title: data.title, sunoStyle: data.sunoStyle, lyrics: data.lyrics, scenes: [], mood: "" }));
    } catch {
      setError({ message: "네트워크 오류로 가사를 만들지 못했습니다. 잠시 뒤 다시 시도해주세요." });
    } finally {
      setLoading(false);
    }
  };

  const hasLyrics = project.lyrics.trim().length > 0;

  return (
    <div className="space-y-6">
      <StepHeader step={1} title="음악·가사" desc="주제와 장르로 AI가 가사와 Suno 스타일을 쓰거나, 이미 있는 가사를 직접 붙여 넣습니다." />

      <Card className="space-y-4">
        <h2 className="text-sm font-bold text-gray-900">AI 가사 생성</h2>
        <div className="grid gap-3 sm:grid-cols-[1fr_200px]">
          <Field label="노래 주제" hint="예: 이별, 바다, 우주">
            <input className={INPUT} value={project.topic} maxLength={120} onChange={(e) => update((p) => ({ ...p, topic: e.target.value }))} placeholder="주제를 입력하세요" />
          </Field>
          <Field label="장르 선택">
            <select className={SELECT} value={project.genre} onChange={(e) => update((p) => ({ ...p, genre: e.target.value }))}>
              {GENRES.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" disabled={loading || !project.topic.trim()} onClick={() => (hasLyrics ? setConfirm(true) : void generate())} className={BTN_PRIMARY}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
            {hasLyrics ? "가사 다시 생성" : "가사 생성하기"}
          </button>
          {loading && <span className="text-xs text-gray-500">AI가 가사를 쓰는 중입니다…</span>}
        </div>
        {confirm && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <p>지금 가사와 만들어 둔 스토리보드가 새 내용으로 바뀝니다. 계속할까요?</p>
            <div className="mt-2 flex gap-2">
              <button type="button" onClick={() => void generate()} className={BTN_PRIMARY}>
                다시 생성
              </button>
              <button type="button" onClick={() => setConfirm(false)} className={BTN_GHOST}>
                취소
              </button>
            </div>
          </div>
        )}
        {error && <ErrorNote message={error.message} needKey={error.needKey} />}
        <p className="text-[11px] text-gray-500">회원님 본인의 Gemini API 키로 호출되며(텍스트 1회), 이미지·영상 생성만큼 큰 비용은 아닙니다.</p>
      </Card>

      <Card className="space-y-4">
        <h2 className="text-sm font-bold text-gray-900">음악 프로젝트 상세</h2>
        <div>
          <div className="mb-1 flex items-center justify-between">
            <span className="text-xs font-bold text-gray-700">노래 제목</span>
            <CopyButton text={project.title} label="노래 제목" />
          </div>
          <input className={INPUT} value={project.title} maxLength={60} onChange={(e) => update((p) => ({ ...p, title: e.target.value }))} />
        </div>
        <div>
          <div className="mb-1 flex items-center justify-between">
            <span className="text-xs font-bold text-gray-700">Suno 스타일</span>
            <CopyButton text={project.sunoStyle} label="Suno 스타일" />
          </div>
          <input className={INPUT} value={project.sunoStyle} maxLength={300} onChange={(e) => update((p) => ({ ...p, sunoStyle: e.target.value }))} placeholder="Ambient, Ballad, Piano, Emotional, 70BPM" />
        </div>
        <div>
          <div className="mb-1 flex items-center justify-between">
            <span className="text-xs font-bold text-gray-700">노래 가사</span>
            <CopyButton text={project.lyrics} label="노래 가사" />
          </div>
          <textarea className={`${INPUT} min-h-56 font-mono`} value={project.lyrics} maxLength={3000} onChange={(e) => update((p) => ({ ...p, lyrics: e.target.value }))} placeholder="[Verse 1]&#10;가사를 직접 붙여 넣어도 됩니다." />
        </div>
        <p className="text-[11px] text-gray-500">제목·스타일·가사는 Suno에 그대로 붙여 넣어 음악을 만들 수 있습니다. 음악 파일 자체는 이 프로그램에서 만들지 않습니다.</p>
      </Card>

      <Card className="space-y-3">
        <h2 className="text-sm font-bold text-gray-900">프로젝트 관리</h2>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={BTN_GHOST} onClick={exportJson}>
            <Download className="h-4 w-4" /> 설정 내보내기
          </button>
          <button type="button" className={BTN_GHOST} onClick={() => fileRef.current?.click()}>
            <FileUp className="h-4 w-4" /> 불러오기
          </button>
          <button type="button" className={BTN_GHOST} onClick={() => confirmReset(resetProject)}>
            새로 시작
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) setFileError((await importJson(file)) ?? "");
            }}
          />
        </div>
        {fileError && <ErrorNote message={fileError} />}
        <p className="text-[11px] text-gray-500">글(가사·스토리보드·설정)은 이 브라우저에 자동 저장됩니다. 이미지·영상은 용량이 커서 저장하지 않으니 장면 제작 단계에서 내려받아 보관하세요.</p>
      </Card>

      <div className="flex justify-end">
        <Link href="/storyboard" aria-disabled={!hasLyrics} className={`${BTN_PRIMARY} ${hasLyrics ? "" : "pointer-events-none opacity-50"}`}>
          다음: 스토리보드 →
        </Link>
      </div>
    </div>
  );
}

function confirmReset(reset: () => void) {
  if (window.confirm("지금 작업 중인 가사·스토리보드·설정이 모두 지워집니다. 새로 시작할까요?")) reset();
}
