const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('jsdom');
const html=fs.readFileSync('index.html','utf8');
const library=JSON.parse(fs.readFileSync('presets.json','utf8'));
async function studio(options={}){
 const dom=new JSDOM(html,{url:'http://localhost/',runScripts:'dangerously',beforeParse(w){
  w.structuredClone=structuredClone;w.TextDecoder=TextDecoder;w.TextEncoder=TextEncoder;
  w.fetch=async url=>({ok:true,json:async()=>String(url).includes('api.github.com')?{sha:'test-sha',content:Buffer.from(JSON.stringify(library)).toString('base64')}:library});
  if(options.storage) for(const [key,value] of Object.entries(options.storage))w.localStorage.setItem(key,value);
  if(options.fetch)w.fetch=options.fetch;
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

test('temporary find and replace is literal, updates variables, and preserves the library',async()=>{
 const dom=await studio();const w=dom.window,d=w.document;
 try{
 const before=w.eval('JSON.stringify(data)');
 const stored=w.localStorage.getItem('nano_prompt_studio_values_v1');
 d.querySelector('#scratchModeBtn').click();
 input(w,d.querySelector('#scratchInput'),'Cat cat CAT [subject] a.b aXb $&');
 input(w,d.querySelector('#scratchFindInput'),'cat');
 assert.equal(d.querySelector('#scratchFindStatus').textContent,'3 matches');
 input(w,d.querySelector('#scratchReplaceInput'),'[animal]');
 d.querySelector('#scratchReplaceOneBtn').click();
 assert.equal(d.querySelector('#scratchInput').value,'[animal] cat CAT [subject] a.b aXb $&');
 assert.equal(d.querySelectorAll('#varsList input').length,2);
 d.querySelector('#scratchMatchCase').checked=true;
 d.querySelector('#scratchMatchCase').dispatchEvent(new w.Event('change'));
 assert.equal(d.querySelector('#scratchFindStatus').textContent,'1 match');
 input(w,d.querySelector('#scratchReplaceInput'),'$&');
 d.querySelector('#scratchReplaceAllBtn').click();
 assert.match(d.querySelector('#scratchInput').value,/\[animal\] \$& CAT/);
 input(w,d.querySelector('#scratchFindInput'),'a.b');
 assert.equal(d.querySelector('#scratchFindStatus').textContent,'1 match');
 input(w,d.querySelector('#scratchReplaceInput'),'');d.querySelector('#scratchReplaceAllBtn').click();
 assert.match(d.querySelector('#scratchInput').value,/aXb/);
 assert.equal(d.querySelector('#scratchInput').value.includes('a.b'),false);
 input(w,d.querySelector('#scratchFindInput'),'[subject]');
 input(w,d.querySelector('#scratchReplaceInput'),'[lighting]');d.querySelector('#scratchReplaceAllBtn').click();
 assert.ok([...d.querySelectorAll('#varsList label')].some(el=>el.textContent==='lighting'));
 assert.equal(d.querySelector('#output').value,d.querySelector('#scratchInput').value);
 assert.equal(w.eval('JSON.stringify(data)'),before);assert.equal(w.eval('dirty'),false);
 assert.equal(w.localStorage.getItem('nano_prompt_studio_values_v1'),stored);
 input(w,d.querySelector('#scratchFindInput'),'');
 assert.equal(d.querySelector('#scratchReplaceAllBtn').disabled,true);
 assert.equal(d.querySelector('#scratchFindStatus').textContent,'Enter text to find.');
 }finally{w.close();}
});

const draftKey='nano_prompt_studio_pending_library_v1';
function snapshotStorage(w){return Object.fromEntries(Array.from({length:w.localStorage.length},(_,i)=>{const key=w.localStorage.key(i);return [key,w.localStorage.getItem(key)];}));}
function remoteMock({failWrite=false,conflict=false,onWrite=null}={}){
 let stored=structuredClone(library),sha='test-sha',writes=0;
 return {get writes(){return writes;},get data(){return stored;},fetch:async(url,options={})=>{
  if(options.method==='PUT'){
   writes++;
   if(failWrite)return {ok:false,status:403,json:async()=>({message:'Permission denied'})};
   const body=JSON.parse(options.body);
   stored=JSON.parse(Buffer.from(body.content,'base64').toString('utf8'));sha='saved-sha';
   if(onWrite)await onWrite();
   return {ok:true,json:async()=>({content:{sha}})};
  }
  return {ok:true,json:async()=>({sha:conflict?'other-device-sha':sha,content:Buffer.from(JSON.stringify(stored)).toString('base64')})};
 }};
}
test('pending template edits survive a fresh session without a GitHub token',async()=>{
 const first=await studio();let storage;
 try{
 first.window.document.querySelector('#editModeBtn').click();
 input(first.window,first.window.document.querySelector('#editNameInput'),'Retained across sessions');
 storage=snapshotStorage(first.window);assert.ok(storage[draftKey]);
 }finally{first.window.close();}
 const second=await studio({storage});
 try{
 assert.equal(second.window.document.querySelector('#workspaceTitle').textContent,'Retained across sessions');
 assert.equal(second.window.eval('dirty'),true);
 assert.match(second.window.document.querySelector('#syncStatus').textContent,/kept in this browser/);
 assert.equal(second.window.document.querySelector('#syncSaveBtn').disabled,false);
 }finally{second.window.close();}
});
test('verified GitHub save persists into a new session and clears the pending draft',async()=>{
 const remote=remoteMock();const dom=await studio({fetch:remote.fetch});const w=dom.window;
 let storage;
 try{
 w.sessionStorage.setItem('nano_prompt_studio_github_token_session_v1','test-only');
 w.document.querySelector('#editModeBtn').click();input(w,w.document.querySelector('#editNameInput'),'Saved remotely');
 assert.equal(await w.eval('savePresetsToGithub()'),true);assert.equal(remote.writes,1);
 assert.equal(w.eval('dirty'),false);assert.equal(w.localStorage.getItem(draftKey),null);
 assert.match(w.document.querySelector('#syncStatus').textContent,/verified/);storage=snapshotStorage(w);
 }finally{w.close();}
 const next=await studio({fetch:remote.fetch,storage});
 try{assert.equal(next.window.eval('data.presets[0].name'),'Saved remotely');assert.equal(next.window.eval('dirty'),false);}
 finally{next.window.close();}
});
test('GitHub permission failure displays an error and retains recoverable template edits',async()=>{
 const remote=remoteMock({failWrite:true});const dom=await studio({fetch:remote.fetch});const w=dom.window;
 try{
 w.sessionStorage.setItem('nano_prompt_studio_github_token_session_v1','test-only');
 w.document.querySelector('#editModeBtn').click();input(w,w.document.querySelector('#editNameInput'),'Keep despite failure');
 assert.equal(await w.eval('savePresetsToGithub()'),false);
 assert.equal(w.eval('dirty'),true);assert.ok(w.localStorage.getItem(draftKey));
 assert.match(w.document.querySelector('#syncStatus').textContent,/Save failed.*403/);
 assert.equal(w.document.querySelector('#syncSaveBtn').disabled,false);
 }finally{w.close();}
});
test('restored edits keep their original base SHA and cannot overwrite another device',async()=>{
 const first=await studio();let storage;
 try{first.window.document.querySelector('#editModeBtn').click();input(first.window,first.window.document.querySelector('#editNameInput'),'Local edit');storage=snapshotStorage(first.window);}
 finally{first.window.close();}
 const remote=remoteMock({conflict:true});const next=await studio({storage,fetch:remote.fetch});const w=next.window;
 try{
 w.sessionStorage.setItem('nano_prompt_studio_github_token_session_v1','test-only');
 assert.equal(await w.eval('savePresetsToGithub()'),false);assert.equal(remote.writes,0);
 assert.match(w.document.querySelector('#syncStatus').textContent,/changed on GitHub/);
 assert.ok(w.localStorage.getItem(draftKey));
 }finally{w.close();}
});
test('changes typed during an upload remain pending instead of being replaced by the saved snapshot',async()=>{
 let w;const remote=remoteMock({onWrite:async()=>input(w,w.document.querySelector('#editNameInput'),'Newer edit')});
 const dom=await studio({fetch:remote.fetch});w=dom.window;
 try{
 w.sessionStorage.setItem('nano_prompt_studio_github_token_session_v1','test-only');
 w.document.querySelector('#editModeBtn').click();input(w,w.document.querySelector('#editNameInput'),'Uploading snapshot');
 assert.equal(await w.eval('savePresetsToGithub()'),true);
 assert.equal(remote.data.presets[0].name,'Uploading snapshot');
 assert.equal(w.eval('data.presets[0].name'),'Newer edit');assert.equal(w.eval('dirty'),true);
 const pending=JSON.parse(w.localStorage.getItem(draftKey));assert.equal(pending.repoFileSha,'saved-sha');
 assert.equal(pending.data.presets[0].name,'Newer edit');
 }finally{w.close();}
});
test('saving a scratchpad template uploads it to GitHub rather than stopping at adding to memory',async()=>{
 const remote=remoteMock();const dom=await studio({fetch:remote.fetch});const w=dom.window,d=w.document;
 try{
 w.sessionStorage.setItem('nano_prompt_studio_github_token_session_v1','test-only');
 d.querySelector('#scratchModeBtn').click();input(w,d.querySelector('#scratchInput'),'A [subject]');
 d.querySelector('#saveScratchBtn').click();input(w,d.querySelector('#scratchNameInput'),'Synced scratch template');
 const event=new w.Event('submit',{cancelable:true});await d.querySelector('#saveScratchForm').onsubmit(event);
 assert.equal(remote.writes,1);assert.equal(remote.data.presets.at(-1).name,'Synced scratch template');
 assert.equal(w.eval('dirty'),false);assert.equal(w.localStorage.getItem(draftKey),null);
 }finally{w.close();}
});
function imageRemote({failTemplateSave=false,onImageUpload=null,failImage=false}={}){
 const templates=remoteMock({failWrite:failTemplateSave});let uploaded=false;
 return {templates,fetch:async(url,options={})=>{
  if(!String(url).includes('/contents/images/'))return templates.fetch(url,options);
  if(options.method==='PUT'){
   if(failImage)return {ok:false,status:403,json:async()=>({message:'Image write denied'})};
   uploaded=true;if(onImageUpload)await onImageUpload();
   return {ok:true,json:async()=>({content:{sha:'image-sha'}})};
  }
  return uploaded ? {ok:true,json:async()=>({sha:'image-sha'})} : {ok:false,status:404};
 }};
}
const imageFile=()=>({name:'reference.png',type:'image/png',arrayBuffer:async()=>Uint8Array.from([137,80,78,71]).buffer});
function imageSession(w){w.sessionStorage.setItem('nano_prompt_studio_github_token_session_v1','test-only');w.URL.createObjectURL=()=> 'blob:immediate-reference';w.URL.revokeObjectURL=()=>{};}
test('Add Image saves both the file and its template link and survives another session',async()=>{
 const remote=imageRemote();const dom=await studio({fetch:remote.fetch});const w=dom.window;
 try{
 imageSession(w);assert.equal(await w.saveReferenceImage(imageFile()),true);
 assert.equal(remote.templates.writes,1);assert.equal(remote.templates.data.presets[0].reference,'images/reference.png');
 assert.equal(w.document.querySelector('#thumbImg').src,'blob:immediate-reference');
 assert.equal(w.eval('dirty'),false);assert.equal(w.localStorage.getItem(draftKey),null);
 assert.match(w.document.querySelector('#folderStatus').textContent,/Image and template saved/);
 }finally{w.close();}
 const next=await studio({fetch:remote.fetch});
 try{
 assert.match(next.window.document.querySelector('#thumbImg').src,/raw\.githubusercontent\.com\/Bankseyy\/Nano-Prompt-Final\/main\/images\/reference\.png/);
 assert.equal(next.window.document.querySelector('#thumb').style.display,'block');
 }finally{next.window.close();}
});
test('image upload keeps its original destination if selection changes while uploading',async()=>{
 let w;const remote=imageRemote({onImageUpload:async()=>{w.eval('state.currentId=data.presets[1].id;state.activeParent=parentOf(data.presets[1]);rerenderAll();');}});
 const dom=await studio({fetch:remote.fetch});w=dom.window;
 try{
 imageSession(w);const untouched=w.eval('data.presets[1].reference');
 assert.equal(await w.saveReferenceImage(imageFile()),true);
 assert.equal(remote.templates.data.presets[0].reference,'images/reference.png');
 assert.equal(remote.templates.data.presets[1].reference,untouched);
 }finally{w.close();}
});
test('failed template save retains the uploaded image link for retry',async()=>{
 const remote=imageRemote({failTemplateSave:true});const dom=await studio({fetch:remote.fetch});const w=dom.window;
 try{
 imageSession(w);assert.equal(await w.saveReferenceImage(imageFile()),false);
 assert.equal(w.eval('dirty'),true);
 assert.equal(JSON.parse(w.localStorage.getItem(draftKey)).data.presets[0].reference,'images/reference.png');
 assert.match(w.document.querySelector('#folderStatus').textContent,/template link still pending/);
 assert.match(w.document.querySelector('#syncStatus').textContent,/Save failed/);
 assert.equal(w.document.querySelector('#addImageBtn').disabled,false);
 }finally{w.close();}
});
test('image upload failure leaves the original reference unchanged and displays its error',async()=>{
 const remote=imageRemote({failImage:true});const dom=await studio({fetch:remote.fetch});const w=dom.window;
 try{
 imageSession(w);const before=w.eval('JSON.stringify(data)');
 assert.equal(await w.saveReferenceImage(imageFile()),false);
 assert.equal(w.eval('JSON.stringify(data)'),before);assert.equal(remote.templates.writes,0);
 assert.match(w.document.querySelector('#folderStatus').textContent,/Image write denied/);
 assert.equal(w.document.querySelector('#addImageBtn').disabled,false);
 }finally{w.close();}
});
