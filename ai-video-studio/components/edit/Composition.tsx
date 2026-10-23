"use client";

// 2차 영상 합치기 — Remotion 구성(그리기 층). 시간 계산은 lib/edit/timeline.ts(순수 함수)에 두고 여기서는 그리기만 한다.
// 브라우저 렌더 제약(A-0 확인): 영상·소리는 @remotion/media의 <Video>·<Audio>, 한글은 SVG <text> + @remotion/google-fonts.
import { AbsoluteFill, Sequence, useCurrentFrame } from "remotion";
import { Audio, Video } from "@remotion/media";
import { loadFont } from "@remotion/google-fonts/NotoSansKR";
import { CAPTION_SIZE_SCALE, captionMaxChars, dimensions, fadeOpacity, layout, musicVolume, sceneCaptions, wrapCaption, type CaptionStyle, type EditProject, type Segment } from "@/lib/edit/timeline";

// 굵기 하나만 미리 불러온다(Noto Sans KR은 파일이 많이 나뉘어 있음)
const { fontFamily } = loadFont("normal", { weights: ["900"], subsets: ["korean", "latin"] });

export type EditCompositionProps = { project: EditProject };

const FILL: Record<CaptionStyle, string> = { band: "#ffffff", yellow: "#ffe14d", outline: "#ffffff", pop: "#7dd3fc" };

function Caption({ text, project, width, height }: { text: string; project: EditProject; width: number; height: number }) {
  const scale = CAPTION_SIZE_SCALE[project.captionSize ?? "m"];
  const lines = wrapCaption(text, Math.round(captionMaxChars(project.aspect) / scale));
  if (!lines.length) return null;
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
  const caption = sceneCaptions(seg.clip, seg.durationInFrames).find((c) => frame >= c.from && frame < c.to);
  return (
    <AbsoluteFill style={{ opacity: fadeOpacity(frame, seg.durationInFrames, project.transition) }}>
      <Video src={seg.clip.src} trimBefore={seg.trimBeforeFrames || undefined} muted={!project.clipAudio} objectFit="cover" style={{ width, height }} />
      {seg.clip.voice && <Audio src={seg.clip.voice.src} />}
      {caption && <Caption text={caption.text} project={project} width={width} height={height} />}
    </AbsoluteFill>
  );
}

export function EditComposition({ project }: EditCompositionProps) {
  const { width, height } = dimensions(project.aspect, project.quality);
  const { segments, totalFrames } = layout(project);
  return (
    <AbsoluteFill style={{ backgroundColor: "#000000" }}>
      {segments.map((seg) => (
        <Sequence key={seg.clip.id} from={seg.from} durationInFrames={seg.durationInFrames} layout="none">
          <Scene seg={seg} project={project} width={width} height={height} />
        </Sequence>
      ))}
      {project.music && (
        <Audio src={project.music.src} volume={(f) => musicVolume(f, totalFrames, project.music?.volume ?? 0.8, project.music?.fadeOut ?? true)} />
      )}
    </AbsoluteFill>
  );
}
