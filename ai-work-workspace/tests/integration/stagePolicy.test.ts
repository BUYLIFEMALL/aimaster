// U6-A: 회의록 정지·요약은 열리고, 음성 파일 받아쓰기(U6-B)·외부 연결은 계속 닫혀 있는지
import { describe, expect, it } from 'vitest';
import { stageBlock } from '@/server/stagePolicy';

describe('단계 정책(U6-A)', () => {
  it('회의록 정지·요약은 열려 있다', () => {
    for (const name of ['meetingStart', 'meetingAppend', 'meetingStop', 'meetingSummarize']) expect(stageBlock(name)).toBeNull();
  });
  it('음성 파일 받아쓰기는 U6-B 전까지 닫혀 있다', () => {
    for (const name of ['meetingUploadAudio', 'meetingRetryTranscription']) expect(stageBlock(name)?.status).toBe(403);
  });
  it('외부 연결·AI 그림은 계속 닫혀 있다', () => {
    for (const name of ['aiListConnections', 'aiGenerateImage']) expect(stageBlock(name)).not.toBeNull();
  });
});
