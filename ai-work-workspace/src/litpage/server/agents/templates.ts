// Custom Agent templates : the "Create a new agent" gallery (newAgentModal.v5.*): name, description,
// category tabs, starting instructions and suggested schedule. The instructions are this clone's own text; a template
// creates an unsaved agent whose settings the person reviews and saves.
import type { AgentTrigger } from '#shared/agents.ts';

export type TemplateCategory = 'everyone' | 'eng' | 'marketing' | 'sales' | 'support' | 'other';

export interface AgentTemplate {
  id: string;
  title: string;
  description: string;
  icon: string;
  categories: TemplateCategory[];
  instructions: string;
  /** schedule suggestion (frequency, time) — the time zone is the creator's */
  schedule?: { frequency: 'day' | 'week' | 'month'; weekdays?: number[]; time: string };
  web?: boolean;
  people?: boolean;
  badge?: 'New';
}

// AIMaster U12(2026-11-10, 주인님 결정 5번): 원본 영어 템플릿 12종을 AIMaster 업무에 맞는 한국어 6종으로 바꿈.
// 메일 정리(메일 연결 없음)·웹 조사(웹 검색 끔)·다른 사람 디렉터리가 필요한 템플릿은 뺐다.
const steps = (goal: string, items: string[], output: string, limits: string[]) =>
  `## 목적\n${goal}\n\n## 실행 순서\n${items.map((s, i) => `${i + 1}. ${s}`).join('\n')}\n\n## 결과물\n${output}\n\n## 지킬 것\n${limits.map((s) => `- ${s}`).join('\n')}`;

const COMMON_LIMITS = ['한국어로, 짧고 읽기 쉽게 정리합니다.', '확실하지 않은 내용은 추측하지 말고 「확인 필요」로 표시합니다.', '페이지·데이터를 지우지 않습니다.'];

