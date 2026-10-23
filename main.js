/* Spacegroup Atlas 0.2 — self-contained WebGL2 + WebXR, no CDN.
   CC0 geometry: Kenney Mini Forest and Pattern Packs. Source MIT.
   Group actions remain exact; the finite/faded viewing window is not a space-group invariant. */
(()=>{'use strict';
const $=id=>document.getElementById(id),cv=$('scene');
const gl=cv.getContext('webgl2',{alpha:false,depth:true,antialias:true,xrCompatible:true,powerPreference:'high-performance'});
if(!gl){$('error').hidden=false;$('error').textContent='WebGL2 is required; use Quest Browser or a modern desktop browser.';return;}
const PI=Math.PI, clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),mod=x=>((x%1)+1)%1;
const I3=[1,0,0,0,1,0,0,0,1],refX=[-1,0,0,0,1,0,0,0,1],refY=[1,0,0,0,-1,0,0,0,1],refZ=[1,0,0,0,1,0,0,0,-1],inv3=[-1,0,0,0,-1,0,0,0,-1],r4=[0,0,-1,0,1,0,1,0,0];
const rMult=(a,b)=>{const o=new Array(9).fill(0);for(let r=0;r<3;r++)for(let c=0;c<3;c++)for(let k=0;k<3;k++)o[3*r+c]+=a[3*r+k]*b[3*k+c];return o;};
const rV=(r,v)=>[r[0]*v[0]+r[1]*v[1]+r[2]*v[2],r[3]*v[0]+r[4]*v[1]+r[5]*v[2],r[6]*v[0]+r[7]*v[1]+r[8]*v[2]];
const op=(r,t=[0,0,0])=>({r,t}),compose=(a,b)=>({r:rMult(a.r,b.r),t:rV(a.r,b.t).map((x,i)=>mod(x+a.t[i]))});
const key=o=>o.r.join(',')+'|'+o.t.map(x=>Math.round(mod(x)*100000)%100000).join(',');
function closure(gens){const out=[op(I3)],seen=new Set([key(out[0])]);for(let i=0;i<out.length;i++)for(const g of gens){const q=compose(out[i],g),k=key(q);if(!seen.has(k)){out.push(q);seen.add(k);if(out.length>64)throw Error('Unbounded group closure');}}return out;}
const GROUPS=[
 {symbol:'P1',id:1,desc:'Translations',gens:[],order:1},
 {symbol:'P-1',id:2,desc:'Inversion',gens:[op(inv3)],order:2},
 {symbol:'Pm',id:6,desc:'Mirror plane normal to x (a-unique setting)',gens:[op(refX)],order:2},
 {symbol:'P4',id:75,desc:'Fourfold rotation',gens:[op(r4)],order:4},
 {symbol:'P4₁',id:76,desc:'Quarter screw about vertical axis',gens:[op(r4,[0,.25,0])],order:4,screw:true},
 {symbol:'P4mm',id:99,desc:'Fourfold rotation + mirrors',gens:[op(r4),op(refX)],order:8},
 {symbol:'Pmmm',id:47,desc:'Three orthogonal mirrors',gens:[op(refX),op(refY),op(refZ)],order:8},
 {symbol:'Pm-3m',id:221,desc:'Full cubic point symmetry',gens:[op(r4),op([1,0,0,0,0,-1,0,1,0]),op(refX)],order:48}
];
for(const g of GROUPS){g.ops=closure(g.gens);if(g.ops.length!==g.order)throw Error('Incorrect closure '+g.symbol+': '+g.ops.length);}
const mid=()=>new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
function mm(a,b){const out=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)out[c*4+r]+=a[k*4+r]*b[c*4+k];return out;}
function mt(x,y,z){const o=mid();o[12]=x;o[13]=y;o[14]=z;return o;}
function ms(x,y=x,z=x){const o=mid();o[0]=x;o[5]=y;o[10]=z;return o;}
function ry(t){const c=Math.cos(t),s=Math.sin(t),o=mid();o[0]=c;o[2]=-s;o[8]=s;o[10]=c;return o;}
function rx(t){const c=Math.cos(t),s=Math.sin(t),o=mid();o[5]=c;o[6]=s;o[9]=-s;o[10]=c;return o;}
function persp(a,aspect,near,far){const f=1/Math.tan(a/2),o=new Float32Array(16);o[0]=f/aspect;o[5]=f;o[10]=(far+near)/(near-far);o[11]=-1;o[14]=2*near*far/(near-far);return o;}
function invert(m){const a=[[],[],[],[]],b=[[],[],[],[]];for(let r=0;r<4;r++)for(let c=0;c<4;c++){a[r][c]=m[c*4+r];b[r][c]=r===c?1:0;}for(let k=0;k<4;k++){let p=k;for(let i=k+1;i<4;i++)if(Math.abs(a[i][k])>Math.abs(a[p][k]))p=i;if(Math.abs(a[p][k])<1e-10)throw Error('Singular matrix');[a[k],a[p]]=[a[p],a[k]];[b[k],b[p]]=[b[p],b[k]];const d=a[k][k];for(let j=0;j<4;j++){a[k][j]/=d;b[k][j]/=d;}for(let i=0;i<4;i++)if(i!==k){const v=a[i][k];for(let j=0;j<4;j++){a[i][j]-=v*a[k][j];b[i][j]-=v*b[k][j];}}}const o=new Float32Array(16);for(let r=0;r<4;r++)for(let c=0;c<4;c++)o[4*c+r]=b[r][c];return o;}
function affine(r,t){const m=mid();for(let i=0;i<3;i++)for(let j=0;j<3;j++)m[j*4+i]=r[3*i+j];m[12]=t[0];m[13]=t[1];m[14]=t[2];return m;}
const point=(m,p)=>[m[0]*p[0]+m[4]*p[1]+m[8]*p[2]+m[12],m[1]*p[0]+m[5]*p[1]+m[9]*p[2]+m[13],m[2]*p[0]+m[6]*p[1]+m[10]*p[2]+m[14]];
const sub=(a,b)=>a.map((x,i)=>x-b[i]),add=(a,b)=>a.map((x,i)=>x+b[i]),scale=(a,s)=>a.map(v=>v*s),len=a=>Math.hypot(...a),norm=a=>scale(a,1/(len(a)||1));
function rod(a,b,w){const delta=sub(b,a),l=len(delta),y=norm(delta),axis=Math.abs(y[1])>.92?[1,0,0]:[0,1,0],x=norm([axis[1]*y[2]-axis[2]*y[1],axis[2]*y[0]-axis[0]*y[2],axis[0]*y[1]-axis[1]*y[0]]),z=[x[1]*y[2]-x[2]*y[1],x[2]*y[0]-x[0]*y[2],x[0]*y[1]-x[1]*y[0]],p=scale(add(a,b),.5);
 return new Float32Array([x[0]*w,x[1]*w,x[2]*w,0,y[0]*l,y[1]*l,y[2]*l,0,z[0]*w,z[1]*w,z[2]*w,0,...p,1]);}
