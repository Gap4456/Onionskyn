const {chromium}=require('/opt/npm-tools/node_modules/playwright');const path=require('path');
let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++;};
(async()=>{const b=await chromium.launch();const page=await b.newPage({viewport:{width:1300,height:850}});const errs=[];page.on('pageerror',e=>errs.push(e.message));
await page.addInitScript(()=>{window.__FC_TEST=true;});
await page.goto('file://'+path.resolve(__dirname,'../dist/onionskyn.html'));await page.waitForTimeout(500);
await page.click('#mFile');await page.click('text=New animation');await page.waitForTimeout(150);
const dlg=await page.$('#modal .primary');if(dlg){await dlg.click();await page.waitForTimeout(150);}
// layer with keyframes at 0,2,5 (marker = fill colour), doc 10 frames
await page.evaluate(()=>{const F=window.__FC,C=F.C,S=F.S;S.doc.frames=10;const l=S.doc.layers[S.doc.layers.length-1];S.layerId=l.id;l.kfs=[];
 [[0,'#111111'],[2,'#222222'],[5,'#333333']].forEach(([f,c])=>{const k=C.insertKeyframe(l,f,true);k.objs.push(C.mkPath([C.rectContour(10,10,0)],{fill:c,stroke:null},{x:f*10,y:0}));});
 l.kfs[0].tween='motion';});
const cols=()=>page.evaluate(()=>{const F=window.__FC,C=F.C,S=F.S;const l=S.doc.layers.find(x=>x.id===S.layerId);return l.kfs.map(k=>k.f+':'+(k.objs[0]&&k.objs[0].fill)+':'+k.tween);});
// range-select via the timeline: shift+click frame 1 then frame 8
const cell=async(f)=>{const r=await page.evaluate(()=>{const c=document.getElementById('tlCells')||document.querySelector('#tlC')||document.querySelector('canvas[id^=tl]');return c?c.id:null;});return r;};
const id=await page.evaluate(()=>{const F=window.__FC;return F.S?'ok':'no';});
// drive the model through the same helpers the UI uses
await page.evaluate(()=>{const F=window.__FC,S=F.S,l=S.doc.layers.find(x=>x.id===S.layerId);S.fsel={lid:l.id,a:0,b:7,anchor:0,all:false};});
await page.click('[data-fr="reverse"]');await page.waitForTimeout(150);
let r=await cols();console.log(JSON.stringify(r));
ok(r.length===4&&r[0].startsWith('0:#333333')&&r[1].startsWith('3:#222222')&&r[2].startsWith('6:#111111')&&r[3].startsWith('8:#333333'),'reverse flips keyframe order across frames 1-8');
ok(r[2].endsWith(':none')&&r[0].endsWith(':none'),'tweens do not leak into reversed pieces');
await page.keyboard.press('Control+z');await page.waitForTimeout(150);
r=await cols();ok(r.length===3&&r[0].startsWith('0:#111111')&&r[2].startsWith('5:#333333'),'undo restores');
// move block 2..5 by +2 through core
const mv=(a,b,d)=>page.evaluate(([a,b,d])=>{const F=window.__FC,S=F.S,l=S.doc.layers.find(x=>x.id===S.layerId);return F.C.moveKeyframes([l],a,b,d,S.doc);},[a,b,d]);
ok(await mv(2,5,2)===true,'move block +2');r=await cols();ok(r[1].startsWith('4:')&&r[2].startsWith('7:'),'block moved together '+r);
ok(await mv(4,7,-4)===false,'move onto frame 0 refused');
ok(await mv(4,7,5)===true&&(await page.evaluate(()=>window.__FC.S.doc.frames))>=13,'move past end extends doc');
// pasteboard colour
await page.evaluate(()=>window.__FC.setTab('doc'));await page.waitForTimeout(100);
await page.$eval('#pbg',(e)=>{e.value='#eeeeee';e.dispatchEvent(new Event('input',{bubbles:true}));});await page.waitForTimeout(150);
const px=await page.evaluate(()=>{const c=document.getElementById('stage');const x=c.getContext('2d').getImageData(5,5,1,1).data;return [x[0],x[1],x[2]];});
ok(px.every(v=>v>=236&&v<=240),'pasteboard colour applied '+px);
ok(errs.length===0,'no page errors '+errs.join('|'));
console.log(fails?'FAILED':'ALL PASS');await b.close();process.exit(fails?1:0);})();
