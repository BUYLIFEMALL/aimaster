// Compare the real independent cores against common fixtures. Do not copy BLOG
// code or relax agent-specific quote, image identity and preview validation.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const writer=require('../extension/writer.js');
const blog=require('../../ai-auto-blog/extension/blog-core.js');
const title='검수 제목';
const steps=[{type:'title',text:title},{type:'paragraph',text:'첫 문단'},{type:'image',name:'one.png'},{type:'paragraph',text:'둘째 문단'}];
const blocks=steps.slice(1);
function blogMatches(actual,titleText=title){
  const expected=blog.createExpected();expected.addText('첫 문단');expected.addImage();expected.addText('둘째 문단');
  return blog.titleMatches(title,titleText) && blog.compareUnits(expected.units,blog.unitsFromSnapshot(actual)).ok;
}
function agentMatches(actual,titleText=title){return writer.matchingWriterPrefix({title:titleText,blocks:actual},steps)===steps.length;}
for(const [name,actual,valid,titleText] of [
  ['exact document',blocks,true],
  ['split text paragraphs',[{type:'paragraph',text:'첫 '},{type:'paragraph',text:'문단'},blocks[1],blocks[2]],true],
  ['empty paragraphs',[{type:'paragraph',text:' '},...blocks,{type:'paragraph',text:''}],true],
  ['mixed existing title',blocks,false,'예전 제목 '+title],
  ['duplicate body',[blocks[0],blocks[0],blocks[1],blocks[2]],false],
  ['reordered text',[blocks[2],blocks[1],blocks[0]],false],
  ['missing image',[blocks[0],blocks[2]],false],
  ['duplicate image',[blocks[0],blocks[1],blocks[1],blocks[2]],false],
  ['unknown structure',[...blocks,{type:'other',text:'예전 표'}],false],
  ['numbered lines',[{type:'paragraph',text:'1. 첫 문단'},blocks[1],blocks[2]],false],
])test('both engines: '+name,()=>{
  assert.equal(agentMatches(actual,titleText),valid);assert.equal(blogMatches(actual,titleText),valid);
});
test('agent retains stronger image identity validation; BLOG compares image positions',()=>{
  const wrong=[blocks[0],{type:'image',name:'different.png'},blocks[2]];
  assert.equal(agentMatches(wrong),false);assert.equal(blogMatches(wrong),true);
});
test('unrelated link preview cannot silently disappear from the agent document',()=>{
  const extra=[...blocks,{type:'linkPreview',url:'https://unexpected.example/article'}];
  assert.equal(agentMatches(extra),false);assert.equal(blogMatches(extra),true);
});
test('agent quotes require exact text and style instead of becoming generic structures',()=>{
  const quoteSteps=[{type:'title',text:title},{type:'quote',text:'섹션',style:'quotation_line'}];
  assert.equal(writer.matchingWriterPrefix({title,blocks:[quoteSteps[1]]},quoteSteps),2);
  assert.equal(writer.matchingWriterPrefix({title,blocks:[{...quoteSteps[1],style:'default'}]},quoteSteps),-1);
  assert.equal(writer.matchingWriterPrefix({title,blocks:[{...quoteSteps[1],text:'다른 섹션'}]},quoteSteps),-1);
});
test('a populated or unrelated-preview editor stops before any input with a readable error',async()=>{
  for(const snapshot of [{title:'예전 제목',blocks:[]},{title:'',blocks:[blocks[0]]},{title:'',blocks:[{type:'linkPreview',url:'https://unexpected.example'}]}]){
    let applied=0;
    await assert.rejects(()=>writer.runWriter({steps,requireEmpty:true,read:async()=>snapshot,apply:async()=>applied++,save:async()=>{},checkCancelled:async()=>{}}),e=>/기존 내용을 보존/.test(e.message));
    assert.equal(applied,0);
  }
});
