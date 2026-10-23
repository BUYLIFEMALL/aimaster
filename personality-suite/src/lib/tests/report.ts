import { TYPE16_PROFILES } from "./content/type16Profiles";
import { ATTACHMENT_PROFILES, BEHAVIOR_PROFILES, BIGFIVE_TEXT, ENNEAGRAM_PROFILES } from "./content/psychProfiles";
import { TEMPERAMENT_TEXT, WELLBEING_TEXT } from "./content/careTests";
import type { ScoredResult, Test } from "./types";

// 점수 결과 → 화면에 보여 줄 기본 해석(AI 없이도 보이는 부분). 순수 함수.

export interface ReportSection { heading: string; body: string }
export interface Report {
  title: string;
  tagline: string;
  summary: string;
  strengths: string[];
  cautions: string[];
  tips: string[];
  sections: ReportSection[];
  /** 경계·근접 점수 안내 */
  notes: string[];
}

const EMPTY: Report = { title: "", tagline: "", summary: "", strengths: [], cautions: [], tips: [], sections: [], notes: [] };

export function buildReport(test: Test, r: ScoredResult): Report {
  switch (test.kind) {
    case "type16": {
      const p = TYPE16_PROFILES[r.code];
      if (!p) return { ...EMPTY, title: r.code };
      const lens = (r.axes ?? []).map((a) => test.lens[a.chosen]).join(" ");
      const border = (r.axes ?? []).filter((a) => a.borderline);
      return {
        title: `${r.code} · ${p.name}`,
        tagline: p.tagline,
        summary: p.summary,
        strengths: p.strengths,
        cautions: p.cautions,
        tips: p.tips,
        sections: [{ heading: `${test.lensTitle} 이런 모습이에요`, body: lens }],
        notes: border.length
          ? [`${border.map((a) => `${a.poles[0]}/${a.poles[1]}`).join(", ")} 축은 두 성향이 비슷한 경계에 있습니다. 상황에 따라 반대 성향이 나타날 수 있어요.`]
          : [],
      };
    }
    case "bigfive": {
      const traits = r.traits ?? [];
      const top = traits.reduce((a, b) => (b.score > a.score ? b : a), traits[0]);
      return {
        ...EMPTY,
        title: r.headline,
        tagline: "다섯 가지 축의 점수로 보는 나의 성격 프로필",
        summary: `다섯 요인 중 ${top.label}(${top.score}점)이 가장 높게 나타났습니다. 점수는 0~100이며, 높고 낮음은 좋고 나쁨이 아니라 성향의 차이입니다.`,
        sections: traits.map((t) => {
          const txt = BIGFIVE_TEXT[t.key];
          return { heading: `${txt.name} ${t.score}점 (${t.level === "high" ? "높음" : t.level === "low" ? "낮음" : "중간"})`, body: `${txt.measures}. ${txt[t.level ?? "mid"]}` };
        }),
      };
    }
    case "behavior": {
      const p = BEHAVIOR_PROFILES[r.code];
      const second = r.ranking?.[1] ? BEHAVIOR_PROFILES[r.ranking[1]] : undefined;
      return {
        title: `${p.name}`,
        tagline: p.tagline,
        summary: p.summary,
        strengths: p.strengths,
        cautions: p.cautions,
        tips: p.tips,
        sections: [
          ...(second ? [{ heading: `보조 스타일: ${second.name}`, body: `${p.secondary}에 더해 ${second.secondary}도 함께 가지고 있어요. ${second.tagline}.` }] : []),
          { heading: "함께 일하는 사람에게", body: p.communication },
        ],
        notes: r.close ? ["주도 스타일과 보조 스타일의 점수 차이가 작아 두 스타일을 함께 읽는 것이 좋아요."] : [],
      };
    }
    case "attachment": {
      const p = ATTACHMENT_PROFILES[r.code];
      return {
        title: p.name, tagline: p.tagline, summary: p.summary, strengths: p.strengths, cautions: p.cautions, tips: p.tips, sections: [],
        notes: r.close ? ["불안 또는 회피 점수가 중간선에 가까워 상황에 따라 다른 유형의 모습이 나타날 수 있어요."] : [],
      };
    }
    case "temperament": {
      const traits = r.traits ?? [];
      return {
        ...EMPTY,
        title: r.headline,
        tagline: "타고난 반응 방식에 가까운 네 가지 성향",
        summary: `네 가지 성향 중 ${traits.find((t) => t.key === r.code)?.label ?? ""}이 가장 높게 나타났습니다. 점수는 0~100이며 좋고 나쁨이 아니라 경향의 차이입니다.`,
        sections: traits.map((t) => {
          const txt = TEMPERAMENT_TEXT[t.key];
          return { heading: `${txt.name} ${t.score}점 (${t.level === "high" ? "높음" : t.level === "low" ? "낮음" : "중간"})`, body: `${txt.measures}. ${txt[t.level ?? "mid"]}` };
        }),
        notes: r.close ? ["1·2위 점수가 비슷해 두 성향을 함께 읽는 것이 좋아요."] : [],
      };
    }
    case "wellbeing": {
      const traits = r.traits ?? [];
      const worst = (r.ranking ?? []).slice(0, 2).map((k) => WELLBEING_TEXT[k]?.name).filter(Boolean);
      const tips = (r.ranking ?? []).slice(0, 3).map((k) => WELLBEING_TEXT[k]?.tip).filter((x): x is string => !!x);
      return {
        ...EMPTY,
        title: r.headline,
        tagline: "최근 2주간의 마음 상태 자기점검 (점수가 높을수록 부담이 큰 쪽)",
        summary: r.code === "low"
          ? "전반적으로 부담이 크지 않은 상태로 보입니다. 지금의 회복 습관을 유지해 보세요."
          : `부담이 상대적으로 큰 영역은 ${worst.join("·")}입니다. 아래 영역별 설명과 작은 실천을 확인해 보세요.`,
        tips,
        sections: traits.map((t) => {
          const txt = WELLBEING_TEXT[t.key];
          return { heading: `${txt.name} ${t.score}점 (부담 ${t.level === "high" ? "높음" : t.level === "low" ? "낮음" : "중간"})`, body: txt[t.level ?? "mid"] };
        }),
        notes: ["이 점검은 진단이 아니며, 일시적 상태에 따라 달라질 수 있습니다."],
      };
    }

    case "enneagram": {
      const p = ENNEAGRAM_PROFILES[r.code];
      const others = (r.ranking ?? []).slice(1).map((k) => ENNEAGRAM_PROFILES[k] && `${k}번 ${ENNEAGRAM_PROFILES[k].name}`).filter(Boolean);
      return {
        title: `${r.code}번 · ${p.name}`,
        tagline: p.tagline,
        summary: p.summary,
        strengths: p.strengths,
        cautions: p.cautions,
        tips: p.tips,
        sections: [
          { heading: "핵심 욕구", body: p.desire },
          { heading: "핵심 두려움", body: p.fear },
          ...(others.length ? [{ heading: "함께 읽어 볼 유형", body: `${others.join(", ")} 성향도 비교적 높게 나타났어요.` }] : []),
        ],
        notes: r.close ? ["1·2위 점수가 비슷해요. 두 유형의 설명을 모두 읽어 보고 더 가깝게 느껴지는 쪽을 선택해 보세요."] : [],
      };
    }
  }
}

