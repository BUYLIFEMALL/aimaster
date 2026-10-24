// "Start with" & 온보딩 웰컴 퀵스타트 허브 — 스마트 프로 인디고 워크스페이스 스타일
// 빈 페이지에서 4대 핵심 템플릿(회의록·칸반보드·위키·AI글쓰기)과 도구를 직관적으로 시작
import type { ReactNode } from 'react';
import { Shapes, Sparkles, LayoutGrid, FileText, CheckSquare, BookOpen } from 'lucide-react';
import type { ViewType } from '#shared/records.ts';
import { Icon } from '../../components/Icon.tsx';
import { openMenu } from '../../components/Menu.tsx';
import { openImport } from '../import/ImportModal.tsx';
import { getBlock } from '../../lib/blocks.ts';
import { turnPageIntoDatabase } from '../database/createDatabase.ts';
import { useUI } from '../../lib/store/ui.ts';
import { insertMeetingBlock, meetingsEnabled } from '../meetings/entry.ts';
import { policyFromSpaceSettings } from '../ai/aiApi.ts';
import type { SpaceRecord } from '#shared/records.ts';
import { records } from '../../lib/store/records.ts';

export function GetStartedBar({ pageId }: { pageId: string }) {
  const toDb = (viewType: ViewType, setupPanel = false) => {
    if (!getBlock(pageId)) return;
    turnPageIntoDatabase(pageId, viewType, { setupPanel });
  };
  const spaceId = getBlock(pageId)?.space_id;
  const aiOn = policyFromSpaceSettings(records.get<SpaceRecord>('space', spaceId ?? '')?.settings as Record<string, unknown> | undefined).enabled;

  const quickTemplates = [
    {
      id: 'meeting',
      title: '회의록 템플릿',
      desc: '일시, 참석자, 안건, 실행 과제',
      icon: <FileText size={18} className="aww-hub-icon-indigo" />,
      action: () => insertMeetingBlock(pageId),
      badge: '추천',
    },
    {
      id: 'board',
      title: '프로젝트 보드',
      desc: '할 일 · 진행 중 · 완료 3단 칸반',
      icon: <LayoutGrid size={18} className="aww-hub-icon-violet" />,
      action: () => toDb('board', true),
      badge: '데이터베이스',
    },
    {
      id: 'table',
      title: '업무 스프레드시트',
      desc: '속성 필터, 정렬, 집계 기능 표',
      icon: <CheckSquare size={18} className="aww-hub-icon-emerald" />,
      action: () => toDb('table', true),
      badge: '표 뷰',
    },
    {
      id: 'wiki',
      title: '템플릿 둘러보기',
      desc: '업무 위키, 기획서, 회고 템플릿',
      icon: <BookOpen size={18} className="aww-hub-icon-amber" />,
      action: () => useUI.getState().set({ templatesOpen: true }),
      badge: '갤러리',
    },
  ];

  const bottomChips: [string, ReactNode, () => void][] = [
    ...(aiOn
      ? [
          [
            'AI 비서와 시작하기',
            <span className="nc-chip-ai" key="ai">
              <Sparkles size={13} className="text-indigo-600" />
            </span>,
            () => window.dispatchEvent(new CustomEvent('nc:ask-ai', { detail: { pageId } })),
          ] as [string, ReactNode, () => void],
        ]
      : []),
    ['데이터베이스', <Icon name="viewTable" size={18} key="db" />, () => toDb('table', true)],
    ['템플릿 갤러리', <Shapes size={18} key="tmpl" aria-hidden />, () => useUI.getState().set({ templatesOpen: true })],
    ['외부 파일 가져오기', <Icon name="import" size={18} key="imp" />, () => openImport({ pageId })],
  ];

  const openMore = (anchor: HTMLElement) => {
    const views: [ViewType, string, string][] = [
      ['table', '표 (Table)', 'dbViewTable'],
      ['board', '칸반 보드 (Board)', 'dbViewBoard'],
      ['list', '목록 (List)', 'dbViewList'],
      ['timeline', '타임라인 (Timeline)', 'dbViewTimeline'],
      ['calendar', '캘린더 (Calendar)', 'dbViewCalendar'],
      ['gallery', '갤러리 (Gallery)', 'dbViewGallery'],
    ];
    openMenu(
      anchor,
      {
        width: 220,
        sections: [
          { items: views.map(([type, label, icon]) => ({ label, icon, onSelect: () => toDb(type) })) },
          { items: [{ label: '외부 파일 가져오기 (Markdown·CSV)', icon: 'import', onSelect: () => openImport({ pageId }) }] },
        ],
      },
      { placement: 'top-start', offset: 6 }
    );
  };

  return (
    <div className="nc-get-started aww-hub-container" contentEditable={false} data-content-editable-void="true">
      <div role="menu" aria-orientation="horizontal" className="nc-get-started-menu aww-hub-menu">
        <div className="nc-get-started-fade" />
        <div className="nc-get-started-body aww-hub-body">
          {/* 온보딩 퀵스타트 카드 4종 */}
          <div className="aww-hub-header">
            <span className="aww-hub-pill">스마트 퀵스타트</span>
            <span className="aww-hub-title">어떤 업무 문서를 시작할까요?</span>
          </div>

          <div className="aww-hub-grid">
            {quickTemplates.map((item) => (
              <div
                key={item.id}
                role="button"
                className="aww-hub-card"
                onClick={item.action}
              >
                <div className="aww-hub-card-top">
                  <div className="aww-hub-card-icon-box">{item.icon}</div>
                  <span className="aww-hub-card-badge">{item.badge}</span>
                </div>
                <div className="aww-hub-card-title">{item.title}</div>
                <div className="aww-hub-card-desc">{item.desc}</div>
              </div>
            ))}
          </div>

          {/* 하단 칩 도구 바 */}
          <div className="nc-get-started-row aww-hub-chips">
            {bottomChips.map(([label, icon, fn]) => (
              <div key={label} role="button" className="nc-chip aww-hub-chip" onClick={fn}>
                {icon}
                <span className="nc-chip-label">{label}</span>
              </div>
            ))}
            <div
              role="button"
              aria-label="더보기"
              className="nc-chip icon aww-hub-chip-more"
              title="다른 보기 및 가져오기"
              onClick={(e) => openMore(e.currentTarget)}
            >
              <Icon name="ellipsis" size={18} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
