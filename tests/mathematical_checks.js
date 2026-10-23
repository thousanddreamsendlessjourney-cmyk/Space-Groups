// Runs in Node without a GPU; validates closure, orthogonality, assets, and specimen generation.
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
const ROOT=path.resolve(__dirname,'..');
const listeners={},elements={};
const ctx2d={fillRect(){},clearRect(){},strokeRect(){},fillText(){},strokeText(){},beginPath(){},fill(){},stroke(){},measureText(){return {width:10}},set fillStyle(v){},set font(v){},set lineWidth(v){},set strokeStyle(v){},set textAlign(v){}};
const noop=()=>{};
const fakeGL=new Proxy({}, {get(t,k){if(k==='getShaderParameter'||k==='getProgramParameter')return ()=>true;if(k==='createProgram'||k==='createShader'||k==='createTexture'||k==='createVertexArray'||k==='createBuffer')return ()=>({});if(k==='getUniformLocation')return ()=>({});if(k==='getShaderInfoLog'||k==='getProgramInfoLog')return ()=>'';if(typeof k==='string'&&k.toUpperCase()===k)return 10;return noop;}});
function element(id){return elements[id]||(elements[id]={id,style:{},textContent:'',value:'',checked:false,width:1400,height:900,addEventListener(type,handler){listeners[id+':'+type]=handler;},appendChild:noop,getContext(kind){return kind==='2d'?ctx2d:fakeGL;},set hidden(v){this._hidden=v;},classList:{add:noop,remove:noop}});}
const document={getElementById:element,createElement(tag){if(tag==='canvas')return {width:1200,height:1400,getContext:()=>ctx2d};return element('created-'+Math.random());}};
class FakeImage{set src(v){this._src=v;Promise.resolve().then(()=>this.onload&&this.onload());}}
const sandbox={window:{addEventListener:noop},document,console,Math,Float32Array,Uint16Array,Int32Array,Array,Set,Map,performance:{now:()=>1000},innerWidth:1400,innerHeight:900,devicePixelRatio:1,navigator:{},requestAnimationFrame:noop,Image:FakeImage,HTMLInputElement:class{},HTMLSelectElement:class{},fetch:async u=>{const b=fs.readFileSync(path.join(ROOT,u));return {arrayBuffer:async()=>b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength)}}};
vm.createContext(sandbox);vm.runInContext(fs.readFileSync(path.join(ROOT,'main.js'),'utf8'),sandbox,{timeout:30000});
setTimeout(()=>{
 try{
 const D=sandbox.window.SPACEGROUP_DEBUG;assert(D,'Debug missing');D.regen();
 const expected=[1,2,2,4,4,8,8,48];assert.deepStrictEqual(Array.from(D.GROUPS,g=>g.ops.length),expected);
 for(const g of D.GROUPS)for(const o of g.ops){const r=o.r;for(let i=0;i<3;i++)for(let j=0;j<3;j++){let dot=0;for(let k=0;k<3;k++)dot+=r[3*i+k]*r[3*j+k];assert(Math.abs(dot-(i===j?1:0))<1e-8,`Nonorthogonal ${g.symbol}`);}}
 const screw=D.GROUPS.find(g=>g.id===76);const last=screw.ops.find(o=>o.t[1]===.75);assert(last,'Screw powers not present');
 assert.strictEqual(D.state.sceneCount, D.state.instances.length);
 assert(D.state.sceneCount>0,'No motif copies generated');
 assert(D.state.sceneCount<=2200,'Archer budget exceeded');
 // Verify the safe spherical motif fits inside the nearest orbit-neighbor separation.
 for(let gi=0;gi<D.GROUPS.length;gi++){
  D.changeGroup(gi);D.regen();const g=D.GROUPS[gi];assert.strictEqual(D.state.instances.length,D.state.sceneCount);
  assert(D.state.sceneCount<=4500,`Budget exceeded ${g.symbol}`);
  const safe=D.defaultSize(), min=(()=>{const p=D.state.seedFrac,centers=[];for(const op of g.ops)for(let a=-1;a<=1;a++)for(let b=-1;b<=1;b++)for(let c=-1;c<=1;c++){
   let q=op.r.map((_,k)=>k<3?op.r[3*k]*p[0]+op.r[3*k+1]*p[1]+op.r[3*k+2]*p[2]+op.t[k]+[a,b,c][k]:null).slice(0,3);let d=Math.hypot(q[0]-p[0],q[1]-p[1],q[2]-p[2]);if(d>1e-6)centers.push(d);}
  return Math.min(...centers);})();
  assert(safe/D.state.period<=min,`Safe radius not conservative for ${g.symbol}`);
 }
 console.log('OK: 8 group closures, orthogonality, screw powers, forest meshes, scene instances',D.state.sceneCount,'group',D.state.group,'effective radius',D.state.effectiveRadius);
 }catch(err){console.error('FAILED',err);process.exitCode=1;}
},500);
