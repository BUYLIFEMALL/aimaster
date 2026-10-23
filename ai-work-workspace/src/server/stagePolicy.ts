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
  // 3단계: 다른 사람과 공유·초대·공개
  'inviteMembers', 'setSpaceDomain', 'setMemberRole', 'removeMember', 'resetInviteLink', 'setInviteLinkEnabled', 'joinSpaceByInviteLink',
  'requestMembers', 'resolveMemberRequest', 'setAllowedEmailDomains', 'upgradeGuests', 'removeGuest', 'setMemberExpiration', 'transferPrivatePages',
  'joinWorkspace', 'requestWorkspaceMembership', 'joinTeamByInviteLink', 'getTeamInviteLink', 'resetTeamInviteLink', 'getTeamInvite',
  'requestMembershipByTeamInvite', 'requestJoinTeam',
  'invitePagePermissions', 'restrictPageAccess', 'restoreInheritedAccess', 'getPublishedPage', 'duplicatePublicPage', 'requestGuestInvite',
  'requestRestrictedMemberAccess', 'requestPageAccess', 'decideAccessRequest', 'getPublicPages',
  'getPublicForm', 'submitFormResponse', 'emailFormResponse', 'setSiteSettings', 'getSite', 'getSiteHome', 'searchSite',
  // 4단계: 자동화(웹훅 등 바깥 호출 포함)
  'saveAutomation', 'setAutomationStatus', 'deleteAutomation', 'duplicateAutomation', 'runButtonServerSteps',
  // 2·4단계: AI·에이전트·회의록 (회원 본인 키 연결 전까지 닫음)
  'meetingStop', 'meetingSummarize', 'meetingUploadAudio', 'meetingRetryTranscription',
  // ③ 회원끼리 섞임: 템플릿 후기는 다른 모든 회원에게 보인다
  'reviewTemplate',
  // 원본 시험 전용
  'flushAutomationsForTests',
]);

function laterByPrefix(name: string): boolean {
  return (
    /^dev[A-Z]/.test(name) || // 개발자 API·웹훅 (4단계)
    /^mcp[A-Z]/.test(name) || // MCP 연결 (4단계)
    /^ai[A-Z]/.test(name) || // AI (2단계)
    /Agent/.test(name) || // 맞춤 에이전트 (4단계)
    /^admin[A-Z]/.test(name) // 워크스페이스 관리자 고급 기능(다른 회원 관련)
  );
}

export function stageBlock(name: string): { status: number; message: string } | null {
  if (ACCOUNT_RPCS.has(name)) return { status: 403, message: ACCOUNT_MESSAGE };
  if (LATER_RPCS.has(name) || laterByPrefix(name)) return { status: 403, message: STAGE_MESSAGE };
  return null;
}
