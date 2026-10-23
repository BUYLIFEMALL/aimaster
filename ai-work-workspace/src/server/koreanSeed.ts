// AIMaster 회원이 워크스페이스를 만들 때 넣는 한국어 기본 문서(원본 seed.ts의 영어 기본값 대신).
// 1단계에서 닫힌 기능(공유·AI)은 안내하지 않는다.
import type { RichText } from '#shared/richtext.ts';
import type { BlockSpec } from '@/litpage/server/seed.ts';

const t = (s: string): RichText => [[s]];
const code = (s: string): [string, [['c']]] => [s, [['c']]];

export const KOREAN_WELCOME = {
  title: '시작하기',
  icon: '👋',
  content: [
    { type: 'text', title: t('👋 Workspace에 오신 것을 환영합니다. 이 페이지에서 마음껏 연습해 보세요.') },
    { type: 'text', title: t('아래 몇 가지를 해 보면 페이지·블록·데이터베이스가 어떻게 함께 쓰이는지 알 수 있습니다.') },
    { type: 'to_do', title: [code('/'), [' 를 눌러 제목·콜아웃·하위 페이지를 넣어 보세요.']] as RichText },
    { type: 'to_do', title: [['이 줄에 마우스를 올리고 '], code('⋮⋮'), [' 손잡이로 끌어 순서를 바꿔 보세요.']] as RichText },
    { type: 'to_do', title: t('데이터베이스를 넣고 행을 몇 개 추가한 뒤 표·보드·캘린더 보기로 바꿔 보세요.') },
    { type: 'to_do', title: [code('Ctrl + P'), [' 로 페이지를 찾고, '], code('Ctrl + K'), [' 로 빠른 실행을 열어 보세요.']] as RichText },
    {
      type: 'toggle', title: t('단축키와 활용 팁 더 보기'),
      children: [
        { type: 'bulleted_list', title: t('@ 를 입력하면 페이지나 날짜를 언급할 수 있습니다.') },
        { type: 'bulleted_list', title: t('블록을 다른 블록 옆으로 끌면 여러 단으로 나눌 수 있습니다.') },
        { type: 'bulleted_list', title: t('바로 쓸 수 있는 틀이 필요하면 템플릿 갤러리를 열어 보세요.') },
        { type: 'bulleted_list', title: t('자세한 사용법은 왼쪽 메뉴 아래 「📖 연동 & 사용 매뉴얼」에 있습니다.') },
      ],
    },
    { type: 'text', title: [] },
    { type: 'callout', title: t('팁: Ctrl + Shift + L 로 라이트·다크 모드를 바꿀 수 있습니다.'), format: { page_icon: '💡', block_color: 'gray_background' } },
  ] as BlockSpec[],
};

export const KOREAN_TEAM = {
  name: '일반',
  homeTitle: '팀 홈',
  homeText: '이 팀이 함께 쓰는 공간입니다. 문서·위키·프로젝트를 여기에 모아 두세요.',
};
