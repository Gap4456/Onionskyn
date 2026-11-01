/* ActionScript 1/2 layer: scenes, on(release), onClipEvent, _root/_x, goto by scene, timeline functions and variables, getURL */
const {chromium}=require('/opt/npm-tools/node_modules/playwright');const path=require('path');
let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++;};
(async()=>{const b=await chromium.launch();const page=await b.newPage({viewport:{width:900,height:600}});const errs=[];page.on('pageerror',e=>errs.push(e.message));
const logs=[];page.on('console',m=>logs.push(m.text()));
await page.addInitScript(()=>{window.__FC_TEST=true;});
await page.goto('file://'+path.resolve(__dirname,'../dist/onionskyn.html'));await page.waitForTimeout(400);
await page.evaluate(()=>{
  const C=window.FCCore;
  window.__mk=(opts)=>{
    const rect=(w,h,fill)=>C.mkPath([C.rectContour(w,h,0)],{fill,stroke:null});
    const btnSym={layers:[C.mkLayer('b')],frames:4};btnSym.layers[0].kfs=[0,1,2,3].map(f=>C.mkKf(f,[rect(60,40,['#3F5BFF','#6F85FF','#1F3BDF','#000000'][f])]));
    const mcSym={layers:[C.mkLayer('m')],frames:1};mcSym.layers[0].kfs=[C.mkKf(0,[rect(20,20,'#E5484D')])];
    const inst=(name,sym,x,y,extra)=>Object.assign({id:C.uid(),kind:'clip',sym,name,mc:sym==='mcSym',mode:'loop',first:0,pv:[0,0],op:1,t:Object.assign(C.newT(),{x,y})},extra||{});
    const L=C.mkLayer('Layer 1');
    const kf=(f,objs,extra)=>Object.assign(C.mkKf(f,objs),extra||{});
    const o=opts;
    const objs=[inst('btn','btnSym',100,50,{btn:true,mode:'single',script:o.btnScript}),inst('mc','mcSym',20,20,{script:o.mcScript})];
    L.kfs=[kf(0,objs,{scene:'Intro',script:o.f0}),
           kf(1,objs,{script:o.f1}),
           kf(2,objs,{scene:'Next',script:o.f2}),
           kf(3,objs,{script:o.f3})];
    const doc={w:200,h:100,fps:12,bg:'#FFFFFF',frames:4,layers:[L],lib:{btnSym,mcSym},sounds:{},images:{},lang:'as1'};
    window.FCCore.normalizeDoc(doc);
    const cv=document.createElement('canvas');cv.id='tcv';cv.style.cssText='position:fixed;left:0;top:0;width:200px;height:100px;z-index:99999;background:#fff';document.body.appendChild(cv);
    window.__urls=[];
    window.__rt=window.FCRuntime.create(doc,cv,{loop:true,onURL:(u,w)=>window.__urls.push(u+'|'+w),onError:(m)=>(window.__errs=window.__errs||[]).push(m)});
    window.__rt.start();
    return true;
  };
  window.__drop=()=>{window.__rt.stop();const c=document.getElementById('tcv');if(c)c.remove();window.__errs=[];};
});
const tick=(n)=>page.evaluate((n)=>{for(let i=0;i<n;i++)window.__rt.tick();},n||1);
const st=()=>page.evaluate(()=>({f:window.__rt.root.currentFrame,x:window.__rt.root.mc&&window.__rt.root.mc.x,y:window.__rt.root.mc&&window.__rt.root.mc.y,errs:window.__errs||[]}));
const click=async(x,y)=>{await page.mouse.move(x,y);await page.mouse.down();await page.mouse.up();await page.waitForTimeout(20);};

// 1. stop() on the first frame holds the timeline; on(release) jumps to a scene; numeric frame is scene-relative
await page.evaluate(()=>window.__mk({f0:'stop();',f2:'stop(); _root.mc._x = 77;',f3:'stop();',btnScript:'on (release) {\n  gotoAndPlay("Next", 1);\n}'}));
await tick(3);let s=await st();ok(s.f===0,'stop() on frame 1 holds the playhead (frame '+s.f+')');
await click(100,50);await tick(1);s=await st();
ok(s.f===2,'on (release) with gotoAndPlay("Next", 1) lands on the start of that scene (frame '+s.f+')');
ok(s.x===77,'the destination frame script ran: _root.mc._x = 77 (x '+s.x+')');
await page.evaluate(()=>window.__drop());

// 2. scene-relative numbers, nextScene/prevScene, function + var persist across frames, type annotations
await page.evaluate(()=>window.__mk({f0:'var n:Number = 40;\nfunction bump(a:Number):Void { _root.mc._y = a; }\nstop();',btnScript:'on (release) { bump(n + 2); nextScene(); }',f2:'stop(); gotoAndStop(2);',f3:'_root.mc._x = n;'}));
await tick(2);await click(100,50);await tick(2);s=await st();
ok(s.y===42,'a function and var declared on a frame are still there when a handler runs (y '+s.y+')');
ok(s.f===3,'nextScene() then gotoAndStop(2) inside scene 2 is scene-relative (frame '+s.f+')');
ok(s.x===40,'a var set on frame 1 is visible on a later frame (x '+s.x+')');
await page.evaluate(()=>window.__drop());

// 3. onClipEvent(enterFrame) and property handlers, _alpha scaling
await page.evaluate(()=>window.__mk({f0:'stop();',mcScript:'onClipEvent (enterFrame) { _x += 3; _alpha = 50; }'}));
await tick(4);s=await st();ok(s.x===32,'onClipEvent(enterFrame) runs every tick: _x 20 -> 32 (x '+s.x+')');
const al=await page.evaluate(()=>window.__rt.root.mc.alpha);ok(Math.abs(al-0.5)<1e-9,'_alpha is 0-100 in AS1 and 0-1 underneath (alpha '+al+')');
await page.evaluate(()=>window.__drop());

// 4. getURL goes through the host and unsafe addresses are blocked; undefined variables do not throw
await page.evaluate(()=>window.__mk({f0:'stop();',btnScript:'on (release) { loc = "v.php?u=" + userid; getURL(loc); getURL("javascript:alert(1)"); getURL("page.html", "_blank"); }'}));
await tick(1);await click(100,50);
const urls=await page.evaluate(()=>window.__urls);s=await st();
ok(urls.length===2&&urls[0]==='v.php?u=undefined|undefined'&&urls[1]==='page.html|_blank','getURL is routed to the host, javascript: is dropped ('+JSON.stringify(urls)+')');
ok(s.errs.some(e=>/unsafe/.test(e)),'the blocked address is reported');
await page.evaluate(()=>window.__drop());

// 5. tellTarget / with, mouse over/out handlers, _parent from a button
await page.evaluate(()=>window.__mk({f0:'stop();',btnScript:'on (rollOver) { tellTarget ("/mc") { _x = 55; } }\non (rollOut) { with (mc) { _y = 33; } }'}));
await tick(1);await page.mouse.move(100,50);await page.waitForTimeout(30);s=await st();ok(s.x===55,'rollOver + tellTarget moves the clip (x '+s.x+')');
await page.mouse.move(190,95);await page.waitForTimeout(30);s=await st();ok(s.y===33,'rollOut + with (mc) works (y '+s.y+')');
await page.evaluate(()=>window.__drop());

// 6. a syntax error is reported, not thrown; unsupported calls warn once
await page.evaluate(()=>window.__mk({f0:'stop(); if (',btnScript:'on (release) { attachMovie("a","b",1); attachMovie("a","c",2); }'}));
await tick(1);await click(100,50);s=await st();
ok(s.errs.some(e=>/syntax/i.test(e)),'a syntax error is reported');
ok(s.errs.filter(e=>/attachMovie/.test(e)).length===1,'an unsupported call warns once');
await page.evaluate(()=>window.__drop());

// 7. the converter on its own
const prep=await page.evaluate(()=>window.FCCore.as1Prepare('var a:Number = 1;\nfunction f(x:String):Void { var q = 2; }\non (press, release) { trace("hi"); }\nfor (var i = 0; i < 2; i++) {}'));
ok(!/:\s*Number|:\s*String|:\s*Void/.test(prep),'type annotations are removed');
ok(/__on\(\["press","release"\]/.test(prep),'on(press, release) becomes one registration for both events');
ok(/^f = function/m.test(prep)&&/^\s*a = 1;/m.test(prep),'top-level function and var become timeline variables');
ok(/for \(var i/.test(prep),'var inside a for loop is left alone');
ok(errs.length===0,'no page errors '+errs.join(';'));
console.log(fails?'FAILED '+fails:'ALL PASS');await b.close();process.exit(fails?1:0);})();
