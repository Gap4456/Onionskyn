const {chromium}=require('/opt/npm-tools/node_modules/playwright');const path=require('path');
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
ok(h1-h0===1,'typing a script in one go adds exactly 1 history step (added '+(h1-h0)+')');
ok((await script()).includes('this.x = 5;'),'script text is stored');
await page.waitForTimeout(1200);
await page.keyboard.type(' // more',{delay:15});
const h2=await H();
ok(h2-h1===1,'typing again after a pause adds exactly 1 more step (added '+(h2-h1)+')');
// undo from the toolbar removes the typed text, in few steps
let n=0;while(n<5&&!(await page.$eval('#bUndo',b=>b.disabled))){await page.click('#bUndo');n++;if(!(await script()))break;}
ok(n===2,'undo clears the script in exactly 2 clicks (took '+n+')');
// the label field
await page.click('#kfLabel');await page.keyboard.type('intro',{delay:15});await page.waitForTimeout(60);
const h3=await H();await page.keyboard.type('X',{delay:15});await page.waitForTimeout(60);
ok((await H())-h3===0,'continuing to type in the label does not add steps');
// the document name field (Doc tab): a burst of typing is one step
await page.evaluate(()=>window.__FC.setTab('doc'));await page.waitForTimeout(80);
const h4=await H();await page.click('#dname');await page.keyboard.press('Control+a');await page.keyboard.type('My film',{delay:15});await page.waitForTimeout(60);
ok((await H())-h4===1,'typing the document name adds exactly 1 history step (added '+((await H())-h4)+')');
// a number field still records one step per arrow-key press
await page.evaluate(()=>document.activeElement.blur());await page.waitForTimeout(60);
const h5=await H();await page.click('#dw');await page.keyboard.press('ArrowUp');await page.keyboard.press('ArrowUp');await page.waitForTimeout(60);
ok((await H())-h5===2,'two arrow-key presses in a number field add 2 history steps (added '+((await H())-h5)+')');
ok(errs.length===0,'no page errors '+errs.join(';'));
console.log(fails?'FAILED '+fails:'ALL PASS');await b.close();process.exit(fails?1:0);})();