/** 같은 검사의 이전 결과와 비교한 변화 문장(순수 함수). 차이가 거의 없으면 빈 배열. */
export function compareResults(prev: ScoredResult, cur: ScoredResult): string[] {
  const out: string[] = [];
  if (prev.headline !== cur.headline) out.push(`대표 결과: ${prev.headline} → ${cur.headline}`);
  if (prev.axes && cur.axes) {
    for (const a of cur.axes) {
      const p = prev.axes.find((x) => x.axis === a.axis);
      if (p && p.chosen !== a.chosen) out.push(`${a.poles[0]}/${a.poles[1]} 축: ${p.chosen} → ${a.chosen}`);
    }
  }
  if (prev.traits && cur.traits) {
    for (const t of cur.traits) {
      const p = prev.traits.find((x) => x.key === t.key);
      if (!p) continue;
      const d = t.score - p.score;
      if (Math.abs(d) >= 8) out.push(`${t.label}: ${p.score}점 → ${t.score}점 (${d > 0 ? "+" : ""}${d})`);
    }
  }
  return out;
}

/** AI 분석 프롬프트에 넣을 결과 요약(평문) */
export function describeForAi(test: Test, r: ScoredResult): string {
  const lines: string[] = [`검사: ${test.title}`, `대표 결과: ${r.headline}`];
  if (r.axes) lines.push("축별 성향: " + r.axes.map((a) => `${a.poles[0]}/${a.poles[1]} → ${a.chosen}(${a.poles[0]} ${a.firstPct}%)${a.borderline ? " 경계" : ""}`).join(", "));
  if (r.traits) lines.push("점수(0~100): " + r.traits.map((t) => `${t.label} ${t.score}`).join(", "));
  if (r.ranking) lines.push("상위 순위: " + r.ranking.join(" > "));
  if (r.close) lines.push("1·2위 점수가 근접함");
  return lines.join("\n");
}