const state={group:2,motif:'archer',pattern:0,period:.6,radius:5,occupancy:.25,safety:true,fadeViewer:false,grid:true,ground:false,animate:false,slice:false,sectionY:.13,fadeStyle:'dither',origin:[0,1.38,-1.7],seedFrac:[.21,.34,.27],seed:mid(),safeRadius:0,seedRadius:1,selected:null,dirty:true,anchor:0,menu:false,menuRow:0,sliceAuto:false,followCenter:[0,0,0],instances:[],sceneCount:0,fadeEnd:5};
const player={x:0,y:0,z:0,yaw:0,pitch:0,speed:1.15};
let session=null,ref=null,lastFrame=0,trackHead=null,trackFrame=null,keys=new Set(),pressed=new Map(),menuPose=mid(),drag=false,dragLast=null,grab=null,nearSelected=-1,texLoaded=false,toastTime=0;
function notify(msg){$('toast').textContent=msg;$('toast').classList.add('show');toastTime=performance.now()+2600;}
function error(err){$('error').hidden=false;$('error').textContent=String(err?.stack||err);console.error(err);}
function compile(vs,fs){const p=gl.createProgram();for(const [type,src] of [[gl.VERTEX_SHADER,vs],[gl.FRAGMENT_SHADER,fs]]){const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));gl.attachShader(p,s);gl.deleteShader(s);}gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));return p;}
const VS=`#version 300 es
precision highp float;
layout(location=0) in vec3 aPos;layout(location=1) in vec3 aNormal;layout(location=2) in vec2 aUV;
layout(location=3) in vec4 iM0;layout(location=4) in vec4 iM1;layout(location=5) in vec4 iM2;layout(location=6) in vec4 iM3;layout(location=7) in vec3 iTint;layout(location=8) in vec3 iCell;
uniform mat4 uVP,uSeed;uniform vec3 uViewerCell;uniform float uFadeStart,uFadeEnd;uniform int uIsMotif;
out vec3 vNormal,vTint,vPos;out vec2 vUV;out float vFade;
void main(){mat4 gm=mat4(iM0,iM1,iM2,iM3);mat4 model=gm*uSeed;vec4 wp=model*vec4(aPos,1.);vPos=wp.xyz;vNormal=normalize(mat3(model)*aNormal);vTint=iTint;vUV=aUV;
float tax=abs(iCell.x+.5-uViewerCell.x)+abs(iCell.y+.5-uViewerCell.y)+abs(iCell.z+.5-uViewerCell.z);
float t=clamp((tax-uFadeStart)/max(.001,uFadeEnd-uFadeStart),0.,1.);vFade=1.-t*t*(3.-2.*t);gl_Position=uVP*wp;}`;
const FS=`#version 300 es
precision highp float;
in vec3 vNormal,vTint,vPos;in vec2 vUV;in float vFade;
uniform sampler2D uTex;uniform int uTextured,uFadeStyle;uniform vec3 uLight;
out vec4 outColor;
float bayer(vec2 p){ivec2 q=ivec2(mod(floor(p),4.));int i=q.x+4*q.y;float b[16]=float[16](0.,8.,2.,10.,12.,4.,14.,6.,3.,11.,1.,9.,15.,7.,13.,5.);return (b[i]+.5)/16.;}
void main(){vec4 tex=uTextured==1?texture(uTex,vUV):vec4(1.);if(tex.a<.22)discard;float fade=vFade;if(uFadeStyle==2)fade=fade>.5?1.:0.;if(fade<=.005)discard;
if(uFadeStyle==0 && fade < .995 && fade < bayer(gl_FragCoord.xy))discard;
float lighting=.70+.30*abs(dot(normalize(vNormal),uLight));vec3 color=tex.rgb*vTint*lighting;
outColor=vec4(color,tex.a*(uFadeStyle==1?fade:1.));}`;
const planeVS=`#version 300 es
precision highp float;layout(location=0) in vec2 aXY;uniform mat4 uVP;uniform vec3 uOrigin;uniform float uPeriod,uRadius,uY;
out vec3 vCell;void main(){vec3 c=vec3(aXY.x*uRadius,uY,aXY.y*uRadius);vCell=c;gl_Position=uVP*vec4(uOrigin+uPeriod*c,1.);}`;
const planeFS=`#version 300 es
precision highp float;in vec3 vCell;uniform sampler2D uPattern;uniform float uLine;out vec4 outColor;
float wrapped(float v){return fract(v+.5)-.5;}
void main(){float f=0.;vec3 p=vCell;
for(int k=0;k<4;k++){vec3 q=vec3(p.x,p.y-float(k)*.25,p.z);for(int j=0;j<k;j++)q.xz=vec2(q.z,-q.x);
vec3 d=vec3(wrapped(q.x-.235),wrapped(q.y-.105),wrapped(q.z-.14));
float ga=exp(-60.*(d.x*d.x*1.2+d.y*d.y*.85+d.z*d.z*1.6));
float pat=texture(uPattern,fract(vec2(q.x*2.7+q.y*.8,q.z*2.5-q.y*.4))).r;
f+=ga*(.55+.45*pat);}
float mask=smoothstep(.12,.7,f);if(mask<.04)discard;
float lines=abs(sin(f*25.));vec3 color=mix(vec3(.13,.38,.52),vec3(.98,.79,.37),clamp(f*.95,0.,1.));if(uLine>.5)color=mix(color,vec3(.88,.96,1.),smoothstep(.83,.98,lines)*.65);
outColor=vec4(color,mask*.95);}`;
const uiVS=`#version 300 es
precision highp float;layout(location=0) in vec2 aXY;uniform mat4 uVP,uModel;out vec2 vUV;void main(){vUV=aXY*.5+.5;gl_Position=uVP*uModel*vec4(aXY,0.,1.);}`;
const uiFS=`#version 300 es
precision mediump float;in vec2 vUV;uniform sampler2D uTex;out vec4 outColor;void main(){outColor=texture(uTex,vec2(vUV.x,1.-vUV.y));}`;
const meshShader=compile(VS,FS),sliceShader=compile(planeVS,planeFS),uiShader=compile(uiVS,uiFS),un=(p,n)=>gl.getUniformLocation(p,n);
const mU={vp:un(meshShader,'uVP'),seed:un(meshShader,'uSeed'),viewer:un(meshShader,'uViewerCell'),s0:un(meshShader,'uFadeStart'),s1:un(meshShader,'uFadeEnd'),txt:un(meshShader,'uTextured'),mode:un(meshShader,'uFadeStyle'),tex:un(meshShader,'uTex'),light:un(meshShader,'uLight')};
const sU={vp:un(sliceShader,'uVP'),origin:un(sliceShader,'uOrigin'),period:un(sliceShader,'uPeriod'),radius:un(sliceShader,'uRadius'),y:un(sliceShader,'uY'),pat:un(sliceShader,'uPattern'),line:un(sliceShader,'uLine')};
const uiU={vp:un(uiShader,'uVP'),model:un(uiShader,'uModel'),tex:un(uiShader,'uTex')};
function mesh(geom){const vao=gl.createVertexArray();gl.bindVertexArray(vao);const vert=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,vert);gl.bufferData(gl.ARRAY_BUFFER,geom.v,gl.STATIC_DRAW);for(let i=0;i<3;i++){gl.enableVertexAttribArray(i);gl.vertexAttribPointer(i,i===2?2:3,gl.FLOAT,false,32,i===0?0:i===1?12:24);}
const ib=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ib);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,geom.i,gl.STATIC_DRAW);
const instance=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,instance);gl.bufferData(gl.ARRAY_BUFFER,88,gl.DYNAMIC_DRAW);
for(let i=0;i<4;i++){gl.enableVertexAttribArray(3+i);gl.vertexAttribPointer(3+i,4,gl.FLOAT,false,88,i*16);gl.vertexAttribDivisor(3+i,1);}gl.enableVertexAttribArray(7);gl.vertexAttribPointer(7,3,gl.FLOAT,false,88,64);gl.vertexAttribDivisor(7,1);gl.enableVertexAttribArray(8);gl.vertexAttribPointer(8,3,gl.FLOAT,false,88,76);gl.vertexAttribDivisor(8,1);gl.bindVertexArray(null);
return {vao,instance,count:geom.i.length,instances:0,records:[]};}
function boxGeom(){const v=[],idx=[],face=(n,corners)=>{const at=v.length/8;for(const p of corners)v.push(...p,...n,0,0);idx.push(at,at+1,at+2,at,at+2,at+3);};
face([0,0,1],[[-.5,-.5,.5],[.5,-.5,.5],[.5,.5,.5],[-.5,.5,.5]]);
face([0,0,-1],[[.5,-.5,-.5],[-.5,-.5,-.5],[-.5,.5,-.5],[.5,.5,-.5]]);
face([1,0,0],[[.5,-.5,.5],[.5,-.5,-.5],[.5,.5,-.5],[.5,.5,.5]]);
face([-1,0,0],[[-.5,-.5,-.5],[-.5,-.5,.5],[-.5,.5,.5],[-.5,.5,-.5]]);
face([0,1,0],[[-.5,.5,.5],[.5,.5,.5],[.5,.5,-.5],[-.5,.5,-.5]]);
face([0,-1,0],[[-.5,-.5,-.5],[.5,-.5,-.5],[.5,-.5,.5],[-.5,-.5,.5]]);
return {v:new Float32Array(v),i:new Uint16Array(idx)};}
function panelGeom(){const v=[],idx=[0,1,2,0,2,3];for(const [x,y,u,w] of [[-.5,-.5,0,0],[.5,-.5,1,0],[.5,.5,1,1],[-.5,.5,0,1]])v.push(x,y,0,0,0,1,u,w);return {v:new Float32Array(v),i:new Uint16Array(idx)};}
let rods=mesh(boxGeom()),panels=mesh(panelGeom()),motifs={},texture={},loading=true;
function upload(obj,arr){obj.records=arr;obj.instances=arr.length;const v=new Float32Array(arr.length*22);let i=0;for(const d of arr){v.set(d.m,i);i+=16;v.set(d.tint,i);i+=3;v.set(d.cell,i);i+=3;}gl.bindBuffer(gl.ARRAY_BUFFER,obj.instance);gl.bufferData(gl.ARRAY_BUFFER,v,gl.DYNAMIC_DRAW);}
function makeTex(img){const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.REPEAT);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,img);gl.generateMipmap(gl.TEXTURE_2D);return t;}
function loadImg(file){return new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(makeTex(im));im.onerror=()=>reject(Error('Missing '+file));im.src=file;});}
async function loadAssets(){const paths=['target','tree','archer'];for(const name of paths){const data=await(await fetch(`assets/${name}.mesh`)).arrayBuffer(),dv=new DataView(data),n=dv.getUint32(0,true),count=dv.getUint32(4,true);const v=new Float32Array(data.slice(8,8+n*32)),i=new Uint16Array(data.slice(8+n*32,8+n*32+count*2));motifs[name]=mesh({v,i});motifs[name].radius=Math.max(...Array.from({length:n},(_,k)=>Math.hypot(v[k*8],v[k*8+1],v[k*8+2])));}
texture.forest=await loadImg('assets/forest_colormap.png');for(const type of ['opaque','line'])for(let i=0;i<5;i++)texture[type+i]=await loadImg(`assets/${type}_${(type==='opaque'?[7,12,16,23,27]:[2,7,12,18,25])[i].toString().padStart(2,'0')}.png`);
loading=false;changeGroup(state.group);syncUI();notify('Ready · symmetry specimen loaded');}
function rec(m,tint,cell,extra={}){return {m,tint,cell,...extra};}
function changeGroup(i){state.group=(i+GROUPS.length)%GROUPS.length;if(state.group!==4)state.slice=false;state.seedFrac=[.21,.34,.27];resetSeed();state.dirty=true;syncUI();notify(GROUPS[state.group].symbol+' · '+GROUPS[state.group].desc);}
function initialPose(){const p=state.period,o=state.origin;return mt(o[0]+p*state.seedFrac[0],o[1]+p*state.seedFrac[1],o[2]+p*state.seedFrac[2]);}
function safeSize(){const ops=GROUPS[state.group].ops,p=state.seedFrac;const centers=[];for(const o of ops)for(let x=-1;x<=1;x++)for(let y=-1;y<=1;y++)for(let z=-1;z<=1;z++){const v=rV(o.r,p);centers.push([v[0]+o.t[0]+x,v[1]+o.t[1]+y,v[2]+o.t[2]+z]);}let min=Infinity;for(const q of centers){const d=len(sub(q,p));if(d>1e-5)min=Math.min(min,d);}return min;}
function defaultSize(){const rad=state.motif==='archer'?motifs.archer?.radius:state.motif==='tree'?motifs.tree?.radius:state.motif==='target'?motifs.target?.radius:Math.SQRT1_2;
const desired=state.period*state.occupancy;return state.safety?Math.min(desired,Math.max(.01,state.period*(safeSize()*.48/(rad||.8)))):desired;}
function resetSeed(){grab=null;state.canonKey=null;state.animBase=null;state.animPhase=0;const p=initialPose();state.seed=mm(p,ms(defaultSize()));state.dirty=true;}
function resetAll(){player.x=0;player.y=0;player.z=0;player.yaw=0;player.pitch=0;state.origin=[0,1.38,-1.7];resetSeed();notify('Seed and view reset');}
function cellOp(c,o){const L=state.period,center=state.origin,v=[L*(c[0]+o.t[0]),L*(c[1]+o.t[1]),L*(c[2]+o.t[2])],ro=rV(o.r,center);return affine(o.r,add(v,sub(center,ro)));}
function regen(){if(loading)return;state.dirty=false;const motifRecords=[],rodRecords=[],group=GROUPS[state.group],L=state.period,R=state.radius;
let poolCenter=[0,0,0];if(state.fadeViewer&&trackHead){poolCenter=point(mid(),[trackHead[12],trackHead[13],trackHead[14]]).map((v,i)=>Math.floor((v-state.origin[i])/L));}state.followCenter=poolCenter;
// Include two invisible halo periods so cell-pool rebuilds do not pop at period boundaries.
const maxCopies=state.motif==='archer'?2000:state.motif==='tree'?3400:state.motif==='target'?4000:4500;
const maxCells=Math.max(1,Math.floor(maxCopies/group.ops.length));
const taxCount=r=>1+4*r*(r+1)*(2*r+1)/6+2*r;
let poolR=R+1;while(poolR>1&&taxCount(poolR)>maxCells)poolR--;
state.effectiveRadius=Math.min(R,Math.max(1,poolR-1));const cells=[];
for(let x=-poolR;x<=poolR;x++)for(let y=-poolR;y<=poolR;y++)for(let z=-poolR;z<=poolR;z++){const tax=Math.abs(x)+Math.abs(y)+Math.abs(z);if(tax>poolR)continue;const c=[x+poolCenter[0],y+poolCenter[1],z+poolCenter[2]];cells.push({c,tax});}
cells.sort((a,b)=>a.tax-b.tax);
const geomCount=state.slice?0:cells.length*group.ops.length;
for(const {c,tax} of cells){if(state.grid && tax<=state.effectiveRadius+.2){for(let a=0;a<3;a++){const p=add(state.origin,scale(c,L)),next=p.slice();next[a]+=L;rodRecords.push(rec(rod(p,next,L*.006),[.19,.43,.54],c));}}
if(state.slice)continue;
for(let k=0;k<group.ops.length;k++){const o=group.ops[k],g=cellOp(c,o);motifRecords.push(rec(g,[1,1,1],c,{opIndex:k,op:o}));}}
state.instances=motifRecords;upload(motifs.archer,motifRecords);upload(motifs.tree,motifRecords);upload(motifs.target,motifRecords);upload(panels,motifRecords);upload(rods,rodRecords);
state.sceneCount=geomCount;syncStats();}
function syncStats(){const g=GROUPS[state.group];$('status').textContent=`${g.symbol} · #${g.id} · ${g.ops.length} operations\n${state.sceneCount.toLocaleString()} motif copies · ${Math.round(state.period*100)} cm periods\n${state.effectiveRadius<state.radius?'Render-budget radius '+state.effectiveRadius+' (requested '+state.radius+')\n':''}${state.safety?'Conservative fundamental-domain safe placement':'Free placement'} · ${state.slice?'3D invariant field section':'Discrete orbit specimen'}`;}
function syncUI(){for(const [id,value] of Object.entries({group:state.group,motif:state.motif,pattern:state.pattern,period:state.period,radius:state.radius,occupancy:state.occupancy*100,sectionY:state.sectionY,fadeStyle:state.fadeStyle}))$(id).value=String(value);
for(const k of ['safety','fadeViewer','grid','ground','animate','slice'])$(k).checked=state[k];$('periodValue').textContent=state.period.toFixed(2)+' m';$('radiusValue').textContent=state.radius+' periods';$('occupancyValue').textContent=Math.round(state.occupancy*100)+'% of cell';$('sectionYValue').textContent=state.sectionY.toFixed(2)+' periods';$('textureRow').style.display=['opaque','line'].includes(state.motif)?'':'none';syncStats();}
function setVal(k,v){if(k==='group'){changeGroup(+v);return;}state[k]=v;
if(k==='motif'||k==='occupancy'||k==='safety'||k==='period'){if(!grab){resetSeed();}}
if(k==='slice'&&v&&state.group!==4){changeGroup(4);state.slice=true;}
if(k==='animate'){state.animBase=new Float32Array(state.seed);state.animPhase=0;}
if(k==='ground'&&v)player.y=0;
if(['period','radius','motif','grid','fadeViewer','slice'].includes(k))state.dirty=true;
syncUI();}
function texMotif(){return state.motif==='opaque'||state.motif==='line'?texture[state.motif+state.pattern]:texture.forest;}
const quad=gl.createVertexArray();gl.bindVertexArray(quad);const vq=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,vq);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,1,1,-1,-1,1,1,-1,1]),gl.STATIC_DRAW);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);gl.bindVertexArray(null);
const menuCanvas=document.createElement('canvas');menuCanvas.width=1200;menuCanvas.height=1400;const ctx=menuCanvas.getContext('2d');const menuTexture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,menuTexture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
const MENU=['Group','Motif','Cell size','Crop radius','Motif occupancy','Fade follows viewer','Fundamental safety','Lattice guides','Ground reference','Cross-section','Slice height','Generator animation','Fade style','Reference anchor','Close menu'];
const ANCHORS=[['volume center',[.5,.5,.5]],['face center',[.5,.5,0]],['cell corner',[0,0,0]],['edge midpoint',[.5,0,0]]];
function menuValue(k){switch(k){case 0:return GROUPS[state.group].symbol;case 1:return state.motif;case 2:return Math.round(state.period*100)+' cm';case 3:return state.radius+' periods';case 4:return Math.round(state.occupancy*100)+'%';case 5:return state.fadeViewer?'ON':'OFF';case 6:return state.safety?'ON':'OFF';case 7:return state.grid?'ON':'OFF';case 8:return state.ground?'ON':'OFF';case 9:return state.slice?'ON':'OFF';case 10:return state.sectionY.toFixed(2);case 11:return state.animate?'ON':'OFF';case 12:return state.fadeStyle;case 13:return ANCHORS[state.anchor][0];default:return '';}}
function drawMenu(){ctx.clearRect(0,0,1200,1400);ctx.fillStyle='rgba(7,21,33,.96)';ctx.fillRect(0,0,1200,1400);ctx.strokeStyle='#528d9f';ctx.lineWidth=6;ctx.strokeRect(8,8,1184,1384);ctx.fillStyle='#85ebdf';ctx.font='bold 63px system-ui';ctx.fillText('SPACEGROUP ATLAS',58,110);ctx.fillStyle='#d4e5f4';ctx.font='35px system-ui';ctx.fillText('Room-scale symmetry lab  ·  0.2',60,166);
MENU.forEach((title,i)=>{const y=240+i*72;ctx.fillStyle=i===state.menuRow?'rgba(55,154,165,.40)':'rgba(0,0,0,0)';ctx.fillRect(35,y-49,1130,63);ctx.fillStyle='#d7e8f8';ctx.font=i===state.menuRow?'bold 39px system-ui':'36px system-ui';ctx.fillText(title,63,y);ctx.fillStyle='#88ecdb';ctx.textAlign='right';ctx.fillText(menuValue(i),1123,y);ctx.textAlign='left';});ctx.font='30px system-ui';ctx.fillStyle='#aacbd4';ctx.fillText('Right stick: navigate / adjust    A: select    B: close',57,1364);
gl.bindTexture(gl.TEXTURE_2D,menuTexture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,menuCanvas);}
function anchorFocus(){const [label,p]=ANCHORS[state.anchor];let target=[0,1.5,-1.45];if(trackHead){const dir=norm([-trackHead[8],0,-trackHead[10]]);target=[trackHead[12]+dir[0]*1.15,trackHead[13]-.15,trackHead[14]+dir[2]*1.15];}const desired=add(state.origin,scale(p,state.period));const d=sub(target,desired);state.origin=add(state.origin,d);state.seed=mm(mt(...d),state.seed);state.dirty=true;notify('Focus · '+label);}
function menuChange(direction=1){let k=state.menuRow;switch(k){case 0:setVal('group',(state.group+direction+GROUPS.length)%GROUPS.length);break;case 1:{const a=['archer','target','tree','opaque','line'],i=a.indexOf(state.motif);setVal('motif',a[(i+direction+a.length)%a.length]);break;}case 2:setVal('period',clamp(Math.round((state.period+direction*.05)*20)/20,.1,1.25));break;case 3:setVal('radius',clamp(state.radius+direction,2,5));break;case 4:setVal('occupancy',clamp((Math.round(state.occupancy*100)+direction*2)/100,.05,.35));break;case 5:setVal('fadeViewer',!state.fadeViewer);break;case 6:setVal('safety',!state.safety);break;case 7:setVal('grid',!state.grid);break;case 8:setVal('ground',!state.ground);break;case 9:setVal('slice',!state.slice);break;case 10:setVal('sectionY',mod(state.sectionY+direction*.04));break;case 11:setVal('animate',!state.animate);break;case 12:{const a=['dither','alpha','cut'];setVal('fadeStyle',a[(a.indexOf(state.fadeStyle)+direction+3)%3]);break;}case 13:state.anchor=(state.anchor+direction+4)%4;anchorFocus();break;case 14:state.menu=false;break;}drawMenu();}
function drawQuad(shader,vao,vp,model,tex){gl.useProgram(shader);gl.uniformMatrix4fv(uiU.vp,false,vp);gl.uniformMatrix4fv(uiU.model,false,model);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,tex);gl.uniform1i(uiU.tex,0);gl.bindVertexArray(vao);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.disable(gl.CULL_FACE);gl.disable(gl.DEPTH_TEST);gl.depthMask(false);gl.drawArrays(gl.TRIANGLES,0,6);gl.depthMask(true);gl.enable(gl.DEPTH_TEST);gl.disable(gl.BLEND);}
function drawMeshes(vp,head){gl.useProgram(meshShader);gl.uniformMatrix4fv(mU.vp,false,vp);gl.uniform3f(mU.light,-.47,.81,.33);const c=state.fadeViewer?head.map((v,i)=>(v-state.origin[i])/state.period):[0,0,0];gl.uniform3fv(mU.viewer,c);gl.uniform1f(mU.s0,Math.max(.25,(state.effectiveRadius||state.radius)-2));gl.uniform1f(mU.s1,state.effectiveRadius||state.radius);gl.uniform1i(mU.mode,state.fadeStyle==='dither'?0:state.fadeStyle==='alpha'?1:2);gl.activeTexture(gl.TEXTURE0);gl.uniform1i(mU.tex,0);
const draw=(obj,s,tex,txt)=>{if(!obj?.instances)return;gl.uniformMatrix4fv(mU.seed,false,s);gl.uniform1i(mU.txt,txt?1:0);gl.bindTexture(gl.TEXTURE_2D,tex||texture.forest);gl.bindVertexArray(obj.vao);gl.drawElementsInstanced(gl.TRIANGLES,obj.count,gl.UNSIGNED_SHORT,0,obj.instances);};
gl.disable(gl.CULL_FACE);gl.enable(gl.DEPTH_TEST);
draw(rods,mid(),null,false);
if(!state.slice){if(state.fadeStyle==='alpha'){gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false);}const sel=['archer','target','tree'].includes(state.motif)?motifs[state.motif]:panels;
const seedMat=state.seed;draw(sel,seedMat,texMotif(),true);if(state.fadeStyle==='alpha'){gl.depthMask(true);gl.disable(gl.BLEND);}}
}
function drawSection(vp){if(!state.slice)return;gl.useProgram(sliceShader);gl.uniformMatrix4fv(sU.vp,false,vp);gl.uniform3fv(sU.origin,state.origin);gl.uniform1f(sU.period,state.period);gl.uniform1f(sU.radius,state.radius);gl.uniform1f(sU.y,state.sectionY);gl.uniform1f(sU.line,state.motif==='line'?1:0);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture[state.motif==='line'?'line'+state.pattern:'opaque'+state.pattern]);gl.uniform1i(sU.pat,0);gl.bindVertexArray(quad);gl.disable(gl.CULL_FACE);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false);gl.drawArrays(gl.TRIANGLES,0,6);gl.depthMask(true);gl.disable(gl.BLEND);}
function drawGround(vp){if(!state.ground)return; // Thin base grid on physical reference plane, explicitly outside symmetry specimen.
const base=state.origin;const arr=[];for(let k=-5;k<=5;k++){const step=state.period*k;arr.push(rec(rod([base[0]-3*state.period,0,base[2]+step],[base[0]+3*state.period,0,base[2]+step],.0018),[.15,.26,.29],[0,0,0]));arr.push(rec(rod([base[0]+step,0,base[2]-3*state.period],[base[0]+step,0,base[2]+3*state.period],.0018),[.15,.26,.29],[0,0,0]));}
// This grid is updated only when the physical scale changes, but intentionally uses the same rod pipeline.
if(!drawGround.obj)drawGround.obj=mesh(boxGeom());if(drawGround.period!==state.period||drawGround.orig!==base.join(',')){upload(drawGround.obj,arr);drawGround.period=state.period;drawGround.orig=base.join(',');}
gl.useProgram(meshShader);gl.uniformMatrix4fv(mU.vp,false,vp);gl.uniformMatrix4fv(mU.seed,false,mid());gl.uniform1i(mU.txt,0);gl.uniform1i(mU.mode,2);gl.uniform3f(mU.viewer,0,0,0);gl.uniform1f(mU.s0,9);gl.uniform1f(mU.s1,11);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture.forest);gl.bindVertexArray(drawGround.obj.vao);gl.drawElementsInstanced(gl.TRIANGLES,drawGround.obj.count,gl.UNSIGNED_SHORT,0,drawGround.obj.instances);}
function render(vp,eye){gl.clearColor(.018,.039,.066,1); // VR framebuffer is cleared once per frame; desktop here.
 drawMeshes(vp,eye);drawSection(vp);drawGround(vp);if(state.menu)drawQuad(uiShader,quad,vp,menuPose,menuTexture);gl.bindVertexArray(null);}
