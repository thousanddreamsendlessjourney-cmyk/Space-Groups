// Runs in Node without a GPU; validates closure, orthogonality, assets, and specimen generation.
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const ROOT=path.resolve(__dirname,'..');
const listeners={},elements={};
const ctx2d={drawImage(){},getImageData(){return {data:new Uint8ClampedArray(Array.from({length:8*8*4},(_,i)=>i%4===3?255:(i*17)%256))}},fillRect(){},clearRect(){},strokeRect(){},fillText(){},strokeText(){},beginPath(){},fill(){},stroke(){},measureText(){return {width:10}},set fillStyle(v){},set font(v){},set lineWidth(v){},set strokeStyle(v){},set textAlign(v){}};
const noop=()=>{};let lastVolumeData=null;
const fakeGL=new Proxy({}, {get(t,k){if(k==='getShaderParameter'||k==='getProgramParameter')return ()=>true;if(k==='getError')return ()=>10;if(k==='createProgram'||k==='createShader'||k==='createTexture'||k==='createVertexArray'||k==='createBuffer')return ()=>({});if(k==='getUniformLocation')return ()=>({});if(k==='texImage3D')return (...args)=>{lastVolumeData=args.at(-1);};if(k==='getShaderInfoLog'||k==='getProgramInfoLog')return ()=>'';if(typeof k==='string'&&k.toUpperCase()===k)return 10;return noop;}});
function element(id){return elements[id]||(elements[id]={id,style:{},textContent:'',value:'',checked:false,children:[],width:1400,height:900,addEventListener(type,handler){listeners[id+':'+type]=handler;},appendChild(child){this.children.push(child);},getContext(kind){return kind==='2d'?ctx2d:fakeGL;},set hidden(v){this._hidden=v;},classList:{add:noop,remove:noop}});}
const document={getElementById:element,createElement(tag){if(tag==='canvas')return {width:1200,height:1400,getContext:()=>ctx2d};return element('created-'+Math.random());}};
class FakeImage{constructor(){this.naturalWidth=8;this.naturalHeight=8;this.dataset={};}set src(v){this._src=v;Promise.resolve().then(()=>this.onload&&this.onload());}}
const sandbox={window:{addEventListener:noop},location:{protocol:'file:'},atob:s=>Buffer.from(s,'base64').toString('binary'),document,console,Math,Float32Array,Uint16Array,Int32Array,Array,Set,Map,performance:{now:()=>1000},innerWidth:1400,innerHeight:900,devicePixelRatio:1,navigator:{onLine:false},Blob,Response,DecompressionStream,requestAnimationFrame:noop,Image:FakeImage,HTMLInputElement:class{},HTMLSelectElement:class{},fetch:async u=>{const b=fs.readFileSync(path.join(ROOT,u));return {arrayBuffer:async()=>b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength)}}};
vm.createContext(sandbox);vm.runInContext(fs.readFileSync(path.join(ROOT,'assets-inline.js'),'utf8'),sandbox,{timeout:30000});vm.runInContext(fs.readFileSync(path.join(ROOT,'volume-inline.js'),'utf8'),sandbox,{timeout:30000});vm.runInContext(fs.readFileSync(path.join(ROOT,'fundamental-faces.js'),'utf8'),sandbox,{timeout:30000});vm.runInContext(fs.readFileSync(path.join(ROOT,'main.js'),'utf8'),sandbox,{timeout:30000});
setTimeout(()=>{
 try{
 const D=sandbox.window.SPACEGROUP_DEBUG;assert(D,'Debug missing');assert.strictEqual(elements.group.children.length,8,'Dropdown was not populated before graphics initialized');D.regen();
 const expected=[1,2,2,4,4,8,8,48];assert.deepStrictEqual(Array.from(D.GROUPS,g=>g.ops.length),expected);
 for(const g of D.GROUPS)for(const o of g.ops){const r=o.r;for(let i=0;i<3;i++)for(let j=0;j<3;j++){let dot=0;for(let k=0;k<3;k++)dot+=r[3*i+k]*r[3*j+k];assert(Math.abs(dot-(i===j?1:0))<1e-8,`Nonorthogonal ${g.symbol}`);}}
 const screw=D.GROUPS.find(g=>g.id===76);const last=screw.ops.find(o=>o.t[1]===.75);assert(last,'Screw powers not present');
 assert.strictEqual(D.state.sceneCount, D.state.instances.length);
 assert(D.state.sceneCount>0,'No motif copies generated');
 assert(D.state.sceneCount>100,'No substantial specimen generated');
 // Verify the safe spherical motif fits inside the nearest orbit-neighbor separation.
 for(let gi=0;gi<D.GROUPS.length;gi++){
  D.changeGroup(gi);D.regen();const g=D.GROUPS[gi];assert.strictEqual(D.state.instances.length,D.state.sceneCount);
  assert.strictEqual(D.state.effectiveRadius,D.state.radius,'Crop must not silently shrink');
  const safe=D.defaultSize(), min=(()=>{const p=D.state.seedFrac,centers=[];for(const op of g.ops)for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++)for(let c=-1;c<=1;c++){
   let q=op.r.map((_,k)=>k<3?op.r[3*k]*p[0]+op.r[3*k+1]*p[1]+op.r[3*k+2]*p[2]+op.t[k]+[a,b,c][k]:null).slice(0,3);let d=Math.hypot(q[0]-p[0],q[1]-p[1],q[2]-p[2]);if(d>1e-6)centers.push(d);}
  return Math.min(...centers);})();
  assert(safe/D.state.period<=min,`Safe radius not conservative for ${g.symbol}`);
 }
 // Compare full-cubic crop with old implementation's capped radius.
 D.changeGroup(7);D.regen();const fullCopies=D.state.instances.length;assert(fullCopies>5000,'Full cubic instances incorrectly cropped at Quest-safe radius');
 D.state.representation='sheet';D.state.dirty=true;D.regen();const fullSheets=D.sheetCount;assert(fullSheets>0&&fullSheets<D.state.radius**3*20,'Sheet dedup broken');assert(D.sheetTexture,'Original Kenney 2D texture not loaded');
 // Voxel centers are permuted exactly by our signed-coordinate crystal operations,
 // including quarter-cell screw shifts. Check field equivariance at representative sites.
 function checkVolumeSymmetry(g,N=128){const V=lastVolumeData;assert(V&&V.length===N**3*4);
  const at=(i,j,k)=>{i=(i+N)%N;j=(j+N)%N;k=(k+N)%N;return 4*(i+N*(j+N*k));};
  const m=x=>((x%1)+1)%1;
  for(const o of g.ops)for(const [i,j,k] of [[4,7,11],[15,9,30],[37,2,1],[23,18,44],[41,28,14]]){
   const p=[(i+.5)/N,(j+.5)/N,(k+.5)/N];
   const q=o.r.map((v,t)=>t<3?m(o.r[3*t]*p[0]+o.r[3*t+1]*p[1]+o.r[3*t+2]*p[2]+o.t[t]):0).slice(0,3).map(x=>Math.floor(x*N));
   const a=at(i,j,k),b=at(...q);
   for(let h=0;h<4;h++)assert(Math.abs(V[a+h]-V[b+h])<=2,'Field not equivariant under '+g.symbol);
  }
 }
 D.state.representation='slice';D.regen();checkVolumeSymmetry(D.GROUPS[7]);
 D.changeGroup(4);D.regen();checkVolumeSymmetry(D.GROUPS[4]);assert(D.volumeTexture,'3D volume texture not built');
 for(const mat of ['oak','walnut','strata']){D.setVal('volume',mat);D.regen();checkVolumeSymmetry(D.GROUPS[4]);assert(D.materialNames.includes(mat),'Missing source solid '+mat);}checkVolumeSymmetry(D.GROUPS[4]);assert.strictEqual(D.state.sceneCount,0,'Slice mode should not draw discrete motifs');
 // Exact eye-centered scaling fixes the user's fractional coordinate
 // while keeping the physical tracked headset position unchanged.
 const h=[0,1.64,0],oldPeriod=D.state.period,oldOrigin=D.state.origin.slice();
 const fractionalBefore=h.map((x,i)=>(x-oldOrigin[i])/oldPeriod);
 D.setVal('period',1.25);
 const fractionalAfter=h.map((x,i)=>(x-D.state.origin[i])/D.state.period);
 for(let i=0;i<3;i++)assert(Math.abs(fractionalAfter[i]-fractionalBefore[i])<1e-6,'Current viewer fractional cell coordinate moved');
 assert.strictEqual(D.state.scaleMotif,false,'Motif must keep physical size by default so period changes are visible');
 D.setVal('radius',1);assert.strictEqual(D.state.radius,1,'One-period crop should be selectable');
 assert(D.faceStats[7].facets>70,'Cubic group missing internal fundamental faces');
 // All three modes can be rendered through the same fake GPU API, with toggles independent.
 const VP=new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
 D.setVal('ground',true);D.render(VP,h);
 D.setVal('exterior',true);D.render(VP,h);
 D.setVal('representation','sheet');D.regen();D.render(VP,h);
 D.setVal('representation','motif');D.regen();D.render(VP,h);
 assert.strictEqual(D.state.exterior,true,'Exterior toggle should persist across representation switches');
 
 console.log('OK: v0.7 8 group closures; full crop',fullCopies,'copies; tiled sheets',fullSheets,'; exact group field tests for cubic and screw');
 }catch(err){console.error('FAILED',err);process.exitCode=1;}
},2200);
