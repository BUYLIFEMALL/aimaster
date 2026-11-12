// 원본 서버 영어 오류 문구 → 한국어(2026-11-13)
import { describe, expect, it } from 'vitest';
import { koErrorBody, koErrorMessage } from '@/server/errorKo';

describe('오류 문구 한국어', () => {
  it('서버 오류 문구 표·화면 번역 사전의 문구를 바꾸고, 모르는 문구는 그대로 둔다', () => {
    expect(koErrorMessage('We couldn’t find that agent')).toBe('에이전트를 찾을 수 없습니다.');
    expect(koErrorMessage('Not found')).toBe('찾을 수 없음');
    expect(koErrorMessage('알 수 없는 문구 그대로')).toBe('알 수 없는 문구 그대로');
  });
  it('오류 응답의 message만 바꾸고 성공 응답·다른 칸은 그대로', () => {
    expect(koErrorBody(404, { name: 'NotFound', message: 'Template not found', extra: 1 })).toEqual({ name: 'NotFound', message: '템플릿을 찾을 수 없습니다.', extra: 1 });
    const ok = { message: 'Not found' };
    expect(koErrorBody(200, ok)).toBe(ok);
    expect(koErrorBody(500, null)).toBe(null);
  });
});
