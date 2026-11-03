// U6-B: 회원 키 음성 파일 받아쓰기 — 키에 따른 방식 선택, Google 주소 검사, 결과 해석(유료 호출 없음)
import { describe, expect, it } from 'vitest';
import { withMemberAiKeys } from '../../src/litpage/server/ai/providers/config.ts';
import {
  isAllowedFileRef, isAllowedOrigin, memberSttMode, parseGeminiSegments, textToSegments,
} from '../../src/litpage/server/meetings/memberStt.ts';

describe('받아쓰기 방식 선택(회원 본인 키)', () => {
  it('Gemini 키가 있으면 Gemini, OpenAI 키만 있으면 OpenAI, Claude 키만 있으면 없음', () => {
    expect(withMemberAiKeys({ geminiKey: 'g-key', openaiKey: 'o-key' }, () => memberSttMode())).toBe('gemini');
    expect(withMemberAiKeys({ openaiKey: 'o-key' }, () => memberSttMode())).toBe('openai');
    expect(withMemberAiKeys({ anthropicKey: 'a-key' }, () => memberSttMode())).toBeNull();
  });
});

describe('Google 직접 업로드 검사', () => {
  it('운영·미리보기·내 PC 주소만 허용한다', () => {
    expect(isAllowedOrigin('https://ai-work-workspace.buylife.xyz')).toBe(true);
    expect(isAllowedOrigin('https://ai-work-workspace-abc123-buylife.vercel.app')).toBe(true);
    expect(isAllowedOrigin('http://localhost:3000')).toBe(true);
    expect(isAllowedOrigin('https://evil.example.com')).toBe(false);
  });
  it('Google 파일 주소 모양만 받는다', () => {
    expect(isAllowedFileRef('files/abc123', 'https://generativelanguage.googleapis.com/v1beta/files/abc123')).toBe(true);
    expect(isAllowedFileRef('files/abc123', 'https://evil.example.com/v1beta/files/abc123')).toBe(false);
    expect(isAllowedFileRef('../files/x', 'https://generativelanguage.googleapis.com/v1beta/../files/x')).toBe(false);
  });
});

describe('받아쓰기 결과 해석', () => {
  it('Gemini 결과의 화자·시각을 줄로 바꾼다', () => {
    const out = parseGeminiSegments(JSON.stringify({ segments: [
      { speaker: '화자 1', start_seconds: 0, end_seconds: 2.5, text: '안녕하세요.' },
      { speaker: '화자 2', start_seconds: 3, text: '  반갑습니다  ' },
      { speaker: '화자 1', start_seconds: 5, text: '   ' },
    ] }));
    expect(out).toEqual([
      { text: '안녕하세요.', speaker: '화자 1', startMs: 0, endMs: 2500 },
      { text: '반갑습니다', speaker: '화자 2', startMs: 3000, endMs: undefined },
    ]);
  });
  it('JSON이 아니면 안내 오류를 낸다', () => {
    expect(() => parseGeminiSegments('잘림')).toThrow(/받아쓰기 결과/);
  });
  it('OpenAI 글은 몇 문장씩 묶는다', () => {
    const long = Array.from({ length: 30 }, (_, i) => `${i}번째 문장은 회의 내용을 담고 있습니다.`).join(' ');
    const out = textToSegments(long);
    expect(out.length).toBeGreaterThan(1);
    expect(out.every((s) => s.speaker === '화자 1' && s.text.length <= 450)).toBe(true);
    expect(out.map((s) => s.text).join(' ')).toBe(long);
  });
});
