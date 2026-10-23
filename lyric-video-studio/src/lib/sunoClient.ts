"use client";
// v1.06 음악(SUNO) 자동화 곡의 음악·커버를 서명 주소로 받아 File로 만든다.
// 곡 가져오기(SunoImportCard)와 보관함 작업 다시 열기(StudioContext)가 함께 쓴다. Suno 호출은 없다(저장소 파일만 받음).
import { api } from "@/components/ui/api";

export type SunoVariantInfo = { id: string; title: string; lyrics: string; audioUrl: string; coverUrl: string | null; canTime: boolean };

const extOf = (type: string) => (/wav/.test(type) ? "wav" : /ogg/.test(type) ? "ogg" : /mp4|m4a|aac/.test(type) ? "m4a" : "mp3");
const safeName = (s: string) => s.replace(/[\\/:*?"<>|]/g, "_").trim().slice(0, 60) || "suno-song";

async function download(url: string, what: string): Promise<Blob> {
  let res: Response;
  try { res = await fetch(url, { cache: "no-store" }); } catch { throw new Error(`${what}을 받지 못했습니다. 네트워크를 확인해 주세요.`); }
  if (!res.ok) throw new Error(`${what}을 받지 못했습니다(${res.status}). 잠시 후 다시 시도해 주세요.`);
  return res.blob();
}

/** 변주 정보 + 음악 File + 커버 File(없거나 실패하면 null) */
export async function fetchSunoMedia(variantId: string, onStep?: (text: string) => void) {
  onStep?.("곡 정보를 확인하는 중…");
  const info = (await api<{ variant: SunoVariantInfo }>(`/api/suno/tracks?variant=${variantId}`)).variant;
  onStep?.("음악 파일을 받는 중…");
  const audio = await download(info.audioUrl, "음악 파일");
  const type = audio.type && audio.type !== "application/octet-stream" ? audio.type : "audio/mpeg";
  const audioFile = new File([audio], `${safeName(info.title)}.${extOf(type)}`, { type });
  let coverFile: File | null = null;
  if (info.coverUrl) {
    try {
      const img = await download(info.coverUrl, "커버");
      if (/^image\//.test(img.type)) coverFile = new File([img], `${safeName(info.title)}-cover.${img.type.split("/")[1] || "jpg"}`, { type: img.type });
    } catch { /* 커버는 없어도 된다 */ }
  }
  return { info, audioFile, coverFile };
}
