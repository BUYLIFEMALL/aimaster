"use client";

import { useLang } from "./LangProvider";

function List({ items, ordered }: { items: string[]; ordered?: boolean }) {
  const Tag = ordered ? "ol" : "ul";
  return (
    <Tag className={`space-y-1.5 pl-5 text-sm leading-relaxed text-neutral-700 ${ordered ? "list-decimal" : "list-disc"}`}>
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </Tag>
  );
}

export function GuideView() {
  const { t } = useLang();
  const g = t.guide;
  const card = "rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm";
  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-neutral-900">{g.title}</h1>
      <section className={card}>
        <h2 className="mb-2 text-base font-bold text-neutral-900">{g.introHeading}</h2>
        <p className="text-sm leading-relaxed text-neutral-700">{g.introBody}</p>
        <p className="mt-2 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-800">{g.introNote}</p>
      </section>
      <section className={card}>
        <h2 className="mb-2 text-base font-bold text-neutral-900">{g.convertHeading}</h2>
        <List items={g.convertSteps} ordered />
      </section>
      <section className={card}>
        <h2 className="mb-2 text-base font-bold text-neutral-900">{g.collageHeading}</h2>
        <List items={g.collageSteps} ordered />
      </section>
      <section className={card}>
        <h2 className="mb-2 text-base font-bold text-neutral-900">{g.tipsHeading}</h2>
        <List items={g.tips} />
      </section>
      <section className={card}>
        <h2 className="mb-2 text-base font-bold text-neutral-900">{g.notesHeading}</h2>
        <List items={g.notes} />
      </section>
    </div>
  );
}
