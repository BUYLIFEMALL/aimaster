"use client";
import { useState } from "react";
import Link from "next/link";
import chapters from "@/lib/studio/guide-metadata.json";
import {
  STYLE_PALETTE,
  SECTION_TAGS,
  LIBRARY,
  joinTags,
} from "@/lib/studio/catalog";
import { type Brief } from "@/lib/studio/config";
import { UsageGuide } from "./UsageGuide";
const BASICS = [
  [
    "구조 태그",
    "Lyrics",
    "구간 제목은 가사의 시작·후렴·전환·마무리를 구분합니다. 구간 버튼은 빌더의 커서 위치에 삽입합니다.",
  ],
  [
    "장르 태그",
    "Style",
    "장르는 기본 음악 방향입니다. 중심 장르 1~2개를 고르고 상충하는 속성은 줄이세요.",
  ],
  [
    "템포 태그",
    "Style",
    "BPM은 분당 박자 수입니다. BPM 설정과 직접 입력한 태그의 숫자가 일치하는지 확인하세요.",
  ],
  [
    "보컬 태그",
    "Style",
    "성별·편성·음역·전달 방식을 정합니다. 특정 가수 이름 대신 음악 속성을 사용합니다.",
  ],
  ["악기 태그", "Style", "핵심 악기와 반주를 구분하면 편성이 선명해집니다."],
  [
    "분위기·에너지",
    "Style",
    "감정과 밀도·강약을 정합니다. 앨범에서는 서로 다른 무드를 함께 선택할 수 있습니다.",
  ],
  [
    "음향 효과",
    "Style",
    "공간감·잔향·질감은 편성 뒤에 더하는 제작 속성입니다.",
  ],
  [
    "가사 프롬프트",
    "Lyrics",
    "꼭 반영할 내용에 화자·장면·결말을 구체적으로 적고 기존 곡 가사는 붙여 넣지 마세요.",
  ],
  ["음악 구조", "Lyrics", "후렴 선행·점층·댄스 드롭 등 곡 흐름을 선택합니다."],
  [
    "작성·검수",
    "Style / Lyrics",
    "AI 출력은 직접 검수해야 합니다. 잠긴 Style과 미선택 생성 항목은 유지됩니다.",
  ],
  [
    "Style과 Lyrics 구분",
    "Style / Lyrics",
    "음악 속성은 Style, 가사와 구간 제목은 Lyrics에 입력합니다.",
  ],
];
export function Guide({
  brief,
  onChange,
  busy = false,
  notice,
}: {
  brief?: Brief;
  onChange?: (b: Brief) => void;
  busy?: boolean;
  notice?: (s: string) => void;
}) {
  const [selected, setSelected] = useState("help"),
    [query, setQuery] = useState("");
  const [tagPage, setTagPage] = useState(0);
  const [tagQuery, setTagQuery] = useState("");
  const ch = chapters.find((c) => c.id === selected);
  const number = Number(selected.replace(/\D/g, ""));
  const basics = BASICS[number - 1];
  const category =
    number === 2
      ? "장르"
      : number === 3
        ? "템포"
        : number === 4
          ? "보컬"
          : number === 5
            ? "악기"
            : number === 6
              ? "분위기"
              : number === 7
                ? "이펙트·텍스처"
                : "구조·드롭";
  const match = ch
    ? LIBRARY.filter(
        (p) =>
          p.type !== "dance" &&
          p.group
            .toLowerCase()
            .includes(ch.title.split("(")[0].trim().toLowerCase()),
      ).slice(0, 12)
    : [];
  const tags =
    number === 1 || number === 9
      ? SECTION_TAGS.map((t) => `[${t}]`)
      : number <= 7
        ? STYLE_PALETTE[category] || []
        : match.flatMap((p) => [p.genre, p.instruments]).slice(0, 24);
  const filteredTags = [...new Set(tags)].filter((t) =>
    t.toLowerCase().includes(tagQuery.toLowerCase()),
  );
  return (
    <div className="guide-layout">
      <section className="card guide-index">
        <h2>챕터 인덱스 (93)</h2>
        <input
          aria-label="가이드 목차 검색"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="목차 검색"
        />
        <button
          className={selected === "help" ? "selected" : ""}
          onClick={() => setSelected("help")}
        >
          연동·사용 방법
        </button>
        {chapters
          .filter((c) =>
            (c.title + c.group + c.id)
              .toLowerCase()
              .includes(query.toLowerCase()),
          )
          .map((c) => (
            <button
              key={c.id}
              className={selected === c.id ? "selected" : ""}
              aria-pressed={selected === c.id}
              onClick={() => {
                setSelected(c.id);
                setTagPage(0);
                setTagQuery("");
              }}
            >
              <span>{c.id}</span>
              <strong>{c.title}</strong>
              <small>{c.group}</small>
            </button>
          ))}
      </section>
      <section className="guide-content">
        {selected === "help" ? (
          <UsageGuide />
        ) : (
          <div className="card">
            <p className="eyebrow">
              {ch?.group} · {selected}
            </p>
            <h2>{ch?.title}</h2>
            <p>
              {basics?.[2] ||
                "해당 분류의 음악 속성을 참고해 장르·편성·템포를 선택합니다. 시대와 아티스트 항목은 탐색용 참고이며 특정 음색의 재현을 보장하지 않습니다."}
            </p>
            <p className="muted">
              목차는 원본의 공개 항목을 참고했습니다. 설명과 아래 활용 예시는
              AIMaster 사용 흐름에 맞춰 작성했습니다. 태그는 생성 요청이며 실제
              반영은 결과를 확인해야 합니다.
            </p>
            {tags.length > 0 ? (
              <>
                <label>
                  태그 찾기
                  <input
                    aria-label="가이드 태그 검색"
                    value={tagQuery}
                    onChange={(e) => {
                      setTagQuery(e.target.value);
                      setTagPage(0);
                    }}
                  />
                </label>
                <div className="guide-table-wrap">
                  <table className="guide-table">
                    <thead>
                      <tr>
                        <th>입력 필드</th>
                        <th>태그 / 음악 속성</th>
                        <th>활용</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTags
                        .slice(tagPage * 24, tagPage * 24 + 24)
                        .map((t) => (
                          <tr key={t}>
                            <td>{basics?.[1] || "Style"}</td>
                            <td className="mono">{t}</td>
                            <td>
                              {number === 1 || number === 9 ? (
                                "가사 구간 버튼으로 삽입"
                              ) : (
                                <button
                                  disabled={busy || !brief || !onChange}
                                  onClick={() => {
                                    if (!brief || !onChange) return;
                                    const style = joinTags(brief.style, [t]);
                                    if (style.length > 1000) {
                                      notice?.(
                                        "Style은 1,000자 이내로 정리해 주세요.",
                                      );
                                      return;
                                    }
                                    onChange({ ...brief, style });
                                    notice?.(
                                      "가이드의 음악 속성을 빌더 Style에 추가했습니다.",
                                    );
                                  }}
                                >
                                  빌더 Style에 추가
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
                {filteredTags.length > 24 && (
                  <div className="actions gallery-pagination">
                    <button
                      disabled={tagPage === 0}
                      onClick={() => setTagPage(tagPage - 1)}
                    >
                      이전 태그
                    </button>
                    <span>
                      {tagPage + 1}/{Math.ceil(filteredTags.length / 24)} ·{" "}
                      {filteredTags.length}개
                    </span>
                    <button
                      disabled={(tagPage + 1) * 24 >= filteredTags.length}
                      onClick={() => setTagPage(tagPage + 1)}
                    >
                      다음 태그
                    </button>
                  </div>
                )}
              </>
            ) : (
              <>
                <p>
                  프리셋에서 이 분류를 검색하고 Style 미리보기와 구조를
                  확인하세요.
                </p>
                <Link className="button primary" href="/?section=presets">
                  프리셋에서 찾아보기
                </Link>
              </>
            )}
            <div className="actions">
              <Link className="button" href="/?section=builder">
                빌더 열기
              </Link>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
