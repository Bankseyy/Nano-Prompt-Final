const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('jsdom');
const html=fs.readFileSync('index.html','utf8');
const library=JSON.parse(fs.readFileSync('presets.json','utf8'));
async function studio(){
 const dom=new JSDOM(html,{url:'http://localhost/',runScripts:'dangerously',beforeParse(w){
  w.structuredClone=structuredClone;w.TextDecoder=TextDecoder;w.TextEncoder=TextEncoder;
  w.fetch=async url=>({ok:true,json:async()=>String(url).includes('api.github.com')?{sha:'test-sha',content:Buffer.from(JSON.stringify(library)).toString('base64')}:library});
  w.confirm=()=>true;
  w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
  w.HTMLDialogElement.prototype.close=function(){this.open=false;};
 }});
 await new Promise(resolve=>setImmediate(resolve));
 return dom;
}
function input(w,el,value){el.value=value;el.dispatchEvent(new w.Event('input',{bubbles:true}));}
test('temporary prompt detects repeated variables and never changes saved data or values',async()=>{
 const dom=await studio();const w=dom.window,d=w.document;
 try{
 const before=w.eval('JSON.stringify(data)');const exported=w.eval('JSON.stringify(buildExportObject().presets)');
 const stored=w.localStorage.getItem('nano_prompt_studio_values_v1');
 d.querySelector('#scratchModeBtn').click();
 assert.equal(d.querySelector('#scratchPanel').hidden,false);
 input(w,d.querySelector('#scratchInput'),'Create [ subject ] in [style]. Again: [subject].');
 assert.equal(d.querySelectorAll('#varsList input').length,2);
 input(w,d.querySelector('#varsList input'),'a fox');
 input(w,d.querySelectorAll('#varsList input')[1],'watercolour');
 assert.equal(d.querySelector('#output').value,'Create a fox in watercolour. Again: a fox.');
 assert.equal(w.eval('JSON.stringify(data)'),before);
 assert.equal(w.eval('JSON.stringify(buildExportObject().presets)'),exported);
 assert.equal(w.eval('dirty'),false);
 assert.equal(w.localStorage.getItem('nano_prompt_studio_values_v1'),stored);
 d.querySelector('#libraryModeBtn').click();
 assert.equal(d.querySelector('#scratchPanel').hidden,true);
 d.querySelector('#scratchModeBtn').click();
 assert.match(d.querySelector('#output').value,/a fox/);
 d.querySelector('#clearValuesBtn').click();
 assert.equal(d.querySelector('#output').value,'Create [ subject ] in [style]. Again: [subject].');
 d.querySelector('#resetScratchBtn').click();
 assert.equal(d.querySelector('#scratchInput').value,'');
 assert.equal(d.querySelector('#output').value,'');
 assert.equal(w.eval('JSON.stringify(data)'),before);
 }finally{w.close();}
});
test('search spans categories, selection exits scratchpad, and template editing still works',async()=>{
 const dom=await studio();const w=dom.window,d=w.document;
 try{
 const target=library.presets.at(-1);
 input(w,d.querySelector('#librarySearch'),target.name);
 const found=[...d.querySelectorAll('#promptStrip button')].find(el=>el.textContent===target.name);
 assert.ok(found);found.click();
 assert.equal(d.querySelector('#workspaceTitle').textContent,target.name);
 d.querySelector('#scratchModeBtn').click();
 d.querySelector('#promptStrip button').click();
 assert.equal(w.eval('scratchMode'),false);
 d.querySelector('#editModeBtn').click();
 input(w,d.querySelector('#editNameInput'),'Edited test template');
 assert.equal(w.eval('dirty'),true);
 assert.equal(d.querySelector('#workspaceTitle').textContent,'Edited test template');
 assert.equal(w.eval('buildExportObject().presets.some(p=>p.name==="Edited test template")'),true);
 input(w,d.querySelector('#librarySearch'),'__no_template_should_match__');
 assert.equal(d.querySelectorAll('#promptStrip button').length,0);
 assert.match(d.querySelector('#promptStrip').textContent,/No matching/);
 }finally{w.close();}
});
test('copy action copies rendered temporary output and reports success',async()=>{
 const dom=await studio();const w=dom.window,d=w.document;let copied;
 try{
 Object.defineProperty(w.navigator,'clipboard',{value:{writeText:async text=>{copied=text;}}});
 d.querySelector('#scratchModeBtn').click();input(w,d.querySelector('#scratchInput'),'Hello [name]');
 input(w,d.querySelector('#varsList input'),'Nano');
 await w.eval('copyOutput()');assert.equal(copied,'Hello Nano');
 assert.match(d.querySelector('#toast').textContent,/copied/);
 }finally{w.close();}
});

test('save as template creates an independent library entry with variables and current values',async()=>{
 const dom=await studio();const w=dom.window,d=w.document;
 try{
 const original=w.eval('JSON.stringify(data.presets)');
 d.querySelector('#scratchModeBtn').click();
 assert.equal(d.querySelector('#saveScratchBtn').disabled,true);
 input(w,d.querySelector('#scratchInput'),'Draw [subject] in [style]. Repeat [subject].');
 input(w,d.querySelectorAll('#varsList input')[0],'a fox');
 input(w,d.querySelectorAll('#varsList input')[1],'ink');
 d.querySelector('#saveScratchBtn').click();
 assert.equal(d.querySelector('#saveScratchDialog').open,true);
 input(w,d.querySelector('#scratchNameInput'),'Fox illustration');
 d.querySelector('#scratchCategoryInput').value='Experiments';
 d.querySelector('#saveScratchForm').dispatchEvent(new w.Event('submit',{cancelable:true,bubbles:true}));
 const saved=w.eval('data.presets.at(-1)');
 assert.equal(saved.name,'Fox illustration');assert.equal(saved.parent,'Experiments');
 assert.equal(saved.template,'Draw [subject] in [style]. Repeat [subject].');
 assert.equal(w.eval('JSON.stringify(data.presets.slice(0,-1))'),original);
 assert.equal(w.eval('dirty'),true);assert.equal(w.eval('scratchMode'),false);
 assert.equal(d.querySelector('#output').value,'Draw a fox in ink. Repeat a fox.');
 assert.equal(d.querySelector('#saveScratchDialog').open,false);
 assert.equal(w.eval('buildExportObject().presets.at(-1).id'),saved.id);
 d.querySelector('#scratchModeBtn').click();
 input(w,d.querySelector('#scratchInput'),'Changed [subject]');
 assert.equal(saved.template,'Draw [subject] in [style]. Repeat [subject].');
 }finally{w.close();}
});
test('cancelling save as template leaves the library unchanged',async()=>{
 const dom=await studio();const w=dom.window,d=w.document;
 try{
 const original=w.eval('JSON.stringify(data)');
 d.querySelector('#scratchModeBtn').click();input(w,d.querySelector('#scratchInput'),'A [subject]');
 d.querySelector('#saveScratchBtn').click();d.querySelector('#cancelScratchSaveBtn').click();
 assert.equal(d.querySelector('#saveScratchDialog').open,false);
 assert.equal(w.eval('JSON.stringify(data)'),original);assert.equal(w.eval('dirty'),false);
 assert.equal(w.eval('scratchMode'),true);
 }finally{w.close();}
});