function rig(){return mm(mt(player.x,player.y,player.z),ry(player.yaw));}
function headFromTracking(tracking){return mm(rig(),tracking);}
function yawFromHead(m){return Math.atan2(-m[8],-m[10]);}
function frameBody(m){return mm(mt(m[12],m[13],m[14]),ry(yawFromHead(m)));}
function openMenu(head){state.menu=!state.menu;if(state.menu){const facing=yawFromHead(head),forward=[-Math.sin(facing),0,-Math.cos(facing)],center=[head[12]+forward[0]*1.55,head[13]-.06,head[14]+forward[2]*1.55];menuPose=mm(mt(...center),mm(ry(facing),ms(.66,.77,1)));drawMenu();}notify(state.menu?'Menu · right stick and A':'Menu closed');}
function moveByInput(dt,f,r,up=0){const m=trackHead||mm(mt(player.x,1.6,player.z),ry(player.yaw)),yaw=yawFromHead(m),s=player.speed*dt;if(f||r){const d=Math.hypot(f,r)||1;f/=Math.max(1,d);r/=Math.max(1,d);player.x+=(-Math.sin(yaw)*f+Math.cos(yaw)*r)*s;player.z+=(-Math.cos(yaw)*f-Math.sin(yaw)*r)*s;}if(!state.ground)player.y+=up*s;}
function turnAroundHead(delta,tracking){const before=headFromTracking(tracking),x=before[12],z=before[14];player.yaw+=delta;const after=headFromTracking(tracking);player.x+=x-after[12];player.z+=z-after[14];}
function pick(rayOrigin,rayDirection){if(state.slice)return null;const r=state.period*state.occupancy*.85;let best=null,tbest=Infinity;const user=state.fadeViewer?trackHead?.slice(12,15):null;
for(const o of state.instances){const center=point(mm(o.m,state.seed),[0,0,0]);const v=sub(center,rayOrigin),t=v.reduce((s,x,i)=>s+x*rayDirection[i],0);if(t<-.2||t>6)continue;const distance2=len(sub(v,scale(rayDirection,t)));if(distance2>Math.max(.045,r))continue;if(t<tbest){tbest=t;best=o;}}
return best;}
function toggleGrab(rayOrigin,rayDirection,head){if(grab){grab=null;state.animBase=new Float32Array(state.seed);state.animPhase=0;notify('Motif released · exact orbit retained');return;}let picked=pick(rayOrigin,rayDirection);
if(!picked){ // Accessibility fallback: pick nearest copy within 0.65 m of body.
  let dmin=.65;for(const o of state.instances){const c=point(mm(o.m,state.seed),[0,0,0]),d=len(sub(c,[head[12],head[13],head[14]]));if(d<dmin){dmin=d;picked=o;}}
}
if(!picked){notify('Aim at a motif, then press left trigger');return;}
grab={op:picked.m,body:frameBody(head),seed:new Float32Array(state.seed)};state.canonKey=canonicalKey();
notify('Carrying · cross a mirror or cell boundary');}
function canonicalKey(){const g=GROUPS[state.group],p=state.seed.slice(12,15).map((v,i)=>(v-state.origin[i])/state.period);let best=null,index=0;
for(let i=0;i<g.ops.length;i++){const op=g.ops[i],v=rV(op.r,p).map((x,k)=>mod(x+op.t[k]));const key=v.map(x=>Math.round(x*100000)/100000).join(':');if(best===null||key<best){best=key;index=i;}}
return String(index);}
function updateGrab(head){if(!grab)return;const D=mm(frameBody(head),invert(grab.body));state.seed=mm(invert(grab.op),mm(D,mm(grab.op,grab.seed)));
const k=canonicalKey();if(state.canonKey!==undefined&&state.canonKey!==null&&state.canonKey!==k && (performance.now()-(state.lastCanonToast||0))>450){notify('Canonical representative changed · orbit remains continuous');state.lastCanonToast=performance.now();}state.canonKey=k;}

