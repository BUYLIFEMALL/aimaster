import React from "react";
import { createRoot } from "react-dom/client";
import { Studio } from "../src/components/Studio";
import { History } from "../src/components/History";
import { Sidebar } from "../src/components/layout/Sidebar";
const uid = "11111111-2222-4333-8444-555555555555";
const path = window.location.pathname;
createRoot(document.getElementById("root")!).render(<div className="app-shell"><Sidebar userEmail="browser-fixture@example.test" currentPath={path}/><main className="main-workspace"><div className="workspace-content">{path === "/history" ? <History userId={uid}/> : <Studio userId={uid} mode={path === "/compose" ? "compose" : "restore"}/>}</div></main></div>);
