const {JSDOM}=require('jsdom');const JSZip=require('jszip');const fs=require('fs');
const html=fs.readFileSync(__dirname+'/../dist/onionskyn.html','utf8');
const core=html.match(/<script id="fcCore">([\s\S]*?)<\/script>/)[1];
const dom=new JSDOM('<html></html>');global.window=dom.window;global.DOMParser=dom.window.DOMParser;global.JSZip=JSZip;
new Function('window','JSZip','DOMParser',core+';window.__C=window.FCCore;')(window,JSZip,dom.window.DOMParser);
const C=window.__C;let bad=0;const ok=(c,m)=>{console.log(c?'ok  ':'FAIL',m);if(!c)bad++;};
const NS='xmlns="http://ns.adobe.com/xfl/2008/"';
const mk=async(dom,files={})=>{const z=new JSZip();if(dom!==null)z.file('DOMDocument.xml',dom);for(const k in files)z.file(k,files[k]);return C.importFLA(await z.generateAsync({type:'arraybuffer'}));};
const rej=async(m,f)=>{try{await f();ok(false,m+' should reject');}catch(e){ok(true,m+' rejects: '+e.message);}};
(async()=>{
await rej('no DOMDocument',()=>mk(null));
await rej('malformed XML',()=>mk('<DOMDocument><oops'));
await rej('not xfl root',()=>mk('<foo/>'));
let r=await mk(`<DOMDocument ${NS} width="0" height="-5" frameRate="0"><timelines><DOMTimeline name="S"><layers/></DOMTimeline></timelines></DOMDocument>`);
ok(r.doc.w>=16&&r.doc.h>=16&&r.doc.fps>=1&&r.doc.layers.length>=1,'zero dims/fps/layers sanitised '+r.doc.w+'x'+r.doc.h+' '+r.doc.fps);
r=await mk(`<DOMDocument ${NS} width="400" height="300"><symbols><Include href="constructor.xml"/><Include href="__proto__.xml"/></symbols><timelines><DOMTimeline name="S"><layers><DOMLayer name="L"><frames><DOMFrame index="0"><elements><DOMSymbolInstance libraryItemName="constructor"/><DOMSymbolInstance libraryItemName="__proto__"/></elements></DOMFrame></frames></DOMLayer></layers></DOMTimeline></timelines></DOMDocument>`,{
 'LIBRARY/constructor.xml':`<DOMSymbolItem ${NS} name="constructor"><timeline><DOMTimeline name="constructor"><layers><DOMLayer name="a"><frames><DOMFrame index="0"><elements/></DOMFrame></frames></DOMLayer></layers></DOMTimeline></timeline></DOMSymbolItem>`,
 'LIBRARY/__proto__.xml':`<DOMSymbolItem ${NS} name="__proto__"><timeline><DOMTimeline name="x"><layers><DOMLayer name="a"><frames><DOMFrame index="0"><elements/></DOMFrame></frames></DOMLayer></layers></DOMTimeline></timeline></DOMSymbolItem>`});
const d=r.doc;ok(Object.getPrototypeOf(d.lib)===Object.prototype||Object.getPrototypeOf(d.lib)===null,'lib prototype intact');
ok(Object.keys(d.lib).length===2,'two symbols kept: '+Object.keys(d.lib).join(','));
const js=JSON.parse(JSON.stringify(d));ok(Object.keys(js.lib).length===2,'lib survives JSON roundtrip');
const objs=d.layers[0].kfs[0].objs;ok(objs.every(o=>o.kind!=='clip'||Object.prototype.hasOwnProperty.call(d.lib,o.sym)),'clips reference real lib entries '+objs.map(o=>o.sym));
r=await mk(`<DOMDocument ${NS} width="400" height="300"><timelines><DOMTimeline name="S"><layers><DOMLayer name="L"><frames><DOMFrame index="0" duration="9999999"><elements/></DOMFrame><DOMFrame index="NaN"><elements/></DOMFrame></frames></DOMLayer></layers></DOMTimeline></timelines></DOMDocument>`);
ok(r.doc.frames<=900,'huge duration clamped: '+r.doc.frames);
r=await mk(`<DOMDocument ${NS} width="400" height="300"><timelines><DOMTimeline name="S"><layers><DOMLayer name="L"><frames><DOMFrame index="0"><elements><DOMShape><fills><FillStyle index="1"><SolidColor color="#zzz" alpha="abc"/></FillStyle></fills><edges><Edge fillStyle1="1" edges="!0 0|NaN 5|abc"/><Edge edges="garbage"/></edges></DOMShape><DOMSymbolInstance libraryItemName="Missing"><matrix><Matrix a="NaN" tx="Infinity"/></matrix></DOMSymbolInstance><DOMStaticText><textRuns><DOMTextRun><characters>hi</characters></DOMTextRun></textRuns></DOMStaticText></elements></DOMFrame></frames></DOMLayer></layers></DOMTimeline></timelines></DOMDocument>`);
const bads=JSON.stringify(r.doc,(k,v)=>typeof v==='number'&&!isFinite(v)?'NONFINITE':v).includes('NONFINITE');ok(!bads,'no NaN/Infinity leaked into doc');
console.log('report',JSON.stringify({missing:r.report.missing}));
process.exit(bad?1:0);})();
