const {chromium}=require('/opt/npm-tools/node_modules/playwright');const path=require('path');
let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++;};
(async()=>{const b=await chromium.launch();const page=await b.newPage({viewport:{width:1300,height:850}});const errs=[];page.on('pageerror',e=>errs.push(e.message));
await page.addInitScript(()=>{window.__FC_TEST=true;});
await page.goto('file://'+path.resolve(__dirname,'../dist/onionskyn.html'));await page.waitForTimeout(500);
await page.click('#mFile');await page.click('text=New animation');await page.waitForTimeout(150);
const dlg=await page.$('#modal .primary');if(dlg){await dlg.click();await page.waitForTimeout(150);}
// solver
const sv=await page.evaluate(()=>{const C=window.__FC.C;let worst=0,reachOk=true;
 for(let i=0;i<500;i++){const g={s:[Math.random()*100,Math.random()*100],h:[Math.random()*400-100,Math.random()*400-100],l1:30+Math.random()*100,l2:30+Math.random()*100,flip:i%2?1:-1,w:[5,4,3]};
  const k=C.rigSolve(g);const a=Math.hypot(k.e[0]-k.s[0],k.e[1]-k.s[1])-g.l1,c=Math.hypot(k.h[0]-k.e[0],k.h[1]-k.e[1])-g.l2;worst=Math.max(worst,Math.abs(a),Math.abs(c));
  const d=Math.hypot(g.h[0]-g.s[0],g.h[1]-g.s[1]);if(d<g.l1+g.l2-1e-3&&d>Math.abs(g.l1-g.l2)+1e-3&&Math.hypot(k.h[0]-g.h[0],k.h[1]-g.h[1])>1e-6)reachOk=false;}
 return {worst,reachOk};});
ok(sv.worst<1e-6,'bone lengths preserved for random targets (err '+sv.worst+')');ok(sv.reachOk,'hand lands on the target when reachable');
// draw three clicks with the Bone tool
const pt=async(x,y)=>page.evaluate(([x,y])=>{const s=window.__FC.w2s(x,y);const b=document.getElementById('stage').getBoundingClientRect();return [b.left+s[0],b.top+s[1]];},[x,y]);
await page.keyboard.press('j');await page.waitForTimeout(80);
ok(await page.evaluate(()=>window.__FC.S.tool)==='bone','J selects the Bone tool');
for(const [x,y] of [[150,200],[250,120],[350,200]]){const q=await pt(x,y);await page.mouse.click(q[0],q[1]);await page.waitForTimeout(60);}
const info=()=>page.evaluate(()=>{const F=window.__FC,S=F.S,l=S.doc.layers.find(x=>x.id===S.layerId);const kf=F.C.kfFor(l,S.frame);const o=kf.objs.find(o=>o.rig);return o?{rig:JSON.parse(JSON.stringify(o.rig)),n:o.contours.length,tool:S.tool,sel:S.sel.length}:null;});
let i0=await info();ok(!!i0&&i0.n===5&&i0.tool==='select'&&i0.sel===1,'three clicks make a rig and switch to Select');
ok(i0&&Math.abs(i0.rig.l1-Math.hypot(100,80))<2&&Math.abs(i0.rig.l2-Math.hypot(100,80))<2,'segment lengths come from the clicks');
// drag the hand
const before=await page.evaluate(()=>window.__FC.H.stack.length);
let a=await pt(350,200),z=await pt(300,250);
await page.mouse.move(a[0],a[1]);await page.mouse.down();await page.mouse.move(z[0],z[1],{steps:6});await page.mouse.up();await page.waitForTimeout(80);
let i1=await info();ok(i1&&Math.abs(i1.rig.h[0]-300)<1.5&&Math.abs(i1.rig.h[1]-250)<1.5,'dragging the hand handle moves the target');
ok(i1&&Math.abs(i1.rig.l1-i0.rig.l1)<1e-9,'lengths unchanged by posing');
await page.keyboard.press('Control+z');await page.waitForTimeout(80);let i2=await info();ok(i2&&Math.abs(i2.rig.h[0]-350)<1.5,'undo restores the pose');
// flip via panel
await page.click('#rigFlip');await page.waitForTimeout(80);let i3=await info();ok(i3&&i3.rig.flip===-i0.rig.flip,'Flip bend toggles the elbow side');
await page.fill('#rigW0','20');await page.waitForTimeout(80);let i4=await info();ok(i4&&i4.rig.w[0]===20,'thickness field edits the shoulder radius');
// tween: keyframe 10 with a different hand, motion tween
const tw=await page.evaluate(()=>{const F=window.__FC,C=F.C,S=F.S,l=S.doc.layers.find(x=>x.id===S.layerId);
 const k0=C.kfAt(l,0);const k1=C.insertKeyframe(l,10,false);k1.objs.find(o=>o.rig).rig.h=[200,260];k0.tween='motion';
 const o=C.evalLayerObjs(l,5).find(o=>o.rig);const k=C.rigSolve(o.rig);
 return {h:o.rig.h,len:[Math.hypot(k.e[0]-k.s[0],k.e[1]-k.s[1])-o.rig.l1,Math.hypot(k.h[0]-k.e[0],k.h[1]-k.e[1])-o.rig.l2],n:o.contours.length,h0:k0.objs.find(o=>o.rig).rig.h};});
ok(Math.abs(tw.h[0]-(tw.h0[0]+200)/2)<1e-6&&Math.abs(tw.h[1]-(tw.h0[1]+260)/2)<1e-6,'tween interpolates the hand position');
ok(Math.abs(tw.len[0])<1e-6&&Math.abs(tw.len[1])<1e-6&&tw.n===5,'tweened frame is a valid rebuilt arm');
// round trip + tampering
const rt=await page.evaluate(()=>{const F=window.__FC,C=F.C,S=F.S;const d=JSON.parse(JSON.stringify(S.doc));C.normalizeDoc(d);
 const l=d.layers.find(x=>x.id===S.layerId);const o=l.kfs[0].objs.find(o=>o.rig);const okKeep=!!o&&o.contours.length===5;
 const bad=JSON.parse(JSON.stringify(S.doc));bad.layers.find(x=>x.id===S.layerId).kfs[0].objs.find(o=>o.rig).rig.h=[NaN,'x'];C.normalizeDoc(bad);
 const bo=bad.layers.find(x=>x.id===S.layerId).kfs[0].objs.find(o=>o.kind==='path');return {okKeep,dropped:!bo.rig};});
ok(rt.okKeep,'rig survives save/load');ok(rt.dropped,'a corrupt rig is dropped, leaving a plain shape');
// runtime draws it
const px=await page.evaluate(()=>{const F=window.__FC,S=F.S;const cv=document.createElement('canvas');cv.width=S.doc.w;cv.height=S.doc.h;document.body.appendChild(cv);cv.style.cssText='position:fixed;left:0;top:0;z-index:99';
 const rt=window.FCRuntime.create(JSON.parse(JSON.stringify(S.doc)),cv,{onError:()=>{}});rt.start();for(let i=0;i<4;i++)rt.tick();
 const d=cv.getContext('2d').getImageData(0,0,cv.width,cv.height).data;let n=0;for(let i=0;i<d.length;i+=4){if(d[i]!==d[0]||d[i+1]!==d[1]||d[i+2]!==d[2])n++;}rt.stop&&rt.stop();cv.remove();return n;});
ok(px>500,'the standalone runtime draws the arm ('+px+' px)');
// node tool and eraser leave it alone
await page.evaluate(()=>{const F=window.__FC;F.S.frame=0;F.setFrame(0);});
await page.keyboard.press('a');const q=await pt(150,200);await page.mouse.click(q[0],q[1]);await page.waitForTimeout(80);
ok((await info())&&(await info()).n===5,'node tool does not edit a rig');
ok(errs.length===0,'no page errors '+errs.join('|'));
console.log(fails?'FAILED':'ALL PASS');await b.close();process.exit(fails?1:0);})();
