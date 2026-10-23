// Starter template catalog (seeded once per server into the hidden template-gallery space).
// Content is written for Workspace; categories cover work, life, and school.
// 이식판: 예시 내용은 한국어(2026-10-24). 내용을 바꾸면 seed.ts의 TEMPLATE_GALLERY_VERSION을 올려야 운영 DB에 다시 심긴다.
import type { RichText } from '#shared/richtext.ts';
import type { DbSpec, Spec } from './spec.ts';
import { dayOffset } from './spec.ts';

export type TemplateCategory = 'work' | 'life' | 'school';

export interface TemplateDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  cover: string;
  category: TemplateCategory;
  tags: string[];
  creator: string;
  featured?: boolean;
  build: () => Spec;
}

const T = (s: string): Spec => ({ type: 'text', text: s });
const H1 = (s: string): Spec => ({ type: 'header', text: s });
const H2 = (s: string): Spec => ({ type: 'sub_header', text: s });
const H3 = (s: string): Spec => ({ type: 'sub_sub_header', text: s });
const B = (s: string, children?: Spec[]): Spec => ({ type: 'bulleted_list', text: s, ...(children ? { children } : {}) });
const N = (s: string): Spec => ({ type: 'numbered_list', text: s });
const TODO = (s: string, checked = false): Spec => ({ type: 'to_do', text: s, checked });
const CALLOUT = (icon: string, s: string | RichText, color = 'gray_background'): Spec => ({ type: 'callout', icon, text: s, format: { block_color: color } });
const DIV: Spec = { type: 'divider' };
const TOGGLE = (s: string, children: Spec[]): Spec => ({ type: 'toggle', text: s, children });
const QUOTE = (s: string): Spec => ({ type: 'quote', text: s });
const bold = (s: string): RichText => [[s, [['b']]]];

function meetingBody(agenda: string[], notes: string[], actions: [string, boolean][]): Spec[] {
  return [H3('안건'), ...agenda.map((s) => B(s)), H3('메모'), ...notes.map((s) => B(s)), H3('할 일'), ...actions.map(([s, c]) => TODO(s, c))];
}