function rotateGenerator(dt){
  if(!state.animate || grab)return;
  if(state.slice){state.sectionY=mod(state.sectionY+dt*.13);$('sectionY').value=state.sectionY;return;}
  const g=GROUPS[state.group];
  const step=(g.id===75||g.id===76||g.id===99||g.id===221)?Math.PI/2:(g.id===47?Math.PI:0);
  if(!step)return; // Reflections/inversion have no continuous proper-rotation path.
  if(!state.animBase){state.animBase=new Float32Array(state.seed);state.animPhase=0;}
  state.animPhase=mod((state.animPhase||0)+dt/6);
  const f=state.animPhase,o=state.origin,cy=[o[0],o[1],o[2]];
  const orbitRotate=mm(mt(...cy),mm(ry(step*f),mt(-cy[0],-cy[1],-cy[2])));
  const screwRise=g.screw?state.period*f*.25:0;
  state.seed=mm(mt(0,screwRise,0),mm(orbitRotate,state.animBase));
}
function scaleCanvas(){const w=Math.max(2,Math.round(innerWidth*Math.min(devicePixelRatio||1,1.5))),h=Math.max(2,Math.round(innerHeight*Math.min(devicePixelRatio||1,1.5)));if(cv.width!==w||cv.height!==h){cv.width=w;cv.height=h;}}
function tickCommon(time,dt,head){trackHead=head;updateGrab(head);if(state.fadeViewer){const next=head.slice(12,15).map((v,i)=>Math.floor((v-state.origin[i])/state.period));if(next.some((v,i)=>v!==state.followCenter[i]))state.dirty=true;}if(state.dirty)regen();if(toastTime&&time>toastTime){$('toast').classList.remove('show');toastTime=0;}}
function desktop(time){if(session)return;const dt=clamp((time-lastFrame)/1000||0,0,.05);lastFrame=time;let f=+keys.has('KeyW')-+keys.has('KeyS'),r=+keys.has('KeyD')-+keys.has('KeyA');if(keys.has('KeyQ'))player.yaw+=dt*1.2;if(keys.has('KeyE'))player.yaw-=dt*1.2;moveByInput(dt,f,r,+keys.has('KeyR')-+keys.has('KeyF'));const head=mm(mt(player.x,player.y+1.64,player.z),mm(ry(player.yaw),rx(player.pitch)));tickCommon(time,dt,head);rotateGenerator(dt);scaleCanvas();gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,cv.width,cv.height);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);const vp=mm(persp(1.07,cv.width/cv.height,.035,120),invert(head));render(vp,[head[12],head[13],head[14]]);requestAnimationFrame(desktop);}
function once(k,press){const old=pressed.get(k)||false;pressed.set(k,press);return press&&!old;}
function dead(v){return Math.abs(v)<.18?0:v;}
function controllerInput(frame,pose,dt,head){for(const src of session.inputSources){if(!src.gamepad)continue;const pad=src.gamepad,side=src.handedness,axes=pad.axes;let ax=dead(axes.length>=4?axes[axes.length-2]:axes[0]||0),ay=dead(axes.length>=4?axes[axes.length-1]:axes[1]||0);
if(side==='left')moveByInput(dt,-ay,ax,0);
if(side==='right'){
 if(state.menu){if(once('menu-v',Math.abs(ay)>.65))state.menuRow=(state.menuRow+(ay>0?1:-1)+MENU.length)%MENU.length;
 if(once('menu-h',Math.abs(ax)>.65))menuChange(ax>0?1:-1);
 if(Math.abs(ay)<.35)pressed.set('menu-v',false);if(Math.abs(ax)<.35)pressed.set('menu-h',false);
 }else{if(once('snap',Math.abs(ax)>.72))turnAroundHead(-Math.sign(ax)*PI/6,pose.transform.matrix);if(Math.abs(ax)<.36)pressed.set('snap',false);if(!state.ground)moveByInput(dt,0,0,-ay*.5);}}
if(side==='left'&&once('grab',!!pad.buttons[0]?.pressed)){
 let position=[head[12],head[13],head[14]],direction=norm([-head[8],-head[9],-head[10]]);const ray=frame.getPose(src.targetRaySpace,ref);
 if(ray){const m=headFromTracking(ray.transform.matrix);position=[m[12],m[13],m[14]];direction=norm([-m[8],-m[9],-m[10]]);}toggleGrab(position,direction,head);}
if(side==='right'&&once('B',!!pad.buttons[5]?.pressed))openMenu(head);
if(side==='right'&&once('A',!!pad.buttons[4]?.pressed)){if(state.menu)menuChange(1);else changeGroup(state.group+1);}
if(side==='left'&&once('X',!!pad.buttons[4]?.pressed)){if(state.menu)menuChange(-1);else{const a=['archer','target','tree','opaque','line'];setVal('motif',a[(a.indexOf(state.motif)+1)%a.length]);notify('Motif · '+state.motif);}}
if(side==='left'&&once('Y',!!pad.buttons[5]?.pressed)){if(state.menu)state.menu=false;else changeGroup(state.group-1);}
if(side==='right'&&once('rightTrigger',!!pad.buttons[0]?.pressed)&&state.menu)menuChange(1);
}}
function xrFrame(time,frame){if(!session)return;session.requestAnimationFrame(xrFrame);const pose=frame.getViewerPose(ref);if(!pose)return;const dt=clamp((time-lastFrame)/1000||0,0,.05);lastFrame=time;const tracked=pose.transform.matrix;let head=headFromTracking(tracked);trackHead=head;controllerInput(frame,pose,dt,head);head=headFromTracking(tracked);tickCommon(time,dt,head);rotateGenerator(dt);
gl.bindFramebuffer(gl.FRAMEBUFFER,session.renderState.baseLayer.framebuffer);gl.clearColor(.018,.039,.066,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
const R=rig();for(const view of pose.views){const port=session.renderState.baseLayer.getViewport(view);gl.viewport(port.x,port.y,port.width,port.height);const eye=mm(R,view.transform.matrix),vp=mm(view.projectionMatrix,invert(eye));render(vp,[eye[12],eye[13],eye[14]]);}}
async function enter(){if(session){await session.end();return;}if(!navigator.xr){notify('Quest Browser over HTTPS is required for WebXR');return;}try{await gl.makeXRCompatible();session=await navigator.xr.requestSession('immersive-vr',{optionalFeatures:['local-floor','bounded-floor']});session.addEventListener('end',()=>{session=null;ref=null;pressed.clear();state.menu=false;$('panel').style.display='';$('enter').textContent='ENTER IMMERSIVE VR';lastFrame=0;requestAnimationFrame(desktop);});session.updateRenderState({baseLayer:new XRWebGLLayer(session,gl,{alpha:false,depth:true,antialias:true,framebufferScaleFactor:0.9})});try{ref=await session.requestReferenceSpace('local-floor');}catch(_){ref=await session.requestReferenceSpace('local');}pressed.clear();$('panel').style.display='none';$('enter').textContent='EXIT VR';lastFrame=0;session.requestAnimationFrame(xrFrame);}catch(e){session=null;error(e);}}
function wire(){GROUPS.forEach((g,i)=>{const opt=document.createElement('option');opt.value=i;opt.textContent=`#${g.id} ${g.symbol} — ${g.desc}`;$('group').appendChild(opt);});
for(const [name,fn] of Object.entries({group:v=>setVal('group',+v),motif:v=>setVal('motif',v),pattern:v=>setVal('pattern',+v),period:v=>setVal('period',+v),radius:v=>setVal('radius',+v),occupancy:v=>setVal('occupancy',+v/100),sectionY:v=>setVal('sectionY',+v),fadeStyle:v=>setVal('fadeStyle',v)}))$(name).addEventListener('input',e=>fn(e.target.value));
for(const k of ['safety','fadeViewer','grid','ground','animate','slice'])$(k).addEventListener('change',e=>setVal(k,e.target.checked));$('reset').onclick=resetAll;$('enter').onclick=enter;
window.addEventListener('keydown',e=>{if(e.target instanceof HTMLInputElement||e.target instanceof HTMLSelectElement)return;keys.add(e.code);if(e.repeat)return;if(e.code==='BracketRight')changeGroup(state.group+1);if(e.code==='BracketLeft')changeGroup(state.group-1);if(e.code==='KeyM'){const a=['archer','target','tree','opaque','line'];setVal('motif',a[(a.indexOf(state.motif)+1)%a.length]);}if(e.code==='KeyH'){const head=mm(mt(player.x,player.y+1.64,player.z),ry(player.yaw));openMenu(head);}if(e.code==='KeyC'||e.code==='KeyV'){const h=mm(mt(player.x,player.y+1.64,player.z),ry(player.yaw));toggleGrab([h[12],h[13],h[14]],norm([-h[8],0,-h[10]]),h);}});
window.addEventListener('keyup',e=>keys.delete(e.code));cv.addEventListener('pointerdown',e=>{drag=true;dragLast=[e.clientX,e.clientY];cv.setPointerCapture(e.pointerId);});cv.addEventListener('pointermove',e=>{if(!drag)return;player.yaw-=(e.clientX-dragLast[0])*.005;player.pitch=clamp(player.pitch-(e.clientY-dragLast[1])*.005,-1.25,1.25);dragLast=[e.clientX,e.clientY];});cv.addEventListener('pointerup',()=>drag=false);}
try{wire();syncUI();loadAssets().catch(error);requestAnimationFrame(desktop);}catch(e){error(e);}
window.SPACEGROUP_DEBUG={GROUPS,state,closure,compose,key,cellOp,point,mm,resetAll,regen,changeGroup,canonicalKey,defaultSize};
})();
