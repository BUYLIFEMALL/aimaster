"use client";

// [공용 기준 코드 `video-edit-composition` — 기준: ai-video-studio/components/edit/Composition.tsx, 사본: music-video-studio/src/components/edit/Composition.tsx.
//  사본은 직접 고치지 말고 기준을 고친 뒤 `node scripts/check-shared-modules.mjs --sync`. 함께 쓰는 기준: `video-edit-timeline`·`video-edit-voice`]
// 영상 합치기 — Remotion 구성(그리기 층). 시간 계산은 lib/edit/timeline.ts(순수 함수)에 두고 여기서는 그리기만 한다.
// 브라우저 렌더 제약(A-0 확인): 영상·소리는 @remotion/media의 <Video>·<Audio>, 한글은 SVG <text> + @remotion/google-fonts.
import { useLayoutEffect } from "react";
import { AbsoluteFill, Img, Sequence, interpolate, useCurrentFrame } from "remotion";
import { Audio, Video } from "@remotion/media";
import { loadFont as loadNotoKR } from "@remotion/google-fonts/NotoSansKR";
import { loadFont as loadNotoJP } from "@remotion/google-fonts/NotoSansJP";
import { loadFont as loadNotoSC } from "@remotion/google-fonts/NotoSansSC";
import { markFrameStart } from "@/lib/edit/renderTrace";
import { CAPTION_SIZE_SCALE, FPS, captionMaxChars, dimensions, duckRanges, layout, musicVolume, sceneCaptions, segmentOpacity, wrapCaption, type CaptionStyle, type EditLang, type EditProject, type Segment } from "@/lib/edit/timeline";

// 굵기 하나만 미리 불러온다(Noto Sans KR은 파일이 많이 나뉘어 있음). 한국어·영어·베트남어는 KR 글꼴 하나로 되고,
// V2 언어판(2026-11-06) 일본어·중국어 자막은 그 언어판을 만들 때만 JP·SC 글꼴을 더 불러온다
const notoKR = loadNotoKR("normal", { weights: ["900"], subsets: ["korean", "latin", "latin-ext", "vietnamese"] });
const FONT_LOADERS: Record<EditLang, () => { fontFamily: string }> = {
  ko: () => notoKR,
  en: () => notoKR,
  vi: () => notoKR,
  ja: () => loadNotoJP("normal", { weights: ["900"], subsets: ["japanese", "latin"] }),
  zh: () => loadNotoSC("normal", { weights: ["900"], subsets: ["chinese-simplified", "latin"] }),
};
const loadedFonts: Partial<Record<EditLang, string>> = {};
function fontFor(lang: EditLang = "ko"): string {
  return (loadedFonts[lang] ??= FONT_LOADERS[lang]().fontFamily);
}

export type EditCompositionProps = { project: EditProject };

// 전체 보이기(흐린 배경)용 — 겹쳐 그리려고 절대 위치
const FULL = { position: "absolute", inset: 0 } as const;
const BLUR = "blur(28px) brightness(0.6)";

const FILL: Record<CaptionStyle, string> = { band: "#ffffff", yellow: "#ffe14d", outline: "#ffffff", pop: "#7dd3fc" };

function Caption({ text, project, width, height }: { text: string; project: EditProject; width: number; height: number }) {
  const scale = CAPTION_SIZE_SCALE[project.captionSize ?? "m"];
  const lines = wrapCaption(text, Math.round(captionMaxChars(project.aspect, project.lang) / scale));
  if (!lines.length) return null;
  const fontFamily = fontFor(project.lang);
  const size = Math.round(Math.min(width, height) * (project.aspect === "16:9" ? 0.075 : 0.06) * scale);
  const lineH = Math.round(size * 1.3);
  const blockH = lineH * lines.length;
  const centerY = project.captionPosition === "top" ? height * 0.14 : project.captionPosition === "middle" ? height * 0.5 : height * 0.82;
  const top = Math.round(centerY - blockH / 2);
  const style = project.captionStyle;
  const stroke = style === "band" ? undefined : "#000000";
  return (
    <svg width={width} height={height} style={{ position: "absolute", inset: 0 }}>
      {style === "band" && <rect x={0} y={top - size * 0.35} width={width} height={blockH + size * 0.5} fill="rgba(0,0,0,0.55)" />}
      {lines.map((line, i) => (
        <text key={i} x={width / 2} y={top + lineH * i + size} textAnchor="middle" fontFamily={fontFamily} fontWeight={900} fontSize={size}
          fill={FILL[style]} stroke={stroke} strokeWidth={stroke ? Math.max(4, Math.round(size * 0.14)) : undefined} strokeLinejoin="round" paintOrder="stroke">
          {line}
        </text>
      ))}
    </svg>
  );
}

