import "server-only";

export interface TranscriptItem {
  text: string;
  start: number;
  duration: number;
}

export interface VideoTranscriptResult {
  hasSubtitles: boolean;
  transcript: string;
  items: TranscriptItem[];
  language?: string;
}

/**
 * YouTube 영상 자막(Subtitles) 스크래핑 및 파싱
 */
export async function fetchVideoTranscript(videoId: string): Promise<VideoTranscriptResult> {
  try {
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const res = await fetch(videoUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
      },
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      return { hasSubtitles: false, transcript: "", items: [] };
    }

    const html = await res.text();

    // ytInitialPlayerResponse 추출
    const splitted = html.split('"captions":');
    if (splitted.length <= 1) {
      return { hasSubtitles: false, transcript: "", items: [] };
    }

    const captionsJsonStr = splitted[1].split(',"videoDetails"')[0];
    let captionsData: any;
    try {
      captionsData = JSON.parse(captionsJsonStr);
    } catch {
      // 파싱 실패 시 정규식 검색
      const match = captionsJsonStr.match(/\{"playerCaptionsTracklistRenderer":\{"captionTracks":\[.*?\]\}\}/);
      if (match) {
        captionsData = JSON.parse(match[0]);
      }
    }

    const captionTracks =
      captionsData?.playerCaptionsTracklistRenderer?.captionTracks || [];

    if (captionTracks.length === 0) {
      return { hasSubtitles: false, transcript: "", items: [] };
    }

    // 한국어 트랙 우선, 없으면 첫 번째 트랙 선택
    const koTrack =
      captionTracks.find((t: any) => t.languageCode === "ko" || t.vssId?.includes("ko")) ||
      captionTracks[0];

    if (!koTrack?.baseUrl) {
      return { hasSubtitles: false, transcript: "", items: [] };
    }

    // XML 자막 다운로드
    const transcriptRes = await fetch(koTrack.baseUrl);
    const transcriptXml = await transcriptRes.text();

    // XML 태그 <text start="0.5" dur="2.1">텍스트</text> 파싱
    const items: TranscriptItem[] = [];
    const regex = /<text start="([\d\.]+)" dur="([\d\.]+)">(.*?)<\/text>/g;
    let match;

    while ((match = regex.exec(transcriptXml)) !== null) {
      const rawText = match[3]
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/<[^>]+>/g, "")
        .trim();

      if (rawText) {
        items.push({
          start: parseFloat(match[1]),
          duration: parseFloat(match[2]),
          text: rawText,
        });
      }
    }

    const fullTranscript = items.map((i) => i.text).join(" ");

    return {
      hasSubtitles: items.length > 0,
      transcript: fullTranscript,
      items,
      language: koTrack.languageCode || "ko",
    };
  } catch (err) {
    console.warn(`자막 추출 실패 (videoId: ${videoId}):`, err);
    return { hasSubtitles: false, transcript: "", items: [] };
  }
}
