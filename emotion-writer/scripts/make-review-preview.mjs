// Static review artifact only; not a production route or an authentication bypass.
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { Workspace } from "../src/components/Workspace.tsx";
const css = (await readFile("src/app/globals.css", "utf8")).replace('@import "tailwindcss";', "");
const markup = renderToStaticMarkup(React.createElement(Workspace, { userId: "static-review-artifact", initialKeys: { gemini: false, pixabay: false, pexels: false } }));
await mkdir("docs/evidence", { recursive: true });
const sidebar = `<aside class="sidebar"><div class="brand"><strong>🌸 감성 글귀 이미지</strong><small>v1.01</small><a href="https://www.buylife.xyz/programs">← 다른 프로그램 보기</a></div><div class="sidebar-body"><nav>${["주제 선택", "이미지 방식", "이미지 비율", "줄 수", "글귀 만들기", "완성·저장"].map((v, i) => `<a class="flow-link" href="#step-${i + 1}"><span>${i + 1}</span>${v}</a>`).join("")}<div class="nav-divider"></div><span>🔑 API키등록·플랫폼연동</span></nav><div class="account">정적 화면 검토용 · AI 호출 없음</div></div></aside>`;
await writeFile("docs/evidence/initial-preview.html", `<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>감성 글귀 이미지 — 정적 화면 검토</title><style>${css}</style><body><div class="app-shell">${sidebar}<main class="app-main">${markup}</main></div></body></html>`);
console.log("Saved docs/evidence/initial-preview.html; static artifact, no API requests.");