function Scene({ seg, project, width, height }: { seg: Segment; project: EditProject; width: number; height: number }) {
  const frame = useCurrentFrame();
  // 내레이션 음성이 있으면 말하는 속도에 맞춘 자막, 없으면 장면 자막 한 줄
  // 겹쳐 바꾸기에서 뒤 장면과 겹치는 동안에는 이 장면 자막을 숨긴다(자막 두 줄이 겹치지 않게)
  const caption = frame < seg.durationInFrames - seg.overlapOut ? sceneCaptions(seg.clip, seg.durationInFrames, project.lang).find((c) => frame >= c.from && frame < c.to) : undefined;
  // 내레이션에 맞춰 늘린 장면(hold)은 영상을 반복 재생 — 뒤 자르기가 있으면 남은 구간만 반복
  const held = (seg.clip.hold ?? 0) > 0;
  const trimAfter = held && seg.clip.trimEnd > 0 ? Math.round((seg.clip.duration - seg.clip.trimEnd) * FPS) : undefined;
  const blur = seg.clip.fit === "blur";
  return (
    <AbsoluteFill style={{ opacity: segmentOpacity(frame, seg, project.transition) }}>
      {seg.clip.kind === "image" ? (
        // 사진 장면: 장면 동안 1.0 → 1.08배로 천천히 확대(전체 보이기면 뒤에 같은 사진을 흐리게 깔고 앞은 잘리지 않게)
        <>
          {blur && <Img src={seg.clip.src} style={{ ...FULL, width, height, objectFit: "cover", filter: BLUR }} />}
          <Img src={seg.clip.src} style={{ ...FULL, width, height, objectFit: blur ? "contain" : "cover", transform: `scale(${interpolate(frame, [0, seg.durationInFrames], [1, 1.08])})` }} />
        </>
      ) : (
        <>
          {/* 2026-11-09 전체 보이기: 뒤에 같은 영상(소리 없음)을 꽉 채워 흐리게, 앞 영상은 잘리지 않게 — 영상을 두 번 그려 렌더가 조금 느려짐 */}
          {blur && <Video src={seg.clip.src} trimBefore={seg.trimBeforeFrames || undefined} trimAfter={trimAfter} muted loop={seg.clip.loop || held} objectFit="cover" style={{ ...FULL, width, height, filter: BLUR }} />}
          <Video src={seg.clip.src} trimBefore={seg.trimBeforeFrames || undefined} trimAfter={trimAfter} muted={!project.clipAudio} loop={seg.clip.loop || held} objectFit={blur ? "contain" : "cover"} style={{ ...FULL, width, height }} />
        </>
      )}
      {seg.clip.voice && <Audio src={seg.clip.voice.src} />}
      {caption && <Caption text={caption.text} project={project} width={width} height={height} />}
    </AbsoluteFill>
  );
}

export function EditComposition({ project }: EditCompositionProps) {
  const { width, height } = dimensions(project.aspect, project.quality);
  const { segments, totalFrames } = layout(project);
  // 내레이션이 나오는 동안 배경음악을 줄인다(설정에서 끌 수 있음)
  const ducks = project.music && project.music.duck !== false ? duckRanges(project) : [];
  // v1.23 ?render=trace: 장면이 바뀐 시각(렌더 중 trace일 때만 기록, 그 밖에는 아무 일 안 함)
  const frame = useCurrentFrame();
  useLayoutEffect(() => markFrameStart(frame), [frame]);
  return (
    <AbsoluteFill style={{ backgroundColor: "#000000" }}>
      {segments.map((seg) => (
        <Sequence key={seg.clip.id} from={seg.from} durationInFrames={seg.durationInFrames} layout="none">
          <Scene seg={seg} project={project} width={width} height={height} />
        </Sequence>
      ))}
      {project.music && (
        <Audio src={project.music.src} volume={(f) => musicVolume(f, totalFrames, project.music?.volume ?? 0.8, project.music?.fadeOut ?? true, ducks)} />
      )}
    </AbsoluteFill>
  );
}
