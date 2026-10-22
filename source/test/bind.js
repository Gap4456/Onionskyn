const {chromium}=require('/opt/npm-tools/node_modules/playwright');const path=require('path');
let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++;};
(async()=>{const b=await chromium.launch();const page=await b.newPage({viewport:{width:1300,height:850}});const errs=[];page.on('pageerror',e=>errs.push(e.message));
await page.addInitScript(()=>{window.__FC_TEST=true;});
await page.goto('file://'+path.resolve(__dirname,'../dist/onionskyn.html'));await page.waitForTimeout(500);
await page.click('#mFile');await page.click('text=New animation');await page.waitForTimeout(150);
const dlg=await page.$('#modal .primary');if(dlg){await dlg.click();await page.waitForTimeout(150);}
// fixture: arm + two red segment clips sitting on the bones
const ids=await page.evaluate(()=>{const F=window.__FC,C=F.C,S=F.S,d=S.doc;const l=d.layers[d.layers.length-1];S.layerId=l.id;const kf=C.ensureEditable(l,0);kf.objs.length=0;
 const sym=C.mkLayer('S');sym.kfs[0].objs=[C.mkPath([C.rectContour(100,24)],{fill:'#ff0000',stroke:null},{x:0,y:0})];d.lib['Seg']={frames:1,layers:[sym]};C.setLib(d.lib);
 const rig=C.mkPath([],{fill:'#3F5BFF',stroke:null},{x:0,y:0});rig.rig={s:[150,250],h:[350,250],l1:120,l2:120,flip:1,w:[10,8,6]};C.rigBuild(rig);
 const k=C.rigSolve(rig.rig);const clip=(x,y,r)=>({id:C.uid(),kind:'clip',sym:'Seg',mc:false,mode:'single',first:0,pv:[0,0],op:1,t:{x,y,sx:1,sy:1,r}});
 const ang=(a,b)=>Math.atan2(b[1]-a[1],b[0]-a[0])*180/Math.PI;
 const up=clip((k.s[0]+k.e[0])/2,(k.s[1]+k.e[1])/2,ang(k.s,k.e)),fo=clip((k.e[0]+k.h[0])/2,(k.e[1]+k.h[1])/2,ang(k.e,k.h));
 kf.objs.push(rig,up,fo);S.sel=[];F.setFrame(0);return {rig:rig.id,up:up.id,fo:fo.id,lid:l.id};});
const sel=async(id)=>{await page.evaluate(([lid,id])=>{const F=window.__FC;F.S.layerId=lid;F.S.sel=[{lid,id}];F.refreshProps();},[ids.lid,id]);await page.waitForTimeout(60);};
const ev=(id,f)=>page.evaluate(([lid,id,f])=>{const F=window.__FC,C=F.C,S=F.S,l=S.doc.layers.find(x=>x.id===lid);const o=C.evalLayerObjs(l,f==null?S.frame:f).find(o=>o.id===id);return o?{x:o.t.x,y:o.t.y,r:o.t.r,bind:o.bind||null,rig:o.rig?JSON.parse(JSON.stringify(o.rig)):null}:null;},[ids.lid,id,f]);
await page.evaluate(([lid,rid])=>{const F=window.__FC,S=F.S,l=S.doc.layers.find(x=>x.id===lid);S.noArm=l.kfs[0].objs.splice(l.kfs[0].objs.findIndex(o=>o.id===rid),1)[0];},[ids.lid,ids.rig]);
await sel(ids.up);
ok(await page.locator('#bindRow').isVisible()&&await page.locator('#bindSel').isDisabled()&&/Draw a bone arm/.test(await page.locator('#bindSel').innerText()),'without an arm the row shows a disabled hint');
await page.evaluate(([lid])=>{const F=window.__FC,S=F.S,l=S.doc.layers.find(x=>x.id===lid);l.kfs[0].objs.unshift(S.noArm);},[ids.lid]);await sel(ids.up);
ok(await page.locator('#bindRow').isVisible()&&!(await page.locator('#bindSel').isDisabled()),'with an arm on the layer the dropdown is enabled');
await page.selectOption('#bindSel',ids.rig+':0');await page.waitForTimeout(100);
await sel(ids.fo);await page.selectOption('#bindSel',ids.rig+':1');await page.waitForTimeout(100);
let up0=await ev(ids.up),fo0=await ev(ids.fo);
ok(up0.bind&&up0.bind.bone===0&&fo0.bind&&fo0.bind.bone===1,'both symbols attached');
ok(Math.abs(up0.x-200)<1e-6&&Math.abs(up0.r-Math.atan2(Math.sqrt(4400),100)*180/Math.PI)<1e-6,'attaching does not move anything');
const rg=await ev(ids.rig);ok(rg.rig.ghost===true,'the arm became a guide');
const draw=await page.evaluate(([lid])=>{const F=window.__FC,C=F.C,S=F.S;return {def:C.evalDoc(S.doc,0).flatMap(e=>e.objs).filter(o=>o.rig).length,gh:C.evalDoc(S.doc,0,true).flatMap(e=>e.objs).filter(o=>o.rig).map(o=>o.op)};},[ids.lid]);
ok(draw.def===0&&draw.gh.length===1&&draw.gh[0]<0.5,'guide arm is skipped by default and shown faintly in the editor');
const vis=await page.evaluate(()=>{const F=window.__FC,C=F.C,S=F.S;const l=S.doc.layers.find(x=>x.id===S.layerId);C.setRigGhost(l,l.kfs[0].objs.find(o=>o.rig).id,false);const r={ed:C.evalDoc(S.doc,0,true).flatMap(e=>e.objs).filter(o=>o.rig).map(o=>o.op),out:C.evalDoc(S.doc,0).flatMap(e=>e.objs).filter(o=>o.rig).map(o=>o.op)};C.setRigGhost(l,l.kfs[0].objs.find(o=>o.rig).id,true);return r;});
ok(vis.ed.length===1&&vis.ed[0]<0.5&&vis.out.length===1&&vis.out[0]===1,'a drawn arm is semi-transparent in the editor but full strength in output');
// picking: clicking where the arm overlaps a symbol selects the symbol; Alt+click selects the arm
{const pt0=async(x,y)=>page.evaluate(([x,y])=>{const s=window.__FC.w2s(x,y);const b=document.getElementById('stage').getBoundingClientRect();return [b.left+s[0],b.top+s[1]];},[x,y]);
 await page.evaluate(()=>{window.__FC.S.sel=[];window.__FC.refreshProps();window.__FC.setTool('select');});
 const q=await pt0(up0.x,up0.y);await page.mouse.click(q[0],q[1]);await page.waitForTimeout(80);
 let s1=await page.evaluate(()=>window.__FC.S.sel.map(s=>s.id));ok(s1.length===1&&s1[0]===ids.up,'clicking over the arm selects the symbol');
 await page.evaluate(()=>{window.__FC.S.sel=[];});await page.keyboard.down('Alt');await page.mouse.click(q[0],q[1]);await page.keyboard.up('Alt');await page.waitForTimeout(80);
 let s2=await page.evaluate(()=>window.__FC.S.sel.map(s=>s.id));ok(s2.length===1&&s2[0]===ids.rig,'Alt+click selects the arm');}
// pose the hand with the mouse and check rigid following
await sel(ids.rig);
const pt=async(x,y)=>page.evaluate(([x,y])=>{const s=window.__FC.w2s(x,y);const b=document.getElementById('stage').getBoundingClientRect();return [b.left+s[0],b.top+s[1]];},[x,y]);
const a=await pt(350,250),z=await pt(300,330);await page.mouse.move(a[0],a[1]);await page.mouse.down();await page.mouse.move(z[0],z[1],{steps:6});await page.mouse.up();await page.waitForTimeout(100);
const rigInfo=async(f)=>page.evaluate(([lid,rid,f])=>{const F=window.__FC,C=F.C,S=F.S,l=S.doc.layers.find(x=>x.id===lid);const o=C.evalLayerObjs(l,f==null?S.frame:f).find(o=>o.id===rid);return {fa:C.boneFrame(o,0),fb:C.boneFrame(o,1)};},[ids.lid,ids.rig,f]);
const rigAngle=(f,u)=>Math.atan2(0,1);
const rel=(o,fr)=>{const th=fr.r*Math.PI/180,dx=o.x-fr.x,dy=o.y-fr.y;return {lx:Math.cos(th)*dx+Math.sin(th)*dy,ly:-Math.sin(th)*dx+Math.cos(th)*dy,lr:o.r-fr.r};};
let up1=await ev(ids.up),fo1=await ev(ids.fo),R=await rigInfo();
let ru=rel(up1,R.fa),rf=rel(fo1,R.fb);
ok(Math.abs(ru.lx-60)<1e-6&&Math.abs(ru.ly)<1e-6&&Math.abs(ru.lr)<1e-6,'upper arm art follows the upper bone rigidly after posing');
ok(Math.abs(rf.lx-60)<1e-6&&Math.abs(rf.ly)<1e-6&&Math.abs(rf.lr)<1e-6,'forearm art follows the forearm rigidly');
ok(Math.abs(up1.r)>1&&Math.abs(fo1.r-up1.r)>1,'the two parts rotated differently');
// tween: second keyframe with a different hand
const tw=await page.evaluate(([lid,rid])=>{const F=window.__FC,C=F.C,S=F.S,l=S.doc.layers.find(x=>x.id===lid);const k1=C.insertKeyframe(l,10,false);const r=k1.objs.find(o=>o.id===rid);r.rig.h=[200,150];C.rigBuild(r);C.settleBinds(k1.objs,null);C.kfAt(l,0).tween='motion';return true;},[ids.lid,ids.rig]);
const mid=await ev(ids.fo,5),Rm=await rigInfo(5),rm=rel(mid,Rm.fb);
ok(Math.abs(rm.lx-60)<1e-4&&Math.abs(rm.ly)<1e-4&&Math.abs(rm.lr)<1e-4,'attached art stays rigid at a tweened frame');
// drag a bound symbol: it re-attaches where it is dropped
await page.evaluate(()=>window.__FC.setFrame(0));await sel(ids.fo);
const f0=await ev(ids.fo,0);const p0=await pt(f0.x,f0.y),p1=await pt(f0.x+30,f0.y+20);
await page.mouse.move(p0[0],p0[1]);await page.mouse.down();await page.mouse.move(p1[0],p1[1],{steps:6});await page.mouse.up();await page.waitForTimeout(100);
const f1=await ev(ids.fo,0);ok(Math.abs(f1.x-f0.x-30)<2.5&&Math.abs(f1.y-f0.y-20)<2.5&&f1.bind,'dragging an attached symbol moves it and keeps it attached');
const R0=await rigInfo(0),rr=rel(f1,R0.fb);ok(Math.abs(rr.lx-f1.bind.lx)<1e-6&&Math.abs(rr.ly-f1.bind.ly)<1e-6,'its offset from the bone was updated');
// detach
await page.selectOption('#bindSel','');await page.waitForTimeout(80);const f2=await ev(ids.fo,0);ok(!f2.bind&&Math.abs(f2.x-f1.x)<1e-6,'None detaches without moving it');
// save/load validation
const rt=await page.evaluate(([lid,id])=>{const F=window.__FC,C=F.C,S=F.S;const d=JSON.parse(JSON.stringify(S.doc));const o=d.layers.find(x=>x.id===lid).kfs[0].objs.find(o=>o.id===id);o.bind={to:'x',bone:5,lx:NaN,ly:0,lr:0};C.normalizeDoc(d);return !d.layers.find(x=>x.id===lid).kfs[0].objs.find(o=>o.id===id).bind;},[ids.lid,ids.up]);
ok(rt,'a corrupt attachment is dropped on load');
// runtime hides the guide arm
const px=await page.evaluate(()=>{const F=window.__FC,S=F.S;const cv=document.createElement('canvas');cv.width=S.doc.w;cv.height=S.doc.h;document.body.appendChild(cv);cv.style.cssText='position:fixed;left:0;top:0;z-index:99';
 const rt=window.FCRuntime.create(JSON.parse(JSON.stringify(S.doc)),cv,{onError:()=>{}});rt.start();for(let i=0;i<3;i++)rt.tick();
 const d=cv.getContext('2d').getImageData(0,0,cv.width,cv.height).data;let blue=0,red=0;for(let i=0;i<d.length;i+=4){if(d[i+2]>200&&d[i]<120)blue++;if(d[i]>200&&d[i+1]<60&&d[i+2]<60)red++;}cv.remove();return {blue,red};});
ok(px.blue===0&&px.red>500,'preview draws the symbols but not the guide arm ('+JSON.stringify(px)+')');
ok(errs.length===0,'no page errors '+errs.join('|'));
console.log(fails?'FAILED':'ALL PASS');await b.close();process.exit(fails?1:0);})();
