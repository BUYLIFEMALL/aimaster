// 1단계(v1.01) 서버 명령 정책 — 플랜 docs/PLAN_20261024_INITIAL_BUILD.md §4.
// 원본 litpage의 기능 중 ① AIMaster 통합 계정이 대신 맡는 것 ② 다음 단계로 미룬 것 ③ 회원끼리 데이터가 섞이는 것은
// 서버에서 막는다(화면에서 숨겨도 명령을 직접 보낼 수 있으므로 서버가 기준). 단계가 열리면 해당 줄을 지운다.

export const STAGE_MESSAGE = '이 기능은 아직 준비 중입니다. 다음 업데이트에서 열릴 예정입니다.';
export const ACCOUNT_MESSAGE = '계정 설정은 AIMaster 메인 사이트에서 관리합니다.';

/** ① AIMaster 통합 계정이 관리: 로그인·비밀번호·인증·이메일·계정 전환·탈퇴 */
const ACCOUNT_RPCS = new Set([
  'checkSignInMethods', 'sendSignInCode', 'signInWithEmail', 'changePassword', 'removePassword',
  'startTotpEnrollment', 'completeTotpEnrollment', 'renameMfaFactor', 'deleteMfaFactor', 'disableMfa', 'regenerateBackupCodes', 'verifyMfa',
  'passkeyRegistrationOptions', 'registerPasskey', 'updatePasskeyName', 'deletePasskey', 'passkeyLoginOptions', 'passkeyLogin',
  'addSecondaryEmail', 'verifySecondaryEmail', 'removeSecondaryEmail', 'makeEmailPrimary', 'changeEmail', 'deleteAccount',
  'logoutOtherSessions', 'revokeSession', 'logoutAllAccounts', 'beginAddAccount', 'switchAccount', 'removeAccount',
]);

/** ② 다음 단계로 미룸: 3단계 협업(초대·공유·공개), 2단계 AI, 4단계 에이전트·자동화·개발자 API */
const LATER_RPCS = new Set([
  // 3단계: 다른 사람과 공유·초대·공개 — U13(2026-11-11)에서 회원 초대·페이지 공유·접근 요청·멤버/게스트 관리를 엶(초대 대상은 runtime.ts → collab.ts가 AIMaster 회원·이용 권한 확인).
  // U13 보강(2026-11-11): 게스트 본인의 멤버 자격 요청(requestWorkspaceMembership)·주인 승인(resolveMemberRequest)도 엶 — 아무 이메일이나 요청하는 requestMembers는 닫음
  // 계속 닫음: 초대 링크·도메인 자동 합류·팀 링크·공개 페이지/폼/사이트(주인님 결정: 초대 링크는 닫은 채)
  'setSpaceDomain', 'resetInviteLink', 'setInviteLinkEnabled', 'joinSpaceByInviteLink',
  'requestMembers', 'setAllowedEmailDomains', 'setMemberExpiration', 'transferPrivatePages',
  'joinWorkspace', 'joinTeamByInviteLink', 'getTeamInviteLink', 'resetTeamInviteLink', 'getTeamInvite',
  'requestMembershipByTeamInvite', 'requestJoinTeam',
  'getPublishedPage', 'duplicatePublicPage', 'requestGuestInvite',
  'requestRestrictedMemberAccess', 'getPublicPages',
  'getPublicForm', 'submitFormResponse', 'emailFormResponse', 'setSiteSettings', 'getSite', 'getSiteHome', 'searchSite',
  // 4단계 자동화: U11(2026-11-10)에서 엶 — saveAutomation·setAutomationStatus·deleteAutomation·duplicateAutomation·runButtonServerSteps.
  // 단, 웹훅(바깥 호출, U14 판단)·에이전트(U12) 동작이 든 자동화는 아래 stageBodyBlock이 거절한다.
  // 회의록: U6-A(2026-10-24)에서 정지·요약, U6-B(2026-11-03)에서 음성 파일 받아쓰기(회원 Gemini·OpenAI 키)를 엶
  // U3 이후에도 닫음: 외부 연결·MCP(U14), AI 채팅 공유(협업 단계), AI 그림(U2 숨김 → ai-image-studio)
  'aiListConnections', 'aiUpdateConnection', 'aiRemoveConnection', 'aiDisconnectAllConnections', 'aiUpdateMcpAllowlist',
  'aiShareThread', 'aiSharedThreads',
  'aiImageStatus', 'aiGenerateImageBlock', 'aiEditImageBlock', 'aiImageInfo', 'aiGenerateImage',
  // ③ 회원끼리 섞임: 템플릿 후기는 다른 모든 회원에게 보인다
  'reviewTemplate',
  // 원본 시험 전용
  'flushAutomationsForTests',
]);

/**
 * U12 업무 비서(2026-11-10, 플랜 docs/PLAN_20261110_U12_AGENT.md — 주인님 권장안 승인): 맞춤 에이전트를 연다.
 * 다만 다른 회원과 나누는 것(공유·권한·주인 넘기기 → U13 협업)과 바깥 연결(MCP 등 → U14)은 계속 닫는다.
 */
const AGENT_CLOSED_RPCS = new Set([
  'getAgentSharing', 'setAgentPermissions', 'transferAgentOwnership',
  'addAgentConnection', 'refreshAgentConnection', 'removeAgentConnection', 'updateAgentConnection',
]);

function laterByPrefix(name: string): boolean {
  return (
    /^dev[A-Z]/.test(name) || // 개발자 API·웹훅 (4단계)
    /^mcp[A-Z]/.test(name) || // MCP 연결 (4단계)
    AGENT_CLOSED_RPCS.has(name) || // U12: 에이전트 공유·바깥 연결만 닫음
    /^admin[A-Z]/.test(name) // 워크스페이스 관리자 고급 기능(다른 회원 관련)
  );
}

export const AUTOMATION_STEP_MESSAGE = '웹훅 동작은 아직 준비 중입니다. 이 동작을 빼고 저장해 주세요.';
/** U11: 아직 열지 않은 자동화 동작(웹훅 = 운영자 서버의 바깥 호출 → U14). 에이전트 동작은 U12(2026-11-10)에서 엶 */
// 2026-11-13(주인님 「권장안대로」): 웹훅 동작 엶 — 회원별 제한은 litpage/server/aimasterWebhookGuard.ts
const LATER_AUTOMATION_STEPS = new Set<string>([]);

/** 명령 내용까지 봐야 막을 수 있는 것(U11 자동화 저장). 원본 명령 이름만으로는 열린 명령이다. */
export function stageBodyBlock(name: string, body: unknown): { status: number; message: string } | null {
  if (name !== 'saveAutomation') return null;
  const actions = (body as { automation?: { actions?: unknown } } | null)?.automation?.actions;
  if (!Array.isArray(actions)) return null;
  const hit = actions.some((a) => a && typeof a === 'object' && LATER_AUTOMATION_STEPS.has(String((a as { type?: unknown }).type)));
  return hit ? { status: 403, message: AUTOMATION_STEP_MESSAGE } : null;
}

export function stageBlock(name: string): { status: number; message: string } | null {
  if (ACCOUNT_RPCS.has(name)) return { status: 403, message: ACCOUNT_MESSAGE };
  if (LATER_RPCS.has(name) || laterByPrefix(name)) return { status: 403, message: STAGE_MESSAGE };
  return null;
}
