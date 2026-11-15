// U6-A·U6-B: 회의록 정지·요약과 음성 파일 받아쓰기는 열리고, 외부 연결은 계속 닫혀 있는지
import { describe, expect, it } from 'vitest';
import { stageBlock } from '@/server/stagePolicy';

describe('단계 정책(U6-B)', () => {
  it('회의록 정지·요약은 열려 있다', () => {
    for (const name of ['meetingStart', 'meetingAppend', 'meetingStop', 'meetingSummarize']) expect(stageBlock(name)).toBeNull();
  });
  it('음성 파일 받아쓰기(U6-B)가 열려 있다', () => {
    for (const name of ['meetingUploadAudio', 'meetingRetryTranscription', 'meetingAudioUploadStart', 'meetingAttachAudioFile']) expect(stageBlock(name)).toBeNull();
  });
  it('AI 그림·에이전트 바깥 연결은 계속 닫혀 있다(AI 채팅의 바깥 MCP 연결은 2026-11-15 엶 — mcpGuard.test.ts)', () => {
    for (const name of ['aiGenerateImage', 'addAgentConnection']) expect(stageBlock(name)).not.toBeNull();
  });
});
