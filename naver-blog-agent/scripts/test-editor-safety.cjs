const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=process.argv[2]
  ? require('node:child_process').execFileSync('git',['show',process.argv[2]+':naver-blog-agent/extension/editor.js'],{encoding:'utf8'})
  : fs.readFileSync(path.join(__dirname,'../extension/editor.js'),'utf8');
// Run the real editor command. A minimal screen lets us distinguish a library
// panel from a real alert without typing or publishing in a member's browser.
async function focus(popups=[],library=false){
  const clicks=[];
  const title={id:'title',tagName:'P',isContentEditable:true,getClientRects:()=>[{}],
    getBoundingClientRect:()=>({left:0,top:0,width:100,height:20}),querySelectorAll:()=>[],
    scrollIntoView(){},matches:()=>false,closest:()=>null,querySelector:()=>null,focus(){document.activeElement=title;},
    dispatchEvent:event=>{clicks.push(event.type);return true;}};
  const document={activeElement:null,body:{innerText:''},getElementById:()=>title,
    createRange:()=>({selectNodeContents(){},collapse(){}}),
    querySelectorAll:selector=>selector.includes('.se-title-text')?[title]
      :selector==='.se-popup-container'?popups
      :selector==='.se-popup-container,[role="dialog"][aria-modal="true"]'?[...popups,...(library?[{getClientRects:()=>[{}]}]:[])]
      :selector.includes('[role="dialog"]')&&library?[{getClientRects:()=>[{}]}]:[]};
  title.ownerDocument=document;
  const sandbox={document,window:{},console,URL,Promise,setTimeout:fn=>fn(),
    getComputedStyle:el=>({visibility:el.hidden?'hidden':'visible'}),
    getSelection:()=>({removeAllRanges(){},addRange(){}}),MouseEvent:class{constructor(type){this.type=type;}}};
  vm.createContext(sandbox);vm.runInContext(source,sandbox);
  return {result:await sandbox.editorCommand('preflightTitle'),clicks};
}
function popup({title='',message='',hidden=false,rects=[{}]}={}){
  return {hidden,getClientRects:()=>rects,querySelector:selector=>{
    if(selector.includes(', '))return title||message?{textContent:title||message}:null;
    if(selector==='.se-popup-title')return title?{textContent:title}:null;
    if(selector==='.se-popup-alert-text')return message?{textContent:message}:null;
    return null;
  }};
}
test('image library role=dialog allows focus instead of blocking the next input',async()=>{
  const {result,clicks}=await focus([],true);assert.equal(result.ok,true,JSON.stringify(result));assert.deepEqual(clicks,['mousedown','mouseup','click']);
});
test('a visible resume popup still blocks before any selection event',async()=>{
  const {result,clicks}=await focus([popup({title:'작성 중인 글이 있습니다.'})]);assert.equal(result.ok,false);assert.match(result.error,/팝업이 열려 있습니다.*작성 중인 글이 있습니다/);assert.deepEqual(clicks,[]);
});
test('an alert containing only a message blocks and includes its diagnostic label',async()=>{
  const {result,clicks}=await focus([popup({message:'계속 작성할까요?'})]);assert.equal(result.ok,false);assert.match(result.error,/계속 작성할까요/);assert.deepEqual(clicks,[]);
});
test('hidden and unlabeled containers do not block a fresh empty editor',async()=>{
  for(const options of [{title:'숨겨짐',hidden:true},{title:'숨겨짐',rects:[]},{}]){
    const {result}=await focus([popup(options)]);assert.equal(result.ok,true,JSON.stringify(result));
  }
});
