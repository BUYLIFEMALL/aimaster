'use client';
import { useEffect, useRef, type ReactNode } from 'react';

const KEY = 'bnc-open-panels';
const titleOf = (head: Element) => (head.querySelector('h2') ?? head).textContent?.trim() ?? '';

// Panels mount at different times behind the member check, so this runs again whenever new ones appear.
export function enhancePanels(root: Element, isOpen: (title: string) => boolean, onToggle: (title: string, open: boolean) => void) {
  for (const panel of root.querySelectorAll('.panel')) {
    if (panel.classList.contains('bnc-fold')) continue;
    const title = panel.querySelector(':scope>h2,:scope>.section-head>h2');
    if (!title) continue;
    const head = title.parentElement?.classList.contains('section-head') ? title.parentElement : title;
    const apply = (open: boolean) => { panel.classList.toggle('bnc-folded', !open); title.setAttribute('aria-expanded', String(open)); };
    panel.classList.add('bnc-fold');
    head.classList.add('bnc-fold-head');
    title.setAttribute('role', 'button');
    title.setAttribute('tabindex', '0');
    apply(isOpen(titleOf(head)));
    const toggle = () => { const open = panel.classList.contains('bnc-folded'); apply(open); onToggle(titleOf(head), open); };
    head.addEventListener('click', toggle);
    title.addEventListener('keydown', event => { const key = (event as KeyboardEvent).key; if (key === 'Enter' || key === ' ') { event.preventDefault(); toggle(); } });
  }
}

export function FoldablePanels({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = root.current;
    if (!element) return;
    let opened: string[] = [];
    try { const saved = JSON.parse(localStorage.getItem(KEY) ?? '[]'); if (Array.isArray(saved)) opened = saved; } catch { /* Remembering open panels is only a convenience. */ }
    const run = () => enhancePanels(element, title => opened.includes(title), (title, open) => {
      opened = open ? [...new Set([...opened, title])] : opened.filter(item => item !== title);
      try { localStorage.setItem(KEY, JSON.stringify(opened)); } catch { /* Same as above. */ }
    });
    run();
    const observer = new MutationObserver(run);
    observer.observe(element, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);
  return <div ref={root}>{children}</div>;
}
