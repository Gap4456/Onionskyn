const {chromium}=require('/opt/npm-tools/node_modules/playwright');const path=require('path');
let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++;};
(async()=>{const b=await chromium.launch();const page=await b.newPage({viewport:{width:1300,height:850}});const errs=[];page.on('pageerror',e=>errs.push(e.message));
await page.addInitScript(()=>{window.__FC_TEST=true;});
await page.goto('file://'+path.resolve(__dirname,'../dist/onionskyn.html'));await page.waitForTimeout(500);
await page.click('#mFile');await page.click('text=New animation');await page.waitForTimeout(150);
const dlg=await page.$('#modal .primary');if(dlg){await dlg.click();await page.waitForTimeout(150);}
// fixtures: a filled square, a line, a filled+stroked square, and a far-away square
await page.evaluate(()=>{const F=window.__FC,C=F.C,S=F.S;const l=S.doc.layers[S.doc.layers.length-1];S.layerId=l.id;const kf=C.ensureEditable(l,0);kf.objs.length=0;
  const sq=(x,y,st)=>{const o=C.mkPath([C.rectContour(100,100,0)],st,{x,y});o.nz=false;return o;};
  kf.objs.push(sq(150,120,{fill:'#3F5BFF',stroke:null}));
  const ln=C.mkPath([{closed:false,nodes:[C.node(-100,0),C.node(100,0)]}],{fill:null,stroke:'#1B2030',sw:6},{x:300,y:300});kf.objs.push(ln);
  kf.objs.push(sq(420,120,{fill:'#E5484D',stroke:'#000000',sw:4}));
  kf.objs.push(sq(150,330,{fill:'#2FB36B',stroke:null}));
  S.sel=[];F.setFrame(0);});
await page.waitForTimeout(200);
const info=()=>page.evaluate(()=>{const F=window.__FC,C=F.C,S=F.S;const l=S.doc.layers.find(l=>l.id===S.layerId);const kf=C.kfAt(l,0);
  const area=(o)=>{const m=C.matOf(o.t);let s=0;for(const c of o.contours){if(!c.closed)continue;const p=c.nodes.map(n=>C.mapply(m,n.x,n.y));let a=0;for(let i=0;i<p.length;i++){const q=p[(i+1)%p.length];a+=p[i][0]*q[1]-q[0]*p[i][1];}s+=a/2;}return Math.abs(s);};
  return kf.objs.map(o=>({id:o.id,fill:o.fill,stroke:o.stroke,area:area(o),closed:o.contours.filter(c=>c.closed).length,open:o.contours.filter(c=>!c.closed).length,cx:o.t.x,cy:o.t.y}));});
const H=()=>page.evaluate(()=>window.__FC.H.stack.length);
const pt=async(x,y)=>{const r=await page.evaluate(([x,y])=>{const s=window.__FC.w2s(x,y);const b=document.getElementById('stage').getBoundingClientRect();return [b.left+s[0],b.top+s[1]];},[x,y]);return r;};
const drag=async(pts)=>{const q=await Promise.all(pts.map(p=>pt(p[0],p[1])));await page.mouse.move(q[0][0],q[0][1]);await page.mouse.down();for(let i=1;i<q.length;i++)await page.mouse.move(q[i][0],q[i][1],{steps:8});await page.mouse.up();await page.waitForTimeout(80);};
// hotkey and size
await page.evaluate(()=>{window.__FC.S.style.esize=20;});
await page.keyboard.press('e');await page.waitForTimeout(80);
ok(await page.evaluate(()=>window.__FC.S.tool)==='eraser','E selects the eraser');
await page.keyboard.press(']');ok(await page.evaluate(()=>window.__FC.S.style.esize)>20,'] grows the eraser');
await page.keyboard.press('[');ok(await page.evaluate(()=>window.__FC.S.style.esize)===20,'[ shrinks it back');
let a=await info();ok(a.length===4,'4 fixture objects');
const h0=await H();
// 1. sweep through the middle of the filled square (x 100..200, y 70..170): removes a 20px band
await drag([[150,60],[150,180]]);
let b1=await info();
const sq=b1.filter(o=>o.fill==='#3F5BFF');
ok(sq.length===1&&sq[0].closed===2,'the square is cut into two pieces ('+sq[0].closed+' rings)');
ok(Math.abs(sq[0].area-8000)<250,'remaining area is about 8000 (got '+Math.round(sq[0].area)+')');
ok((await H())-h0===1,'a whole stroke is one undo step (added '+((await H())-h0)+')');
await page.keyboard.press('Control+z');await page.waitForTimeout(100);
let b2=await info();ok(Math.abs(b2.find(o=>o.fill==='#3F5BFF').area-10000)<1,'undo restores the square');
// 2. a single click makes a round hole
const h1=await H();await drag([[150,120],[150,120]]);
let b3=await info();const hole=b3.find(o=>o.fill==='#3F5BFF');
ok(hole.closed===2&&Math.abs(hole.area-(10000-Math.PI*100))<200,'a click punches a round hole (rings '+hole.closed+', area '+Math.round(hole.area)+')');
ok((await H())-h1===1,'the click is one undo step');
// 3. trimming a line
await drag([[300,260],[300,340]]);
let b4=await info();const line=b4.find(o=>o.stroke==='#1B2030');
ok(line&&line.open===2,'the line is trimmed into two pieces ('+(line&&line.open)+')');
// 4. fill + stroke splits into a fill object and a line object
await drag([[420,60],[420,180]]);
let b5=await info();
const red=b5.filter(o=>o.fill==='#E5484D'&&!o.stroke),outl=b5.filter(o=>o.stroke==='#000000'&&!o.fill);
ok(red.length===1&&outl.length===1,'fill and outline become separate objects ('+red.length+'/'+outl.length+')');
ok(Math.abs(red[0].area-8000)<250,'the fill lost a 20px band (area '+Math.round(red[0].area)+')');
ok(outl[0].open>=2,'the outline is trimmed ('+outl[0].open+' open pieces)');
// 5. the far square is untouched
const far=b5.find(o=>o.fill==='#2FB36B');ok(far&&Math.abs(far.area-10000)<1,'objects the eraser never touched are unchanged');
// 6. erasing everything under a big sweep removes the object entirely
await page.evaluate(()=>window.__FC.S.style.esize=200);
await drag([[150,330],[150,330]]);
let b6=await info();ok(!b6.find(o=>o.fill==='#2FB36B'),'a shape fully covered is removed');
// 7. locked layer: nothing changes
await page.evaluate(()=>{const S=window.__FC.S;S.doc.layers.find(l=>l.id===S.layerId).locked=true;});
const before=JSON.stringify(await info());await drag([[150,100],[150,140]]);
ok(JSON.stringify(await info())===before,'a locked layer is left alone');
ok(errs.length===0,'no page errors '+errs.join(';'));
console.log(fails?'FAILED '+fails:'ALL PASS');await b.close();process.exit(fails?1:0);})();
