import test from "node:test";
import assert from "node:assert/strict";
import { documentSelection, pdfExtractionWarning, categoryValue, EXTRACTION_WARNING, PREVIEW_CHUNKS } from "../src/lib/chat/documentRules.ts";
import { resolveDocumentScope, previewDocument, updateDocumentCategory } from "../src/lib/chat/documents.ts";
import { findDocumentHits } from "../src/lib/chat/documentSearch.ts";
import { buildSources } from "../src/lib/chat/core.ts";
import { A, B, context, database, request, route } from "./helpers/bot-route-harness.mjs";
const D1 = "55555555-5555-4555-8555-555555555551", D2 = "55555555-5555-4555-8555-555555555552", D3 = "55555555-5555-4555-8555-555555555553";
const now = new Date().toISOString(), expired = new Date(Date.now() - 31 * 86400000).toISOString();
const doc = (id = D1, extra = {}) => ({ id, user_id: A, name: "같은 이름.pdf", created_at: now, processing_status: "ready", category: "", extraction_warning: null, chunk_count: 1, size_bytes: 10, ...extra });
const chunk = (document_id = D1, extra = {}) => ({ id: "chunk-" + document_id, document_id, user_id: A, chunk_index: 0, created_at: now, content: "출장 일비는 45000원", similarity: 0.8, ...extra });
const chat = await route("app/api/chat/route.ts"), documentApi = await route("app/api/documents/[id]/route.ts"), listApi = await route("app/api/documents/route.ts"), ingest = await route("lib/chat/ingest.ts");
const ctx = (id = D1) => ({ params: Promise.resolve({ id }) });
const events = async (response) => (await response.text()).trim().split("\n").map(JSON.parse);

test("문서 선택은 옛 단일/새 다중 계약을 지키고 잘못된 값·빈 선택·충돌을 전체로 넓히지 않음", () => {
  assert.equal(documentSelection({}), null);
  assert.deepEqual(documentSelection({ documentId: D1 }), [D1]);
  assert.deepEqual(documentSelection({ documentIds: [D1,D1,D2] }), [D1,D2]);
  for (const body of [{ documentId: "가짜" }, { documentIds: [] }, { documentIds: "all" }, { documentIds: [D1,null] }, { documentIds: Array(31).fill(D1) }, { documentId:D1, documentIds:[D2] }]) assert.throws(() => documentSelection(body));
});

test("PDF 경고는 빈 글·많은 대체문자/제어/단독 자모를 감지하고 정상 한글·영문·NFD는 과도 경고하지 않음", () => {
  for (const text of ["", "정상 글자 " + "�".repeat(15), "문서\u0000\u0000\u0000", "ㄱㄴㄷㄹㅁ".repeat(10)]) assert.equal(pdfExtractionWarning("a.pdf",text), EXTRACTION_WARNING);
  for (const text of ["정상적인 회사 소개서입니다. 매출은 2020년에 7억원입니다.", "영문 계약 " + "정상 문서 ".repeat(50) + "�", "한글 문서입니다.".repeat(30).normalize("NFD"), "English document. Price: $10", "中文文档 日本語 😀"]) assert.equal(pdfExtractionWarning("a.pdf",text), null);
  assert.equal(pdfExtractionWarning("a.txt","�".repeat(40)), null);
});

test("범위는 본인·미만료·ready만, 명시 선택에 타 회원·만료·처리 중 하나라도 있으면 거절", async () => {
  const store = database({ dcb_documents:[doc(),doc(D2,{user_id:B}),doc(D3,{created_at:expired})] });
  assert.deepEqual(await resolveDocumentScope(store,A,null), [D1]);
  for (const ids of [[D1,D2],[D3]]) await assert.rejects(resolveDocumentScope(store,A,ids), {status:404});
  store.tables.dcb_documents[0].processing_status="processing";
  assert.deepEqual(await resolveDocumentScope(store,A,null), []);
  await assert.rejects(resolveDocumentScope(store,A,[D1]), {status:409});
});