export const TEMPLATES: TemplateDef[] = [
  {
    id: 'meeting-notes',
    name: '회의록',
    description: '회의마다 안건·결정 사항·할 일을 한 데이터베이스에 모아 언제든 찾아봅니다.',
    icon: '📝',
    cover: '/covers/gradient-2.svg',
    category: 'work',
    tags: ['회의', '문서'],
    creator: 'Workspace',
    featured: true,
    build: () => ({
      type: 'collection_view_page',
      icon: '📝',
      cover: '/covers/gradient-2.svg',
      db: {
        name: '회의록',
        description: '모든 회의, 최근 순.',
        schema: {
          title: { name: '제목', type: 'title' },
          mDat: { name: '날짜', type: 'date' },
          mTyp: { name: '종류', type: 'select', options: [{ value: '주간 회의', color: 'blue' }, { value: '기획', color: 'purple' }, { value: '1:1 면담', color: 'green' }, { value: '회고', color: 'orange' }] },
          mTag: { name: '태그', type: 'multi_select', options: ['기획', '개발', '디자인'] },
        },
        rows: [
          { values: { title: '주간 업무 회의', mDat: { date: dayOffset(-1) }, mTyp: '주간 회의', mTag: ['기획', '개발'] }, icon: '🗓️', children: meetingBody(['지난주 성과', '막힌 일', '이번 주 계획'], ['출시 점검표 80% 완료', 'QA는 수요일 시작'], [['출시 점검표 공유', true], ['QA 회의실 예약', false]]) },
          { values: { title: '4분기 계획 회의', mDat: { date: dayOffset(-3) }, mTyp: '기획', mTag: ['기획'] }, icon: '🎯', children: meetingBody(['목표 점검', '로드맵 우선순위 정하기', '담당자 정하기'], ['신규 회원 안내와 속도 개선에 집중'], [['4분기 목표 초안 작성', false], ['팀에 회의 요약 보내기', false]]) },
          { values: { title: '디자인 검토', mDat: { date: dayOffset(-6) }, mTyp: '회고', mTag: ['디자인'] }, icon: '🎨', children: meetingBody(['새 설정 화면 흐름 살펴보기', '남은 질문'], ['첫 단계를 더 단순하게', '다크 모드도 똑같이 맞추기'], [['시안 수정', true]]) },
        ],
        views: [{ type: 'table', name: '전체 회의', visible: ['mDat', 'mTyp', 'mTag'], sort: [{ property: 'mDat', direction: 'descending' }] }, { type: 'board', name: '종류별', groupBy: 'mTyp', visible: ['mDat'] }],
      },
    }),
  },
  {
    id: 'project-tracker',
    name: '프로젝트 관리',
    description: '아이디어부터 출시까지 프로젝트의 상태·우선순위·진행률을 한눈에 봅니다.',
    icon: '🚀',
    cover: '/covers/gradient-4.svg',
    category: 'work',
    tags: ['프로젝트', '기획 관리'],
    creator: 'Workspace',
    featured: true,
    build: () => ({
      type: 'collection_view_page',
      icon: '🚀',
      cover: '/covers/gradient-4.svg',
      db: {
        name: '프로젝트',
        schema: {
          title: { name: '프로젝트 이름', type: 'title' },
          pSta: { name: '상태', type: 'status', options: ['시작 전', '진행 중', '완료'] },
          pPri: { name: '우선순위', type: 'select', options: [{ value: '높음', color: 'red' }, { value: '보통', color: 'yellow' }, { value: '낮음', color: 'gray' }] },
          pDue: { name: '마감일', type: 'date' },
          pPro: { name: '진행률', type: 'number', number_format: 'percent' },
        },
        rows: [
          { values: { title: '홈페이지 개편', pSta: '진행 중', pPri: '높음', pDue: { date: dayOffset(14) }, pPro: 0.6 }, icon: '🌐', children: [H2('목표'), T('새 브랜드에 맞춰 회사 홈페이지를 새로 단장합니다.'), H2('단계'), TODO('화면 설계', true), TODO('디자인', true), TODO('페이지 만들기'), TODO('오픈')] },
          { values: { title: '모바일 첫 화면 안내', pSta: '시작 전', pPri: '보통', pDue: { date: dayOffset(30) }, pPro: 0 }, icon: '📱', children: [T('처음 쓰는 회원 안내를 3단계로 줄입니다.')] },
          { values: { title: '결제 시스템 이전', pSta: '진행 중', pPri: '높음', pDue: { date: dayOffset(7) }, pPro: 0.35 }, icon: '💳' },
          { values: { title: '고객센터 도움말 정리', pSta: '완료', pPri: '낮음', pDue: { date: dayOffset(-5) }, pPro: 1 }, icon: '📚' },
        ],
        views: [{ type: 'board', name: '상태별', groupBy: 'pSta', visible: ['pPri', 'pDue'] }, { type: 'table', name: '전체 프로젝트' }],
      },
    }),
  },
  {
    id: 'todo-list',
    name: '하루 점검표',
    description: '오늘, 이번 주, 그 다음 할 일을 간단한 점검표로 정리합니다.',
    icon: '✅',
    cover: '/covers/solid-blue.svg',
    category: 'life',
    tags: ['개인', '생산성'],
    creator: 'Workspace',
    featured: true,
    build: () => ({
      type: 'page',
      text: '하루 점검표',
      icon: '✅',
      cover: '/covers/solid-blue.svg',
      children: [
        CALLOUT('💡', '끝난 일은 바로 체크하세요. 항목을 다른 칸으로 끌어 옮기면 일정이 바뀝니다.'),
        H2('오늘'),
        TODO('중요한 메일 답장하기'),
        TODO('30분 집중해서 일하기'),
        TODO('산책하기', true),
        H2('이번 주'),
        TODO('주말 나들이 계획 세우기'),
        TODO('치과 예약 전화하기'),
        TODO('읽던 책 마저 읽기'),
        H2('나중에'),
        TODO('사진 정리하기'),
        TODO('새 요리 배워 보기'),
      ],
    }),
  },
  {
    id: 'weekly-planner',
    name: '주간 계획표',
    description: '요일마다 우선순위와 할 일을 정하고, 한 주를 짧게 돌아봅니다.',
    icon: '🗓️',
    cover: '/covers/gradient-6.svg',
    category: 'life',
    tags: ['개인', '계획'],
    creator: 'Workspace',
    build: () => ({
      type: 'page',
      text: '주간 계획표',
      icon: '🗓️',
      cover: '/covers/gradient-6.svg',
      children: [
        QUOTE('“계획 자체보다 계획하는 과정이 중요하다.”'),
        H2('이번 주 우선순위 3가지'),
        N('프로젝트 진행 상황 공유하기'),
        N('운동 4번 하기'),
        N('가족에게 전화하기'),
        DIV,
        { type: 'column_list', children: [
          { type: 'column', children: [H3('월요일'), TODO('팀 회의'), TODO('헬스장'), H3('화요일'), TODO('초안 쓰기'), H3('수요일'), TODO('작업 검토')] },
          { type: 'column', children: [H3('목요일'), TODO('1:1 면담'), H3('금요일'), TODO('주간 정리'), H3('주말'), TODO('등산'), TODO('반찬 만들기')] },
        ] },
        DIV,
        H2('돌아보기'),
        TOGGLE('이번 주에 좋았던 점은?', [T('')]),
        TOGGLE('더 나아질 수 있는 점은?', [T('')]),
      ],
    }),
  },
  {
    id: 'reading-list',
    name: '독서 목록',
    description: '책·기사·팟캐스트를 모아 다음에 읽을 것과 읽고 난 생각을 기록합니다.',
    icon: '📚',
    cover: '/covers/texture-vintage-paper.svg',
    category: 'life',
    tags: ['개인', '공부'],
    creator: 'Workspace',
    featured: true,
    build: () => ({
      type: 'collection_view_page',
      icon: '📚',
      cover: '/covers/texture-vintage-paper.svg',
      db: {
        name: '독서 목록',
        schema: {
          title: { name: '제목', type: 'title' },
          rAut: { name: '지은이', type: 'text' },
          rSta: { name: '상태', type: 'select', options: [{ value: '읽을 예정', color: 'gray' }, { value: '읽는 중', color: 'blue' }, { value: '다 읽음', color: 'green' }] },
          rTyp: { name: '종류', type: 'select', options: [{ value: '책', color: 'brown' }, { value: '기사', color: 'purple' }, { value: '팟캐스트', color: 'pink' }] },
          rRat: { name: '평점', type: 'select', options: [{ value: '⭐️⭐️⭐️⭐️⭐️', color: 'yellow' }, { value: '⭐️⭐️⭐️⭐️', color: 'yellow' }, { value: '⭐️⭐️⭐️', color: 'yellow' }] },
          rLnk: { name: '링크', type: 'url' },
        },
        rows: [
          { values: { title: '실용주의 프로그래머', rAut: '앤드류 헌트, 데이비드 토머스', rSta: '다 읽음', rTyp: '책', rRat: '⭐️⭐️⭐️⭐️⭐️' }, icon: '📗', children: [H2('핵심 내용'), B('내 일에 정성을 들인다'), B('깨진 창문을 그대로 두지 않는다'), B('탐색할 때는 작게 끝까지 이어 보는 방식이 시제품보다 낫다')] },
          { values: { title: '딥 워크', rAut: '칼 뉴포트', rSta: '읽는 중', rTyp: '책' }, icon: '📘' },
          { values: { title: '제텔카스텐', rAut: '숀케 아렌스', rSta: '읽을 예정', rTyp: '책' }, icon: '📙' },
          { values: { title: '파인만 공부법', rAut: '블로그 글', rSta: '읽을 예정', rTyp: '기사', rLnk: 'https://ko.wikipedia.org/wiki/리처드_파인먼' }, icon: '📰' },
        ],
        views: [{ type: 'board', name: '상태별', groupBy: 'rSta', visible: ['rAut', 'rTyp'] }, { type: 'table', name: '전체' }, { type: 'gallery', name: '갤러리', visible: ['rAut'] }],
      },
    }),
  },
  {
    id: 'journal',
    name: '일기장',
    description: '기분과 태그를 함께 남기는 나만의 하루 기록장입니다.',
    icon: '📓',
    cover: '/covers/gradient-1.svg',
    category: 'life',
    tags: ['개인', '마음 건강'],
    creator: 'Workspace',
    build: () => ({
      type: 'collection_view_page',
      icon: '📓',
      cover: '/covers/gradient-1.svg',
      db: {
        name: '일기장',
        schema: {
          title: { name: '제목', type: 'title' },
          jDat: { name: '날짜', type: 'date' },
          jMoo: { name: '기분', type: 'select', options: [{ value: '😊 아주 좋음', color: 'green' }, { value: '🙂 좋음', color: 'blue' }, { value: '😐 보통', color: 'gray' }, { value: '😔 가라앉음', color: 'purple' }] },
          jTag: { name: '태그', type: 'multi_select', options: ['일', '가족', '건강', '아이디어'] },
        },
        rows: [
          { values: { title: '알찬 월요일', jDat: { date: dayOffset(0) }, jMoo: '😊 아주 좋음', jTag: ['일'] }, children: [T('큰 발표를 끝내고 좋은 반응을 받았다.'), H3('감사한 일'), B('친구와 마신 아침 커피'), B('맑은 날씨')] },
          { values: { title: '긴 산책과 새 아이디어', jDat: { date: dayOffset(-1) }, jMoo: '🙂 좋음', jTag: ['건강', '아이디어'] }, children: [T('8km를 걷고 부업 아이디어를 하나 적어 두었다.')] },
          { values: { title: '느긋한 하루', jDat: { date: dayOffset(-2) }, jMoo: '😐 보통', jTag: ['가족'] } },
        ],
        views: [{ type: 'table', name: '기록', visible: ['jDat', 'jMoo', 'jTag'], sort: [{ property: 'jDat', direction: 'descending' }] }, { type: 'gallery', name: '갤러리', visible: ['jDat', 'jMoo'] }],
      },
    }),
  },
  {
    id: 'travel-planner',
    name: '여행 계획표',
    description: '다음 여행의 일정·준비물·예산을 한 페이지에 정리합니다.',
    icon: '✈️',
    cover: '/covers/gradient-3.svg',
    category: 'life',
    tags: ['여행', '계획'],
    creator: 'Workspace',
    build: () => ({
      type: 'page',
      text: '여행 계획표',
      icon: '✈️',
      cover: '/covers/gradient-3.svg',
      children: [
        CALLOUT('🧳', [['여행지: '], ['제주도', [['b']]], [` · ${dayOffset(30)} → ${dayOffset(33)}`]], 'blue_background'),
        H2('일정'),
        TOGGLE('1일차 — 도착', [B('숙소 체크인'), B('동문시장 저녁')]),
        TOGGLE('2일차 — 동쪽 둘러보기', [B('성산일출봉'), B('섭지코지'), B('해안 카페')]),
        TOGGLE('3일차 — 오름과 숲길', [B('새별오름'), B('사려니숲길')]),
        H2('준비물'),
        TODO('신분증'),
        TODO('충전기'),
        TODO('편한 신발'),
        TODO('자외선 차단제'),
        H2('예산'),
        { type: 'table', tableHeader: true, table: [['항목', '예상', '실제'], ['항공권', '200,000원', ''], ['숙소(3박)', '360,000원', ''], ['식비', '250,000원', ''], ['렌터카·입장료', '180,000원', '']] },
      ],
    }),
  },
  {
    id: 'team-wiki',
    name: '팀 위키',
    description: '신입 안내·일하는 방식·쓰는 도구까지, 팀의 지식을 한곳에 모읍니다.',
    icon: '📖',
    cover: '/covers/pattern-grid.svg',
    category: 'work',
    tags: ['문서', '회사 위키'],
    creator: 'Workspace',
    featured: true,
    build: () => ({
      type: 'page',
      text: '팀 위키',
      icon: '📖',
      cover: '/covers/pattern-grid.svg',
      children: [
        CALLOUT('👋', '팀에 오신 것을 환영합니다! 「신입 안내」부터 읽고 나머지 위키를 둘러보세요.'),
        H2('시작하기'),
        { type: 'page', text: '신입 안내', icon: '🚀', children: [H2('첫 주에 할 일'), TODO('노트북 설정하기'), TODO('안내 담당 동료와 인사하기'), TODO('「일하는 방식」 읽기'), H2('유용한 링크'), B('회사 안내서'), B('복지 안내')] },
        { type: 'page', text: '일하는 방식', icon: '🧭', children: [H2('우리의 원칙'), N('기본은 투명하게 공유'), N('말보다 글로 남기기'), N('작게, 자주 내보내기'), H2('정기 일정'), B('월요일 계획 회의'), B('금요일 결과 공유')] },
        { type: 'page', text: '개발 지침', icon: '🛠️', children: [H2('코드 검토'), B('변경은 작게 나눠 올리기'), B('설명에 「왜」 바꿨는지 적기'), H2('출시 순서'), N('main에 합치기'), N('시험 서버에 배포'), N('간단히 확인한 뒤 운영 반영'), { type: 'code', language: 'Shell', text: 'npm run test && npm run deploy:staging' }] },
        H2('규정'),
        { type: 'page', text: '휴가', icon: '🌴', children: [T('필요한 만큼 쉬세요 — 팀에는 미리 알려 주세요.')] },
        { type: 'page', text: '경비 처리', icon: '🧾', children: [T('영수증은 결제일로부터 30일 안에 제출합니다.')] },
      ],
    }),
  },
  {
    id: 'roadmap',
    name: '제품 로드맵',
    description: '분기마다 만들 기능을 계획하고 팀끼리 진행 상황을 공유합니다.',
    icon: '🗺️',
    cover: '/covers/gradient-5.svg',
    category: 'work',
    tags: ['기획 관리', '프로젝트'],
    creator: 'Workspace',
    build: () => ({
      type: 'collection_view_page',
      icon: '🗺️',
      cover: '/covers/gradient-5.svg',
      db: {
        name: '로드맵',
        schema: {
          title: { name: '기능', type: 'title' },
          rmSt: { name: '상태', type: 'status', options: ['시작 전', '기획 중', '진행 중', '출시'] },
          rmQ: { name: '분기', type: 'select', options: [{ value: '1분기', color: 'gray' }, { value: '2분기', color: 'blue' }, { value: '3분기', color: 'purple' }, { value: '4분기', color: 'green' }] },
          rmTm: { name: '팀', type: 'select', options: [{ value: '성장팀', color: 'orange' }, { value: '플랫폼팀', color: 'blue' }, { value: '모바일팀', color: 'pink' }] },
          rmDt: { name: '목표일', type: 'date' },
        },
        rows: [
          { values: { title: '다크 모드', rmSt: '출시', rmQ: '3분기', rmTm: '플랫폼팀', rmDt: { date: dayOffset(-20) } }, icon: '🌙' },
          { values: { title: '오프라인 동기화', rmSt: '진행 중', rmQ: '4분기', rmTm: '플랫폼팀', rmDt: { date: dayOffset(40) } }, icon: '📡' },
          { values: { title: '추천인 보상', rmSt: '기획 중', rmQ: '4분기', rmTm: '성장팀', rmDt: { date: dayOffset(60) } }, icon: '🎁' },
          { values: { title: '위젯', rmSt: '시작 전', rmQ: '1분기', rmTm: '모바일팀' }, icon: '🧩' },
        ],
        views: [{ type: 'board', name: '상태별', groupBy: 'rmSt', visible: ['rmQ', 'rmTm'] }, { type: 'table', name: '전체 기능' }, { type: 'list', name: '목록', visible: ['rmQ'] }],
      },
    }),
  },
  {
    id: 'habit-tracker',
    name: '습관 기록표',
    description: '매일 습관을 체크하며 꾸준히 이어 가는 날을 늘려 갑니다.',
    icon: '🔁',
    cover: '/covers/pattern-dots.svg',
    category: 'life',
    tags: ['건강', '개인'],
    creator: 'Workspace',
    build: () => ({
      type: 'collection_view_page',
      icon: '🔁',
      cover: '/covers/pattern-dots.svg',
      db: {
        name: '습관 기록표',
        schema: {
          title: { name: '요일', type: 'title' },
          hDat: { name: '날짜', type: 'date' },
          hExe: { name: '운동', type: 'checkbox' },
          hRea: { name: '독서', type: 'checkbox' },
          hMed: { name: '명상', type: 'checkbox' },
          hWat: { name: '물 8잔', type: 'checkbox' },
        },
        rows: Array.from({ length: 7 }, (_, i) => {
          const d = new Date(Date.now() - (6 - i) * 86_400_000);
          return {
            values: {
              title: d.toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul', month: 'long', day: 'numeric', weekday: 'long' }),
              hDat: { date: dayOffset(-(6 - i)) }, hExe: i % 2 === 0, hRea: i % 3 !== 0, hMed: i > 2, hWat: i % 2 === 1,
            },
          };
        }),
        views: [{ type: 'table', name: '이번 주' }],
      },
    }),
  },

];

export function templateMeta(t: TemplateDef) {
  const { build: _b, ...meta } = t;
  return meta;
}

export type DbSpecT = DbSpec;
