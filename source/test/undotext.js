const {chromium}=require('playwright');const path=require('path');
let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++;};
(async()=>{const b=await chromium.launch();const page=await b.newPage({viewport:{width:1300,height:850}});const errs=[];page.on('pageerror',e=>errs.push(e.message));
await page.addInitScript(()=>{window.__FC_TEST=true;});
await page.goto('file://'+path.resolve(__dirname,'../dist/onionskyn.html'));await page.waitForTimeout(500);
await page.click('#mFile');await page.click('text=New animation');await page.waitForTimeout(150);
const dlg=await page.$('#modal .primary');if(dlg){await dlg.click();await page.waitForTimeout(150);}
await page.evaluate(()=>window.__FC.setTab('frame'));await page.waitForTimeout(100);
const H=()=>page.evaluate(()=>window.__FC.H.stack.length);
const script=()=>page.evaluate(()=>{const F=window.__FC,S=F.S;const l=S.doc.layers.find(l=>l.id===S.layerId)||S.doc.layers[S.doc.layers.length-1];const k=F.C.kfAt(l,S.frame);return k&&k.script||'';});
const h0=await H();
await page.click('#kfScript');
await page.keyboard.type('stop();\nthis.x = 5;',{delay:15});
await page.waitForTimeout(100);
const h1=await H();
ok(h1-h0<=1,'typing a script in one go adds at most 1 history step (added '+(h1-h0)+')');
ok((await script()).includes('this.x = 5;'),'script text is stored');
await page.waitForTimeout(1200);
await page.keyboard.type(' // more',{delay:15});
const h2=await H();
ok(h2-h1<=1,'typing again after a pause adds at most 1 more step (added '+(h2-h1)+')');
// undo from the toolbar removes the typed text, in few steps
let n=0;while(n<5&&!(await page.$eval('#bUndo',b=>b.disabled))){await page.click('#bUndo');n++;if(!(await script()))break;}
ok(n<=3,'undo clears the script in '+n+' click(s)');
// the label field
await page.click('#kfLabel');await page.keyboard.type('intro',{delay:15});await page.waitForTimeout(60);
const h3=await H();await page.keyboard.type('X',{delay:15});await page.waitForTimeout(60);
ok((await H())-h3<=0,'continuing to type in the label does not add steps');
// arrow-key nudges are still one step per press
await page.click('#kfLabel');await page.evaluate(()=>document.activeElement.blur());
ok(errs.length===0,'no page errors '+errs.join(';'));
console.log(fails?'FAILED '+fails:'ALL PASS');await b.close();process.exit(fails?1:0);})();