test("다중 문서의 벡터·키워드 조회는 선택 범위를 limit 전에 적용, 상위 미선택 문서가 근거를 밀어내지 않음", async () => {
  const store = database({dcb_documents:[doc(),doc(D2),doc(D3)],dcb_chunks:[chunk(),chunk(D2,{id:"two",content:"출장 일비 50000원",similarity:0.75}),chunk(D3,{id:"outside",similarity:1})]});
  const hits=await findDocumentHits(store,A,[1],"출장 일비",[D1,D2],true);
  assert.deepEqual(new Set(hits.map((hit)=>hit.document_id)),new Set([D1,D2]));
  assert.deepEqual(store.calls.find((call)=>call.rpc).args.p_document_ids,[D1,D2]);
  const keyword=store.calls.find((call)=>call.table==="dcb_chunks");
  assert.ok(keyword.filters.some(([op,key,ids])=>op==="in"&&key==="document_id"&&ids.length===2));
  assert.ok(keyword.filters.some(([op,key])=>op==="gt"&&key==="dcb_documents.created_at"));
});

test("요약 앞부분·미리보기도 타 회원/만료 조각을 제외하고 여러 문서 범위 유지", async () => {
  const store=database({dcb_documents:[doc(),doc(D2)],dcb_chunks:[chunk(),chunk(D1,{id:"expired",created_at:expired}),chunk(D1,{id:"foreign",user_id:B}),chunk(D2,{id:"second",content:"두 번째 문서"})]});
  const hits=await findDocumentHits(store,A,[1],"핵심만 요약",[D1,D2],true);
  assert.deepEqual(hits.map((hit)=>hit.document_id),[D1,D2]);
  const preview=await previewDocument(store,A,D1);
  assert.equal(preview.previewChunks,1);
  assert.equal(preview.text,"출장 일비는 45000원");
});

test("새 RPC 실패는 옛 전체 검색·키워드·앞부분으로 폴백하지 않음", async () => {
  const store=database({dcb_documents:[doc()],dcb_chunks:[chunk()]}); store.rpcError=true;
  await assert.rejects(findDocumentHits(store,A,[1],"요약",[D1],true),{status:500});
  assert.equal(store.calls.length,1);
  assert.equal(store.calls[0].rpc,"dcb_match_chunks_scoped");
});

test("실제 채팅 검색 실패는 오류로 끝나고 답변 AI·전체 검색 재호출을 하지 않음", async () => {
  const c=context({dcb_documents:[doc()],dcb_chunks:[chunk()]}); c.db.rpcError=true;
  const ev=await events(await chat.POST(request("POST",{message:"질문",documentIds:[D1],useDocs:true,web:"off"})));
  assert.equal(ev.at(-1).type,"error"); assert.ok(!ev.some((event)=>event.type==="done"));
  assert.equal(c.ai.length,0); assert.equal(c.embeddings.length,1);
  assert.equal(c.db.calls.filter((call)=>call.rpc).length,1);
});

test("미리보기 최대 조각·제목 동명 구분·분류 변경은 원래 생성일을 보존", async () => {
  const store=database({dcb_documents:[doc(),doc(D2,{user_id:B})],dcb_chunks:Array.from({length:25},(_,i)=>chunk(D1,{id:"c"+i,chunk_index:i,content:"조각"+i}))});
  const p=await previewDocument(store,A,D1);
  assert.equal(p.previewChunks,PREVIEW_CHUNKS); assert.equal(p.truncated,true); assert.ok(!p.text.includes("조각20"));
  await updateDocumentCategory(store,A,D1," 사내 규정 ");
  assert.equal(store.tables.dcb_documents[0].created_at,now); assert.equal(store.tables.dcb_documents[0].category,"사내 규정");
  await assert.rejects(updateDocumentCategory(store,A,D2,"덮기"),{status:404});
  assert.equal(store.tables.dcb_documents[1].category,"");
  for(const value of ["가".repeat(41),"줄\n바꿈",null]) assert.throws(()=>categoryValue(value));
  assert.equal(buildSources([{document_id:D1,document_name:"동명.pdf",content:"1",similarity:.9},{document_id:D2,document_name:"동명.pdf",content:"2",similarity:.8}],[]).length,2);
});

test("미리보기·분류·목록 API 로그인 차단, 타 회원·만료·처리 중 문서는 내용 미노출", async () => {
  let c=context({dcb_documents:[doc()],dcb_chunks:[chunk()]}); c.authorized=false;
  assert.equal((await documentApi.GET(new Request("http://local.test"),ctx())).status,401);
  assert.equal((await documentApi.PATCH(request("PATCH",{category:"분류"}),ctx())).status,401);
  assert.equal((await listApi.GET()).status,401);
  for (const [extra,status] of [[{user_id:B},404],[{created_at:expired},404],[{processing_status:"processing"},409]]) {
    c=context({dcb_documents:[doc(D1,extra)],dcb_chunks:[chunk(D1,{content:"노출 금지 본문"})]});
    const response=await documentApi.GET(new Request("http://local.test"),ctx());
    assert.equal(response.status,status); assert.ok(!(await response.text()).includes("노출 금지"));
  }
});