export const AGENT_TEMPLATES: AgentTemplate[] = [
  {
    id: 'morning-briefing', title: '아침 업무 브리핑', icon: '🧭', categories: ['everyone'],
    description: '평일 아침마다 오늘·이번 주 할 일과 마감, 답이 필요한 일을 한 페이지로 정리합니다',
    schedule: { frequency: 'week', weekdays: [1, 2, 3, 4, 5], time: '08:00' },
    instructions: steps('하루를 시작할 때 무엇이 중요한지 한눈에 알 수 있게 합니다.',
      ['볼 수 있는 페이지·데이터베이스에서 오늘과 이번 주에 마감인 일을 찾습니다.', '내 결정이나 답을 기다리는 일을 모읍니다.', '오늘 회의·일정 중 준비가 필요한 것을 표시합니다.'],
      '「오늘의 업무 브리핑 (날짜)」 페이지 하나 — 꼭 할 일 3개, 마감 목록, 기다리는 답 순서.', COMMON_LIMITS),
  },
  {
    id: 'meeting-prep', title: '회의 준비·정리', icon: '🗓️', categories: ['everyone'],
    description: '회의 전에 관련 자료를 모으고, 회의록이 생기면 할 일과 담당을 뽑아 줍니다',
    instructions: steps('회의 시간을 아깝지 않게 만듭니다.',
      ['회의 전: 관련 페이지·열린 할 일·지난 결정을 모읍니다.', '안건을 다섯 개 이하로 제안합니다.', '회의 뒤 AI 회의록이 생기면 실행 항목을 담당·기한과 함께 할 일로 정리합니다.'],
      '회의 준비 메모와, 회의 뒤 「할 일 목록」 블록이 든 정리 페이지.', COMMON_LIMITS),
  },
  {
    id: 'content-calendar-keeper', title: '콘텐츠 캘린더 정리', icon: '📅', categories: ['marketing'],
    description: '매주 월요일 콘텐츠 캘린더를 살펴 비어 있는 날·늦은 글·이번 주 발행 계획을 알려 줍니다',
    schedule: { frequency: 'week', weekdays: [1], time: '09:00' },
    instructions: steps('콘텐츠 발행이 끊기지 않게 챙깁니다.',
      ['「📅 콘텐츠 캘린더」 데이터베이스에서 이번 주와 다음 주 행을 읽습니다.', '예약일이 지났는데 발행 완료가 아닌 글을 찾습니다.', '채널별로 글이 없는 날을 찾습니다.'],
      '「주간 콘텐츠 점검 (날짜)」 페이지 — 늦은 글, 빈 날, 이번 주 발행 예정 표.', [...COMMON_LIMITS, '캘린더 행의 상태를 바꾸지 말고 제안만 합니다.']),
  },
  {
    id: 'inbox-organizer', title: '받은 업무 정리', icon: '📨', categories: ['everyone'],
    description: '다른 프로그램에서 받은 업무를 매일 저녁 훑어보고 처리할 순서와 요약을 만들어 줍니다',
    schedule: { frequency: 'day', time: '18:00' },
    instructions: steps('다른 자동화 프로그램에서 온 결과를 놓치지 않게 합니다.',
      ['오늘 만들어진 페이지(받은 업무에서 가져온 페이지 포함)를 찾습니다.', '각각 무엇인지 한 줄로 요약합니다.', '내일 먼저 볼 것 세 개를 고릅니다.'],
      '「오늘 받은 업무 요약 (날짜)」 페이지.', COMMON_LIMITS),
  },
  {
    id: 'weekly-report', title: '주간 보고 초안', icon: '📊', categories: ['everyone', 'other'],
    description: '매주 금요일 이번 주에 끝낸 일·진행 중인 일·다음 주 계획으로 보고서 초안을 씁니다',
    schedule: { frequency: 'week', weekdays: [5], time: '16:00' },
    instructions: steps('주간 보고를 쓰는 시간을 줄입니다.',
      ['이번 주에 수정된 페이지와 데이터베이스 행을 살펴봅니다.', '끝낸 일, 진행 중인 일, 막힌 일로 나눕니다.', '다음 주에 할 일을 제안합니다.'],
      '「주간 보고 초안 (날짜)」 페이지 — 그대로 다듬어 보낼 수 있는 문장으로.', COMMON_LIMITS),
  },
  {
    id: 'task-tidy', title: '할 일 정리 도우미', icon: '✅', categories: ['everyone'],
    description: '부탁하면 흩어진 메모·회의록에서 할 일을 찾아 우선순위와 함께 한곳에 모아 줍니다',
    instructions: steps('흩어진 할 일을 한곳에 모읍니다.',
      ['요청받은 페이지(또는 최근 페이지)에서 체크되지 않은 할 일과 「해야 함」 같은 문장을 찾습니다.', '중복을 합치고 마감·중요도로 우선순위를 매깁니다.'],
      '우선순위 순서의 할 일 목록 페이지(원래 위치 링크 포함).', COMMON_LIMITS),
  },
];

export const TEMPLATE_CATEGORIES: { id: TemplateCategory; label: string }[] = [
  { id: 'everyone', label: '모두를 위한' },
  { id: 'marketing', label: '마케팅·콘텐츠' },
  { id: 'other', label: '기타' },
];

export function templateById(id: string | undefined | null): AgentTemplate | undefined {
  return id ? AGENT_TEMPLATES.find((t) => t.id === id) : undefined;
}

/** The template's suggested schedule as a trigger (in the creator's time zone). */
export function templateTriggers(t: AgentTemplate, timeZone: string, today: string): AgentTrigger[] {
  if (!t.schedule) return [];
  return [{
    id: `trg_${t.id.slice(0, 12)}`, type: 'recurrence', enabled: true,
    recurrence: { frequency: t.schedule.frequency, interval: 1, ...(t.schedule.weekdays ? { weekdays: t.schedule.weekdays } : {}), time: t.schedule.time, start: today, time_zone: timeZone },
  }];
}