test("키 없는 본인도 미리보기/분류 가능, 소유자 위조 무시·목록 만료 제외", async () => {
  const c=context({dcb_documents:[doc(),doc(D2,{created_at:expired})],dcb_chunks:[chunk()]}); delete c.keys[A].upstage;
  assert.equal((await documentApi.GET(new Request("http://local.test"),ctx())).status,200);
  assert.equal((await documentApi.PATCH(request("PATCH",{category:"자료",user_id:B,created_at:expired}),ctx())).status,200);
  assert.equal(c.db.tables.dcb_documents[0].user_id,A); assert.equal(c.db.tables.dcb_documents[0].created_at,now);
  assert.equal((await (await listApi.GET()).json()).documents.length,1);
  assert.equal(c.ai.length,0); assert.equal(c.embeddings.length,0);
});

test("채팅의 잘못된/타 회원/만료/처리 중 범위는 키·임베딩·방/질문 쓰기 전에 차단", async () => {
  for(const [extra,ids,status] of [[{},[],400],[{user_id:B},[D1],404],[{created_at:expired},[D1],404],[{processing_status:"processing"},[D1],409]]) {
    const c=context({dcb_documents:[doc(D1,extra)]});
    assert.equal((await chat.POST(request("POST",{message:"질문",useDocs:true,documentIds:ids,web:"off"}))).status,status);
    assert.equal(c.ai.length,0); assert.equal(c.embeddings.length,0); assert.equal(c.db.tables.dcb_rooms.length,0); assert.equal(c.db.tables.dcb_messages.length,0);
  }
});

test("실제 채팅 경로가 선택한 두 문서만 자료/출처에 전달, 문서없음은 임베딩 호출 생략", async () => {
  let c=context({dcb_documents:[doc(),doc(D2),doc(D3)],dcb_chunks:[chunk(),chunk(D2,{id:"b",content:"출장 일비 6만원"}),chunk(D3,{id:"c",content:"미선택 본문",similarity:1})]});
  const ev=await events(await chat.POST(request("POST",{message:"출장 일비",useDocs:true,documentIds:[D1,D2],web:"off"})));
  assert.deepEqual(new Set(ev[0].sources.map((s)=>s.docId)),new Set([D1,D2]));
  assert.ok(!JSON.stringify(c.ai[0].messages).includes("미선택 본문")); assert.equal(c.embeddings.length,1);
  c=context(); await events(await chat.POST(request("POST",{message:"일반 질문",useDocs:true,web:"off"})));
  assert.equal(c.embeddings.length,0);
});

test("추출 의심 PDF는 경고·processing→ready, 빈 PDF는 임베딩 전에 차단", async () => {
  let c=context();
  const saved=await ingest.ingestText({admin:c.db,userId:A,apiKey:"own",name:"a.pdf",sizeBytes:10,text:"정상 부분 " + "�".repeat(15)});
  assert.equal(saved.extraction_warning,EXTRACTION_WARNING);
  assert.equal(c.db.tables.dcb_documents[0].processing_status,"ready");
  const writes=c.db.calls.filter((call)=>call.table==="dcb_documents"&&call.mode!=="select");
  assert.equal(writes[0].values.processing_status,"processing"); assert.equal(writes.at(-1).values.processing_status,"ready");
  c=context();
  await assert.rejects(ingest.ingestText({admin:c.db,userId:A,apiKey:"own",name:"empty.pdf",sizeBytes:10,text:" \n "}),{status:400});
  assert.equal(c.embeddings.length,0); assert.equal(c.db.tables.dcb_documents.length,0);
});

test("저장 완료 전 실패는 ready로 남기지 않고 본인 임시 문서만 정리", async () => {
  for (const stage of ["chunk","ready"]) {
    const c=context({dcb_documents:[doc(D2,{user_id:B})]});
    c.db.fail=(table,mode)=>stage==="chunk" ? table==="dcb_chunks"&&mode==="insert" : table==="dcb_documents"&&mode==="update";
    await assert.rejects(ingest.ingestText({admin:c.db,userId:A,apiKey:"own",name:"a.txt",sizeBytes:10,text:"저장할 정상 문서"}),{status:500});
    assert.deepEqual(c.db.tables.dcb_documents.map((d)=>d.id),[D2]);
  }
});
