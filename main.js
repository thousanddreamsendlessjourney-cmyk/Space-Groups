/* Spacegroup Atlas 0.9 — self-contained WebGL2 + WebXR, no CDN.
   CC0 geometry: Kenney Mini Forest and Pattern Packs. Source MIT.
   Group actions remain exact; the finite/faded viewing window is not a space-group invariant. */
(()=>{'use strict';
const $=id=>document.getElementById(id),cv=$('scene');
// Make initialization failures visible even if they occur before the render loop.
window.addEventListener('error',event=>{const panel=$('error');if(panel){panel.hidden=false;panel.textContent='Initialization error: '+(event.error?.stack||event.message||'Unknown error');}});
window.addEventListener('unhandledrejection',event=>{const panel=$('error');if(panel){panel.hidden=false;panel.textContent='Initialization error: '+(event.reason?.stack||String(event.reason));}});
const gl=cv.getContext('webgl2',{alpha:false,depth:true,antialias:true,xrCompatible:true,powerPreference:'high-performance'});
if(!gl){$('error').hidden=false;$('error').textContent='WebGL2 is required; use Quest Browser or a modern desktop browser.';return;}
const PI=Math.PI, clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),mod=x=>((x%1)+1)%1;
const I3=[1,0,0,0,1,0,0,0,1],refX=[-1,0,0,0,1,0,0,0,1],refY=[1,0,0,0,-1,0,0,0,1],refZ=[1,0,0,0,1,0,0,0,-1],inv3=[-1,0,0,0,-1,0,0,0,-1],r4=[0,0,-1,0,1,0,1,0,0];
const rMult=(a,b)=>{const o=new Array(9).fill(0);for(let r=0;r<3;r++)for(let c=0;c<3;c++)for(let k=0;k<3;k++)o[3*r+c]+=a[3*r+k]*b[3*k+c];return o;};
const rV=(r,v)=>[r[0]*v[0]+r[1]*v[1]+r[2]*v[2],r[3]*v[0]+r[4]*v[1]+r[5]*v[2],r[6]*v[0]+r[7]*v[1]+r[8]*v[2]];
const op=(r,t=[0,0,0])=>({r,t}),compose=(a,b)=>({r:rMult(a.r,b.r),t:rV(a.r,b.t).map((x,i)=>mod(x+a.t[i]))});
const key=o=>o.r.join(',')+'|'+o.t.map(x=>Math.round(mod(x)*100000)%100000).join(',');
function closure(gens){const out=[op(I3)],seen=new Set([key(out[0])]);for(let i=0;i<out.length;i++)for(const g of gens){const q=compose(out[i],g),k=key(q);if(!seen.has(k)){out.push(q);seen.add(k);if(out.length>64)throw Error('Unbounded group closure');}}return out;}
const GROUPS=(window.SPACEGROUP_ALL||[]).map(d=>({
  ...d, symbol:d.symbol.replace(/:H$/,''), desc:d.system+' · '+d.order+' operations',
  ops:d.ops.map(a=>op(a.slice(0,9),a.slice(9).map(x=>x/24))),
  gens:d.gens.map(a=>op(a.slice(0,9),a.slice(9).map(x=>x/24))),
}));
if(GROUPS.length!==230||GROUPS.some((g,i)=>g.id!==i+1||g.ops.length!==g.order))
 throw Error('The complete 230-group operation database is missing or inconsistent');
const CRYSTAL_SYSTEMS=['triclinic','monoclinic','orthorhombic','tetragonal','trigonal','hexagonal','cubic'];
const GROUP_FEATURED=[1,2,6,14,47,62,75,76,99,123,143,146,168,194,221,225,229,230];
// Conventional Bravais cell bases (fractional -> Cartesian), with physical
// unit-cell dimensions as isotropic scale. Noncubic rotations use B R B^-1.
function linInv(a){const [a0,b,c,d,e,f,g,h,i]=a;
 const A=e*i-f*h,B=c*h-b*i,C=b*f-c*e,D=f*g-d*i,E=a0*i-c*g,F=c*d-a0*f,G=d*h-e*g,H=b*g-a0*h,I=a0*e-b*d;
 const det=a0*A+b*D+c*G;
 if(Math.abs(det)<1e-9)throw Error('Singular lattice basis');
 return [A,B,C,D,E,F,G,H,I].map(v=>v/det);}
for(const g of GROUPS)g.basisInv=linInv(g.basis);
function latticeVector(v){return scale(rV(GROUPS[state.group].basis,v),state.period);}
function worldFrac(v){return rV(GROUPS[state.group].basisInv,scale(sub(v,state.origin),1/state.period));}
function cellPosition(frac){return add(state.origin,latticeVector(frac));}
function cellBasis(){const b=GROUPS[state.group].basis,m=mid();for(let row=0;row<3;row++)for(let col=0;col<3;col++)m[col*4+row]=b[row*3+col]*state.period;return m;}

// Generator closures are independently verified in tools/build_group_database.py.
for(const g of GROUPS)if(g.ops.length!==g.order)throw Error('Bad order for '+g.symbol);
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
const state={group:5,motif:'archer',volume:'oak',representation:'motif',family:'opaque',pattern:0,coverage:.22,sheetOpacity:.22,densityCoverage:.30,period:.6,radius:4,fadeStart:3,occupancy:.27,scaleMotif:false,quality:'safe',exterior:false,safety:true,fadeViewer:false,grid:true,ground:false,animate:false,sliceFollow:true,sectionY:1.2,fadeStyle:'contrast',origin:[0,1.38,-1.7],seedFrac:[.21,.34,.27],seed:mid(),safeRadius:0,seedRadius:1,selected:null,dirty:true,anchor:0,menu:false,menuRow:0,sliceAuto:false,followCenter:[0,0,0],fadeAnchor:null,instances:[],sceneCount:0,fadeEnd:6};
const player={x:0,y:0,z:0,yaw:0,pitch:0,speed:1.15};
let session=null,ref=null,lastFrame=0,trackHead=null,trackFrame=null,keys=new Set(),pressed=new Map(),menuPose=mid(),drag=false,dragLast=null,grab=null,nearSelected=-1,texLoaded=false,toastTime=0;
wire(); // Populate controls before compiling WebGL shaders.
function notify(msg){$('toast').textContent=msg;$('toast').classList.add('show');toastTime=performance.now()+2600;}
function error(err){$('error').hidden=false;$('error').textContent='Spacegroup Atlas could not start:\n'+String(err?.stack||err);console.error(err);}
function compile(vs,fs){const p=gl.createProgram();for(const [type,src] of [[gl.VERTEX_SHADER,vs],[gl.FRAGMENT_SHADER,fs]]){const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));gl.attachShader(p,s);gl.deleteShader(s);}gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));return p;}
const VS=`#version 300 es
precision highp float;
layout(location=0) in vec3 aPos;layout(location=1) in vec3 aNormal;layout(location=2) in vec2 aUV;
layout(location=3) in vec4 iM0;layout(location=4) in vec4 iM1;layout(location=5) in vec4 iM2;layout(location=6) in vec4 iM3;layout(location=7) in vec3 iTint;layout(location=8) in vec3 iCell;
uniform mat4 uVP,uSeed;uniform mat3 uInvBasis;uniform vec3 uViewerCell,uOrigin;uniform float uPeriod,uFadeStart,uFadeEnd;uniform int uIsMotif,uFadeStyle;
out vec3 vNormal,vTint,vPos;out vec2 vUV;out float vFade;
void main(){mat4 gm=mat4(iM0,iM1,iM2,iM3);mat4 model=gm*uSeed;vec4 wp=model*vec4(aPos,1.);vPos=wp.xyz;vNormal=normalize(transpose(inverse(mat3(model)))*aNormal);vTint=iTint;vUV=aUV;
vec3 originOfCopy=(model*vec4(0.,0.,0.,1.)).xyz;
vec3 fractional=uInvBasis*(originOfCopy-uOrigin)/uPeriod;
float tax=abs(fractional.x-uViewerCell.x)+abs(fractional.y-uViewerCell.y)+abs(fractional.z-uViewerCell.z);
float t=clamp((tax-uFadeStart)/max(.001,uFadeEnd-uFadeStart),0.,1.);
vFade=uIsMotif==0?1.:(uFadeStyle==4?(tax<=uFadeEnd?1.:0.):1.-t*t*(3.-2.*t));
gl_Position=uVP*wp;
if(vFade<=.0001)gl_Position=vec4(0.,0.,2.,1.);
}`;
const FS=`#version 300 es
precision highp float;
precision highp sampler3D;
precision highp int;
in vec3 vNormal,vTint,vPos;in vec2 vUV;in float vFade;
uniform sampler2D uTex;uniform sampler3D uVolume;
uniform int uTextured,uFadeStyle,uIsFill,uPanelSym,uGroup;uniform mat3 uInvBasis;uniform float uCoverageThreshold,uPeriod;uniform vec3 uLight,uOrigin;
out vec4 outColor;
float bayer(vec2 p){ivec2 q=ivec2(mod(floor(p),4.));int i=q.x+4*q.y;float b[16]=float[16](0.,8.,2.,10.,12.,4.,14.,6.,3.,11.,1.,9.,15.,7.,13.,5.);return (b[i]+.5)/16.;}
vec2 invariantUV(vec2 uv){
  if(uPanelSym==1)return vec2(min(uv.x,1.-uv.x)*2.,uv.y); // a mirror
  if(uPanelSym==2){vec2 inv=1.-uv;
    return uv.x<inv.x || (abs(uv.x-inv.x)<.0001 && uv.y<inv.y)?uv:inv;}
  if(uPanelSym==3)return 2.*min(uv,1.-uv); // orthogonal mirrors
  if(uPanelSym==4){vec2 q=2.*abs(uv-.5);return vec2(max(q.x,q.y),min(q.x,q.y));} // D4
  return uv;
}
bool smaller(vec3 a,vec3 b){
 if(a.x<b.x-.000001)return true;if(a.x>b.x+.000001)return false;
 if(a.y<b.y-.000001)return true;if(a.y>b.y+.000001)return false;
 return a.z<b.z-.000001;
}
vec3 canonicalPosition(vec3 p){
 vec3 c=p;
 if(uGroup==1){vec3 q=fract(-p);if(smaller(q,c))c=q;}
 else if(uGroup==2)c.x=min(p.x,1.-p.x);
 else if(uGroup==3||uGroup==4){
  vec3 q=p;
  for(int i=0;i<4;i++){
   if(smaller(q,c))c=q;
   q=vec3(fract(-q.z),fract(q.y+(uGroup==4?.25:0.)),q.x);
  }
 }else if(uGroup==5){
  vec2 a=min(p.xz,1.-p.xz);c=vec3(min(a.x,a.y),p.y,max(a.x,a.y));
 }else if(uGroup==6)c=min(p,1.-p);
 else if(uGroup==7){
  c=min(p,1.-p);
  if(c.x>c.y){float t=c.x;c.x=c.y;c.y=t;}
  if(c.y>c.z){float t=c.y;c.y=c.z;c.z=t;}
  if(c.x>c.y){float t=c.x;c.x=c.y;c.y=t;}
 }
 return c;
}
void main(){
  // Sample the Kenney material in a continuous periodic fractional frame.
  // The Voronoi FACE geometry is fully orbit-derived, while decorative color
  // symmetry for all 230 operations is intentionally not claimed here.
  vec3 c=fract(uInvBasis*(vPos-uOrigin)/uPeriod);
  float tileCount=max(1.,floor(uPeriod/.46+.5));
  vec2 sheetUV=vec2(c.x+c.z,c.y+c.z)*tileCount;
  // The finite-group panel stabilizer has been incorporated in the projection.
  vec4 tex=uIsFill==1?texture(uVolume,uInvBasis*(vPos-uOrigin)/uPeriod):uTextured==1?texture(uTex,uIsFill==2?sheetUV:vUV):vec4(1.);
// Sheet material uses the original Kenney PNG alpha and color.
if(tex.a<.02)discard;
float fade=vFade;
if(uFadeStyle==2)fade=fade>.5?1.:0.;
if(fade<=.004)discard;
if(uFadeStyle==0 && fade<.999 && fade<bayer(gl_FragCoord.xy))discard;
float lighting=.74+.26*abs(dot(normalize(vNormal),normalize(uLight)));
vec3 color=tex.rgb*vTint*lighting;
if(uFadeStyle==3)color=mix(vec3(.018,.039,.066),color,fade);
// Kenney textures were uploaded premultiplied. ONE / ONE_MINUS_SRC_ALPHA
 // prevents dark RGB under transparent edge pixels from producing black seams.
 if(uIsFill==2){float a=uCoverageThreshold*fade;outColor=vec4(color*a,tex.a*a);}
 else outColor=vec4(color,uIsFill==1?tex.a*uCoverageThreshold*fade:(uFadeStyle==1?fade:1.));
}`;
const planeVS=`#version 300 es
precision highp float;
layout(location=0) in vec2 aXY;
uniform mat4 uVP,uPlane;
out vec3 vPos;
void main(){vec4 wp=uPlane*vec4(aXY,0.,1.);vPos=wp.xyz;gl_Position=uVP*wp;}`;
const planeFS=`#version 300 es
precision highp float;precision highp sampler3D;
in vec3 vPos;uniform sampler3D uVolume;uniform vec3 uOrigin;uniform mat3 uInvBasis;uniform float uPeriod;
out vec4 outColor;
void main(){
 // This is a single fully opaque section through a SOLID RGB volume. Alpha is
 // auxiliary morphology and must not erase the material's quieter interior.
 vec3 f=texture(uVolume,uInvBasis*(vPos-uOrigin)/uPeriod).rgb;
 float contrast=1.15;
 outColor=vec4(clamp((f-.5)*contrast+.5,0.,1.),1.);
}`;
const floorVS=`#version 300 es
precision highp float;layout(location=0) in vec2 aXY;
uniform mat4 uVP,uModel;out vec3 vPos;
void main(){vec4 p=uModel*vec4(aXY,0.,1.);vPos=p.xyz;gl_Position=uVP*p;}`;
const floorFS=`#version 300 es
precision highp float;in vec3 vPos;uniform vec3 uCenter;uniform float uNear,uFar;out vec4 outColor;
void main(){float d=length(vPos.xz-uCenter.xz);if(d>uFar)discard;
 vec3 floorColor=vec3(.19,.215,.225);
 float fine=min(abs(fract(vPos.x/.5+.5)-.5),abs(fract(vPos.z/.5+.5)-.5));
 float ink=1.-smoothstep(.013,.032,fine);
 // Make the horizontal plane legible; the grid stays fixed in the world.
 floorColor=mix(floorColor,vec3(.12,.135,.15),ink*.36);
 float edge=smoothstep(uNear,uFar,d);
 outColor=vec4(mix(floorColor,vec3(.018,.039,.066),edge*.77),1.);
}`;
const exteriorVS=`#version 300 es
precision highp float;layout(location=0) in vec3 aPos;
uniform mat4 uVP,uBox;out vec3 vWorld;
void main(){vec4 w=uBox*vec4(aPos,1.);vWorld=w.xyz;gl_Position=uVP*w;}`;
const exteriorFS=`#version 300 es
precision highp float;precision highp sampler3D;
in vec3 vWorld;uniform sampler3D uVolume;uniform vec3 uOrigin,uEye;uniform mat3 uInvBasis;uniform float uPeriod;uniform mat4 uVP;
out vec4 outColor;
void main(){
 // The *whole solid block exterior* is displayed, not a sparse isodensity cloud.
 vec3 f=uInvBasis*(vWorld-uOrigin)/uPeriod;
 vec3 color=texture(uVolume,f).rgb;
 // Surface-facing light variation, without reading the voxel density as an isosurface.
 vec3 n=normalize(cross(dFdx(vWorld),dFdy(vWorld)));
 float light=.73+.27*abs(dot(n,normalize(vec3(.4,.85,.36))));
 outColor=vec4(clamp((color-.5)*1.15+.5,0.,1.)*light,1.);
}`;
const uiVS=`#version 300 es
precision highp float;layout(location=0) in vec2 aXY;uniform mat4 uVP,uModel;out vec2 vUV;void main(){vUV=aXY*.5+.5;gl_Position=uVP*uModel*vec4(aXY,0.,1.);}`;
const uiFS=`#version 300 es
precision mediump float;in vec2 vUV;uniform sampler2D uTex;out vec4 outColor;void main(){outColor=texture(uTex,vec2(vUV.x,1.-vUV.y));}`;
const meshShader=compile(VS,FS),sliceShader=compile(planeVS,planeFS),floorShader=compile(floorVS,floorFS),exteriorShader=compile(exteriorVS,exteriorFS),uiShader=compile(uiVS,uiFS),un=(p,n)=>gl.getUniformLocation(p,n);
const mU={vp:un(meshShader,'uVP'),seed:un(meshShader,'uSeed'),viewer:un(meshShader,'uViewerCell'),origin:un(meshShader,'uOrigin'),period:un(meshShader,'uPeriod'),s0:un(meshShader,'uFadeStart'),s1:un(meshShader,'uFadeEnd'),txt:un(meshShader,'uTextured'),mode:un(meshShader,'uFadeStyle'),fill:un(meshShader,'uIsFill'),motif:un(meshShader,'uIsMotif'),cover:un(meshShader,'uCoverageThreshold'),tex:un(meshShader,'uTex'),volume:un(meshShader,'uVolume'),light:un(meshShader,'uLight'),panelSym:un(meshShader,'uPanelSym'),group:un(meshShader,'uGroup'),basisInv:un(meshShader,'uInvBasis'),basisInvV:un(meshShader,'uInvBasis')};
const sU={vp:un(sliceShader,'uVP'),plane:un(sliceShader,'uPlane'),origin:un(sliceShader,'uOrigin'),period:un(sliceShader,'uPeriod'),cover:un(sliceShader,'uCoverageThreshold'),volume:un(sliceShader,'uVolume'),basisInv:un(sliceShader,'uInvBasis')};
const uiU={vp:un(uiShader,'uVP'),model:un(uiShader,'uModel'),tex:un(uiShader,'uTex')};
const fU={vp:un(floorShader,'uVP'),model:un(floorShader,'uModel'),center:un(floorShader,'uCenter'),near:un(floorShader,'uNear'),far:un(floorShader,'uFar')};
const eU={vp:un(exteriorShader,'uVP'),box:un(exteriorShader,'uBox'),volume:un(exteriorShader,'uVolume'),origin:un(exteriorShader,'uOrigin'),eye:un(exteriorShader,'uEye'),period:un(exteriorShader,'uPeriod'),basisInv:un(exteriorShader,'uInvBasis'),threshold:un(exteriorShader,'uThreshold')};
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
let rods=mesh(boxGeom()),panels=mesh(panelGeom()),sheetMeshes=[],exteriorMesh=mesh(boxGeom()),motifs={},demoMeshes={},texture={},loading=true;let volumeTexture=null,volumeDirty=true,volumeThreshold=.55,floorSource='headset floor reference',fixedSectionPose=null;let sheetRecordsSorted=[];const solidVolumes={};
let lastSheetGroups=[];
function ensureSheetMesh(i){
 if(sheetMeshes[i])return sheetMeshes[i];
 const data=window.SPACEGROUP_FUNDAMENTAL_FACES[i];
 if(!data||!data.i.length)throw Error('Missing face geometry #'+(i+1));
 const indices=data.v.length/8>65535?new Uint32Array(data.i):new Uint16Array(data.i);
 const o=mesh({v:new Float32Array(data.v),i:indices});o.indexType=indices instanceof Uint32Array?gl.UNSIGNED_INT:gl.UNSIGNED_SHORT;
 sheetMeshes[i]=o;lastSheetGroups.push(i);
 if(lastSheetGroups.length>3){const old=lastSheetGroups.shift(),previous=sheetMeshes[old];
  if(previous){gl.deleteVertexArray(previous.vao);gl.deleteBuffer(previous.instance);sheetMeshes[old]=null;}}
 return o;
}
function upload(obj,arr){obj.records=arr;obj.instances=arr.length;const v=new Float32Array(arr.length*22);let i=0;for(const d of arr){v.set(d.m,i);i+=16;v.set(d.tint,i);i+=3;v.set(d.cell,i);i+=3;}gl.bindBuffer(gl.ARRAY_BUFFER,obj.instance);gl.bufferData(gl.ARRAY_BUFFER,v,gl.DYNAMIC_DRAW);}
function makeTex(img){const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.REPEAT);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,img);gl.generateMipmap(gl.TEXTURE_2D);return t;}
// Embedded binary assets make file:/// desktop testing work without a local server.
// Hosted copies use the same data as an emergency fallback if an asset request fails.
const EMBEDDED=window.SPACEGROUP_EMBEDDED_ASSETS||{};
function embeddedBytes(file){const encoded=EMBEDDED[file];if(!encoded)return null;
 const bin=atob(encoded),out=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)out[i]=bin.charCodeAt(i);return out.buffer;}
async function loadBinary(file){if(location.protocol==='file:'){const data=embeddedBytes(file);if(data)return data;throw Error('Missing embedded asset: '+file);}
 try{const response=await fetch(file);if(!response.ok)throw Error('HTTP '+response.status+' loading '+file);return await response.arrayBuffer();}
 catch(e){const fallback=embeddedBytes(file);if(fallback)return fallback;throw e;}}
function loadImg(file){return new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(makeTex(im));im.onerror=()=>{if(!im.dataset.embeddedRetry && EMBEDDED[file]){im.dataset.embeddedRetry='1';im.src='data:image/png;base64,'+EMBEDDED[file];return;}reject(Error('Missing '+file));};im.src=(location.protocol==='file:'||!navigator.onLine)&&EMBEDDED[file]?'data:image/png;base64,'+EMBEDDED[file]:file;});}
async function loadAssets(){const paths=['target','tree','archer'];for(const name of paths){const data=await loadBinary(`assets/${name}.mesh`),dv=new DataView(data),n=dv.getUint32(0,true),count=dv.getUint32(4,true);const v=new Float32Array(data.slice(8,8+n*32)),i=new Uint16Array(data.slice(8+n*32,8+n*32+count*2));motifs[name]=mesh({v,i});demoMeshes[name]=mesh({v,i});upload(demoMeshes[name],[rec(mid(),[1.1,.92,.55],[0,0,0])]);motifs[name].radius=Math.max(...Array.from({length:n},(_,k)=>Math.hypot(v[k*8],v[k*8+1],v[k*8+2])));}
texture.forest=await loadImg('assets/forest_colormap.png');for(const type of ['opaque','line'])for(let i=0;i<5;i++)texture[type+i]=await loadImg(`assets/${type}_${(type==='opaque'?[7,12,16,23,27]:[2,7,12,18,25])[i].toString().padStart(2,'0')}.png`);
// Keep all solid fields available for immediate menu switching, including file:// usage.
for(const kind of ['oak','walnut','strata']){
 const deflated=await loadBinary('assets/volume_'+kind+'.zlib');
   if(typeof DecompressionStream==='undefined')throw Error('This browser requires DecompressionStream for the compressed solid materials.');
   const stream=new Blob([deflated]).stream().pipeThrough(new DecompressionStream('deflate'));
   const raw=new Uint8Array(await new Response(stream).arrayBuffer());
 if(raw.length!==SOURCE_VOL_N**3*4)throw Error('Invalid '+kind+' solid volume: '+raw.length+' bytes');
 solidVolumes[kind]=raw;
}
const faceData=window.SPACEGROUP_FUNDAMENTAL_FACES;
if(!Array.isArray(faceData)||faceData.length!==GROUPS.length)throw Error('Missing complete fundamental-face geometry');
sheetMeshes=new Array(GROUPS.length).fill(null);
loading=false;changeGroup(state.group);syncUI();notify('Ready · solid textures available');}
// Independent material paths: periodic Kenney PNG walls and symmetry-remapped
// solid voxels. Geometry, not arbitrary decorative 2D linework, is equivariant.
const VOL_N=144,SOURCE_VOL_N=128,volumeHist=new Uint32Array(256);
function upload3D(existing,data,N=VOL_N){const tex=existing||gl.createTexture();
 // WebGL forbids UNPACK_FLIP_Y_WEBGL and UNPACK_PREMULTIPLY_ALPHA_WEBGL
 // with texImage3D(ArrayBufferView). Prior 2D image uploads set FLIP_Y=true,
 // making every 3D texture invalid and all fill modes black/invisible.
 gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);
 gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);
 gl.pixelStorei(gl.UNPACK_ALIGNMENT,1);
 gl.bindTexture(gl.TEXTURE_3D,tex);
 gl.texParameteri(gl.TEXTURE_3D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
 gl.texParameteri(gl.TEXTURE_3D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
 for(const axis of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T,gl.TEXTURE_WRAP_R])gl.texParameteri(gl.TEXTURE_3D,axis,gl.REPEAT);
 gl.texImage3D(gl.TEXTURE_3D,0,gl.RGBA8,N,N,N,0,gl.RGBA,gl.UNSIGNED_BYTE,data);
 const error=gl.getError();if(error!==gl.NO_ERROR)throw Error('3D texture upload failed: WebGL error 0x'+error.toString(16));
 return tex;}
function canonicalPoint(x,y,z,ops){let bx=2,by=2,bz=2;
 for(const o of ops){const r=o.r,t=o.t;
 const X=mod(r[0]*x+r[1]*y+r[2]*z+t[0]),Y=mod(r[3]*x+r[4]*y+r[5]*z+t[1]),Z=mod(r[6]*x+r[7]*y+r[8]*z+t[2]);
 if(X<bx-1e-7||(Math.abs(X-bx)<1e-7&&(Y<by-1e-7||(Math.abs(Y-by)<1e-7&&Z<bz)))){bx=X;by=Y;bz=Z;}}
 return [bx,by,bz];}
// Sample a whole 3D colored solid generated offline from editable, reproducible
// mathematical grain/lamination models. The Blender shader graphs were not baked;
// these are adaptations and are labeled as such in the UI and README.
// The grid count is divisible by 24 so fractional screw/glide translations
// can map its discrete samples into one another. Grid interpolation is approximate.
const canonicalCache=new Map();
function canonicalMap(g){
 if(canonicalCache.has(g))return canonicalCache.get(g);
 const N=VOL_N,count=N*N*N,parent=new Uint32Array(count),gens=GROUPS[g].gens;
 for(let i=0;i<count;i++)parent[i]=i;
 const root=a=>{while(parent[a]!==a){parent[a]=parent[parent[a]];a=parent[a];}return a;};
 for(const o of gens){
  const r=o.r,t=o.t,ox=Math.round(t[0]*N),oy=Math.round(t[1]*N),oz=Math.round(t[2]*N);
  for(let z=0;z<N;z++)for(let y=0;y<N;y++)for(let x=0;x<N;x++){
   const wrap=k=>((k%N)+N)%N;
   const X=wrap(r[0]*x+r[1]*y+r[2]*z+ox);
   const Y=wrap(r[3]*x+r[4]*y+r[5]*z+oy);
   const Z=wrap(r[6]*x+r[7]*y+r[8]*z+oz);
   const a=x+N*(y+N*z),b=X+N*(Y+N*Z);
   let ra=root(a),rb=root(b);
   if(ra!==rb){if(ra<rb)parent[rb]=ra;else parent[ra]=rb;}
  }
 }
 for(let i=0;i<count;i++)parent[i]=root(i);
 canonicalCache.clear();canonicalCache.set(g,parent);return parent;
}
function rebuildVolume(){if(loading||!volumeDirty||state.representation!=='slice')return;
 const N=VOL_N,S=SOURCE_VOL_N,source=solidVolumes[state.volume];
 if(!source)throw Error('Missing solid texture '+state.volume);
 const vox=new Uint8Array(N*N*N*4),map=canonicalMap(state.group);
 volumeHist.fill(0);
 for(let z=0;z<N;z++)for(let y=0;y<N;y++)for(let x=0;x<N;x++){
  const i=x+N*(y+N*z),m=map[i],vz=Math.floor(m/(N*N)),vy=Math.floor(m/N)%N,vx=m%N;
  const b=4*(Math.min(S-1,Math.floor(vx*S/N))+S*(Math.min(S-1,Math.floor(vy*S/N))+S*Math.min(S-1,Math.floor(vz*S/N))));
  const a=i*4;vox[a]=source[b];vox[a+1]=source[b+1];vox[a+2]=source[b+2];vox[a+3]=source[b+3];
  volumeHist[vox[a+3]]++;
 }
 volumeTexture=upload3D(volumeTexture,vox);volumeDirty=false;
}
function updateCoverageThreshold(){volumeThreshold=state.coverage;}
function rec(m,tint,cell,extra={}){return {m,tint,cell,...extra};}
function safeCrop(){const n=GROUPS[state.group].order;
 return n>=96?1:n>48?2:n>24?4:n>8?5:6;}
function changeGroup(i){
 state.group=(i+GROUPS.length)%GROUPS.length;volumeDirty=true;
 if(state.quality==='safe'||state.quality==='balanced'){
  const r=safeCrop()+(state.quality==='balanced'?1:0);
  state.radius=r;state.fadeStart=Math.max(0,r-2);
 }
 state.seedFrac=state.safety?[.211,.347,.273]:[0,0,0];resetSeed();
 state.dirty=true;if($('group'))rebuildGroupList();syncUI();notify('#'+GROUPS[state.group].id+' '+GROUPS[state.group].short+' · '+GROUPS[state.group].system);
}
function initialPose(){return mt(...cellPosition(state.seedFrac));}
function safeSize(){const ops=GROUPS[state.group].ops,p=state.seedFrac;const centers=[];for(const o of ops)for(let x=-1;x<=1;x++)for(let y=-1;y<=1;y++)for(let z=-1;z<=1;z++){const v=rV(o.r,p);centers.push([v[0]+o.t[0]+x,v[1]+o.t[1]+y,v[2]+o.t[2]+z]);}let min=Infinity;for(const q of centers){const d=len(latticeVector(sub(q,p)));if(d>1e-5)min=Math.min(min,d);}return min;}
function defaultSize(){const rad=state.motif==='archer'?motifs.archer?.radius:state.motif==='tree'?motifs.tree?.radius:state.motif==='target'?motifs.target?.radius:Math.SQRT1_2;
const desired=state.period*state.occupancy;return state.safety?Math.min(desired,Math.max(.01,safeSize()*.48/(rad||.8))):desired;}
function resetSeed(){state.seedFrac=state.safety?[.211,.347,.273]:[0,0,0];grab=null;state.canonKey=null;state.animBase=null;state.animPhase=0;const p=initialPose();state.seed=mm(p,ms(defaultSize()));state.dirty=true;}
function resetAll(){player.x=0;player.y=0;player.z=0;player.yaw=0;player.pitch=0;state.origin=[0,1.38,-1.7];state.fadeAnchor=null;resetSeed();notify('Seed and view reset');}
function cellOp(c,o){
 const g=GROUPS[state.group],B=g.basis,inv=g.basisInv;
 const R=rMult(rMult(B,o.r),inv);
 const t=add(state.origin,latticeVector(add(c,o.t)));
 return affine(R,sub(t,rV(R,state.origin)));
}
function regen(){if(loading)return;state.dirty=false;
const motifRecords=[],rodRecords=[],sheetRecords=[],group=GROUPS[state.group],L=state.period,R=state.radius;
if(state.representation==='slice'&&volumeDirty)rebuildVolume();
const camera=trackHead?Array.from(trackHead.slice(12,15)):[player.x,player.y+1.64,player.z];
if(!state.fadeAnchor)state.fadeAnchor=cellPosition([.5,.5,.5]);
const fadePoint=state.fadeViewer?camera:state.fadeAnchor;
const poolCenter=worldFrac(fadePoint).map(Math.floor);state.followCenter=poolCenter;
// Include a one-cell halo so a cutoff at radius=1 is still fully represented.
const poolR=R+1,cells=[];
for(let x=-poolR;x<=poolR;x++)for(let y=-poolR;y<=poolR;y++)for(let z=-poolR;z<=poolR;z++){
 const tax=Math.abs(x)+Math.abs(y)+Math.abs(z);if(tax>poolR)continue;
 const c=[x+poolCenter[0],y+poolCenter[1],z+poolCenter[2]];cells.push({c,tax});}
for(const {c,tax} of cells){
 if(state.grid&&tax<=R){for(let a=0;a<3;a++){
  const p=cellPosition(c),next=cellPosition(c.map((x,k)=>x+(k===a?1:0)));
  rodRecords.push(rec(rod(p,next,L*.005),[.31,.33,.36],c));}}
 if(state.representation==='motif')for(let k=0;k<group.ops.length;k++){
  const operator=cellOp(c,group.ops[k]);
  const center=point(mm(operator,state.seed),[0,0,0]);
  const fractional=worldFrac(center),viewer=worldFrac(fadePoint);
  const distance=Math.abs(fractional[0]-viewer[0])+Math.abs(fractional[1]-viewer[1])+Math.abs(fractional[2]-viewer[2]);
  // Do not submit instances that the fade shader would discard entirely.
  if(distance<=R+.0001)motifRecords.push(rec(operator,[1,1,1],c,{opIndex:k,op:group.ops[k]}));
 }
 if(state.representation==='sheet')
  sheetRecords.push(rec(mm(mt(...cellPosition(c)),cellBasis()),[1,1,1],c));
}
state.instances=motifRecords;state.effectiveRadius=R;
state.sceneCount=state.representation==='motif'?motifRecords.length:state.representation==='sheet'?sheetRecords.length:0;
for(const m of Object.values(motifs))upload(m,motifRecords);
if(state.representation==='sheet'){sheetRecordsSorted=sheetRecords;lastSheetEye=null;upload(ensureSheetMesh(state.group),sheetRecords);}
upload(rods,rodRecords);syncStats();}
function syncStats(){const g=GROUPS[state.group];$('status').textContent=`${g.system.toUpperCase()} · ${g.symbol} · #${g.id} · ${g.ops.length} operations\n${state.sceneCount.toLocaleString()} loaded instances · ${Math.round(state.period*100)} cm cell scale\n${state.safety?'Safe initial placement':'Free initial placement'} · ${state.representation==='slice'?'Solid '+state.volume+' / section':state.representation==='sheet'?'Full fundamental-face orbit':'3D motif orbit'}${state.sceneCount>20000?'\nHigh instance count: reduce radius if Quest performance drops':''}`;}
function syncUI(){for(const [id,value] of Object.entries({group:state.group,motif:state.motif,volume:state.volume,representation:state.representation,family:state.family,pattern:state.pattern,coverage:state.coverage*100,period:state.period,radius:state.radius,fadeStart:state.fadeStart,occupancy:state.occupancy*100,sectionY:state.sectionY,fadeStyle:state.fadeStyle,quality:state.quality}))$(id).value=String(value);
for(const k of ['safety','fadeViewer','grid','ground','animate','sliceFollow','exterior'])$(k).checked=state[k];
$('periodValue').textContent=state.period.toFixed(2)+' m';$('radiusValue').textContent=state.radius+' periods';$('fadeStartValue').textContent=state.fadeStart+' periods';$('occupancyValue').textContent=Math.round(state.occupancy*100)+'% of cell';$('sectionYValue').textContent=state.sectionY.toFixed(2)+' m';$('coverageValue').textContent=Math.round(state.coverage*100)+'%';$('coverageLabel').textContent='Wall opacity';
$('volumeRow').hidden=state.representation!=='slice';$('motifRow').hidden=state.representation!=='motif';$('occupancyRow').hidden=state.representation!=='motif';$('familyRow').hidden=state.representation!=='sheet';$('textureRow').hidden=state.representation!=='sheet';$('coverageRow').hidden=state.representation!=='sheet';$('sliceDepthRow').hidden=state.representation!=='slice';$('exteriorRow').hidden=state.representation!=='slice';$('animateRow').hidden=state.representation!=='motif';$('sliceFollowRow').hidden=state.representation!=='slice';
syncStats();}
function setVal(k,v){if(k==='group'){changeGroup(+v);return;}
 if(k==='period'){
  v=clamp(Number(v),.10,2.5);
  if(!Number.isFinite(v))return;
  const ratio=v/state.period;
  if(Math.abs(ratio-1)<1e-9)return;
  // v0.3 semantics: enlarge/shrink the ENTIRE crystal specimen about its
  // original, stationary lattice origin. Do not move the headset, player,
  // tracked-floor plane, or origin to compensate for the visual change.
  // Motifs grow with their cells; the motif-size control changes their
  // *relative* size, not the scaling of the cell itself.
  for(let j=0;j<3;j++)for(let i=0;i<3;i++)state.seed[j*4+i]*=ratio;
  for(let i=0;i<3;i++)state.seed[12+i]=state.origin[i]+ratio*(state.seed[12+i]-state.origin[i]);
  // The non-viewer-following crop is part of the specimen. Keep it in
  // the same fractional position when the specimen is rescaled.
  if(state.fadeAnchor)state.fadeAnchor=add(state.origin,scale(sub(state.fadeAnchor,state.origin),ratio));
  state.period=v;
  state.dirty=true;syncUI();return;
 }
 if(k==='representation'&&v!=='motif')state.animate=false;
 if(k==='representation'){state.coverage=v==='slice'?state.densityCoverage:state.sheetOpacity;fixedSectionPose=null;}
 if(k==='quality'){state.quality=v;
  const safe=safeCrop();
  const rad=v==='safe'?safe:v==='balanced'?Math.min(7,safe+1):8;
  state.radius=rad;state.fadeStart=Math.max(0,rad-2);state.dirty=true;syncUI();return;}
state[k]=v;
if(k==='motif'||k==='occupancy'||k==='safety')if(!grab)resetSeed();
if(k==='representation'&&state.representation==='slice')fixedSectionPose=null;
if(k==='sliceFollow'&&!v)fixedSectionPose=null;
if(k==='sliceFollow'&&v)fixedSectionPose=null;
 if(k==='fadeViewer'&&!v){const head=trackHead||mt(player.x,player.y+1.64,player.z);state.fadeAnchor=[head[12],head[13],head[14]];}
if(k==='volume'){volumeDirty=true;notify('Solid texture · '+v);}
// The baked volume is expressed in fractional coordinates and independent of cell period.
if(k==='radius'){state.quality='custom';if(state.fadeStart>state.radius)state.fadeStart=state.radius;}
if(k==='fadeStart')state.fadeStart=Math.min(v,state.radius);
if(k==='coverage'){if(state.representation==='sheet')state.sheetOpacity=v;else if(state.representation==='slice')state.densityCoverage=v;updateCoverageThreshold();}
if(['period','radius','motif','grid','fadeViewer','representation','family','pattern','volume','coverage'].includes(k))state.dirty=true;
syncUI();}
const quad=gl.createVertexArray();gl.bindVertexArray(quad);const vq=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,vq);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,1,1,-1,-1,1,1,-1,1]),gl.STATIC_DRAW);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);gl.bindVertexArray(null);
const menuCanvas=document.createElement('canvas');menuCanvas.width=1200;menuCanvas.height=1520;const ctx=menuCanvas.getContext('2d');const menuTexture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,menuTexture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
const MENU=['Crystal system','Point group','Group','Representation','3D motif / solid material','Pattern pack','Pattern variant','Performance preset','Cell size','Crop radius','Full opacity through','Motif size','Wall opacity','Fade mode','Viewer-centered fade','Lattice guides','Floor comfort surface','Safe starting size','Slice follows headset','Slice distance','Show solid exterior','Generator demonstration','Reference anchor','Close menu'];
const ANCHORS=[['volume center',[.5,.5,.5]],['face center',[.5,.5,0]],['cell corner',[0,0,0]],['edge midpoint',[.5,0,0]]];
function menuValue(k){if(k===0)return GROUPS[state.group].system;if(k===1)return GROUPS[state.group].pointGroup;k-=2;if(k>=16)k++;switch(k){case 0:return '#'+GROUPS[state.group].id+' '+GROUPS[state.group].short;case 1:return state.representation;case 2:return state.representation==='slice'?state.volume:state.motif;
case 3:return state.family;case 4:return String(state.pattern+1);case 5:return state.quality;case 6:return Math.round(state.period*100)+' cm';
case 7:return state.radius+' cells';case 8:return state.fadeStart+' cells';case 9:return Math.round(state.occupancy*100)+'% of cell';
case 10:return state.representation==='sheet'?Math.round(state.coverage*100)+'%':'n/a';case 11:return state.fadeStyle;case 12:return state.fadeViewer?'ON':'OFF';
case 13:return state.grid?'ON':'OFF';case 14:return state.ground?'ON':'OFF';case 15:return state.safety?'ON':'OFF';
case 16:return 'Relative';case 17:return state.sliceFollow?'ON':'OFF';case 18:return state.sectionY.toFixed(2)+' m';
case 19:return state.exterior?'ON':'OFF';case 20:return state.animate&&state.representation==='motif'?'ON':'OFF';
case 21:return ANCHORS[state.anchor][0];default:return '';}}
function drawMenu(){ctx.clearRect(0,0,1200,1520);ctx.fillStyle='rgba(7,21,33,.96)';ctx.fillRect(0,0,1200,1520);ctx.strokeStyle='#528d9f';ctx.lineWidth=6;ctx.strokeRect(8,8,1184,1504);ctx.fillStyle='#85ebdf';ctx.font='bold 63px system-ui';ctx.fillText('SPACEGROUP ATLAS',58,110);ctx.fillStyle='#d4e5f4';ctx.font='35px system-ui';ctx.fillText('Room-scale symmetry lab  ·  0.9',60,166);
MENU.forEach((title,i)=>{const y=216+i*49;ctx.fillStyle=i===state.menuRow?'rgba(55,154,165,.40)':'rgba(0,0,0,0)';ctx.fillRect(35,y-39,1130,48);ctx.fillStyle='#d7e8f8';ctx.font=i===state.menuRow?'bold 28px system-ui':'27px system-ui';ctx.fillText(title,63,y);ctx.fillStyle='#88ecdb';ctx.textAlign='right';ctx.fillText(menuValue(i),1123,y);ctx.textAlign='left';});ctx.font='30px system-ui';ctx.fillStyle='#aacbd4';ctx.fillText('Right stick: navigate / adjust    A: select    B: close',57,1480);
gl.bindTexture(gl.TEXTURE_2D,menuTexture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,menuCanvas);}
function anchorFocus(){const [label,p]=ANCHORS[state.anchor];let target=[0,1.5,-1.45];if(trackHead){const dir=norm([-trackHead[8],0,-trackHead[10]]);target=[trackHead[12]+dir[0]*1.15,trackHead[13]-.15,trackHead[14]+dir[2]*1.15];}const desired=cellPosition(p);const d=sub(target,desired);state.origin=add(state.origin,d);state.seed=mm(mt(...d),state.seed);state.dirty=true;notify('Focus · '+label);}
function menuChange(direction=1){if(state.menuRow===0){systemStep(direction);drawMenu();return;}if(state.menuRow===1){pointGroupStep(direction);drawMenu();return;}const k=state.menuRow-2+(state.menuRow>17?1:0);const cycle=(name,list)=>setVal(name,list[(list.indexOf(state[name])+direction+list.length)%list.length]);
 switch(k){
 case 0:cycleWithinPointGroup(direction);break;
 case 1:cycle('representation',['motif','sheet','slice']);break;
 case 2:if(state.representation==='slice')cycle('volume',['oak','walnut','strata']);else cycle('motif',['archer','target','tree']);break;
 case 3:cycle('family',['opaque','line']);break;
 case 4:setVal('pattern',(state.pattern+direction+5)%5);break;
 case 5:cycle('quality',['safe','balanced','extended','custom']);break;
 case 6:setVal('period',clamp(Math.round((state.period+direction*.05)*20)/20,.1,2.5));break;
 case 7:setVal('radius',clamp(state.radius+direction,1,8));break;
 case 8:setVal('fadeStart',clamp(state.fadeStart+direction,0,state.radius));break;
 case 9:setVal('occupancy',clamp((Math.round(state.occupancy*100)+direction*2)/100,.03,.75));break;
 case 10:if(state.representation==='sheet')setVal('coverage',clamp(state.coverage+direction*.1,.1,1));break;
 case 11:cycle('fadeStyle',['contrast','off','dither','alpha','cut']);break;
 case 12:setVal('fadeViewer',!state.fadeViewer);break;
 case 13:setVal('grid',!state.grid);break;
 case 14:setVal('ground',!state.ground);break;
 case 15:setVal('safety',!state.safety);break;
 case 16:notify('Motif size is relative to cell period');break;
 case 17:setVal('sliceFollow',!state.sliceFollow);break;
 case 18:setVal('sectionY',clamp(state.sectionY+direction*.10,.25,3));break;
 case 19:setVal('exterior',!state.exterior);break;
 case 20:if(state.representation==='motif')setVal('animate',!state.animate);else notify('Generator animation is only in motif mode');break;
 case 21:state.anchor=(state.anchor+direction+4)%4;anchorFocus();break;
 case 22:state.menu=false;break;
 }drawMenu();}
function drawQuad(shader,vao,vp,model,tex){gl.useProgram(shader);gl.uniformMatrix4fv(uiU.vp,false,vp);gl.uniformMatrix4fv(uiU.model,false,model);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,tex);gl.uniform1i(uiU.tex,0);gl.bindVertexArray(vao);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.disable(gl.CULL_FACE);gl.disable(gl.DEPTH_TEST);gl.depthMask(false);gl.drawArrays(gl.TRIANGLES,0,6);gl.depthMask(true);gl.enable(gl.DEPTH_TEST);gl.disable(gl.BLEND);}
function gpuInverseBasis(loc){const b=GROUPS[state.group].basisInv;
 gl.uniformMatrix3fv(loc,false,new Float32Array([b[0],b[3],b[6],b[1],b[4],b[7],b[2],b[5],b[8]]));}
function setupMaterial(vp,head,mode){gl.useProgram(meshShader);
 gl.uniformMatrix4fv(mU.vp,false,vp);gl.uniform3f(mU.light,-.47,.81,.33);
 const c=worldFrac(state.fadeViewer?head:(state.fadeAnchor||state.origin));
 gpuInverseBasis(mU.basisInv);gl.uniform3fv(mU.viewer,c);gl.uniform3fv(mU.origin,state.origin);gl.uniform1f(mU.period,state.period);
 gl.uniform1f(mU.s0,state.fadeStart);gl.uniform1f(mU.s1,state.radius);
 gl.uniform1i(mU.mode,mode===undefined?(state.fadeStyle==='dither'?0:state.fadeStyle==='alpha'?1:state.fadeStyle==='cut'?2:state.fadeStyle==='contrast'?3:4):mode);
 gl.uniform1f(mU.cover,volumeThreshold);gl.uniform1i(mU.txt,0);gl.uniform1i(mU.fill,0);gl.uniform1i(mU.panelSym,0);gl.uniform1i(mU.group,state.group);
 gl.activeTexture(gl.TEXTURE0);gl.uniform1i(mU.tex,0);gl.bindTexture(gl.TEXTURE_2D,texture.forest||null);
 gl.activeTexture(gl.TEXTURE1);gl.uniform1i(mU.volume,1);gl.bindTexture(gl.TEXTURE_3D,volumeTexture);
 gl.disable(gl.CULL_FACE);gl.enable(gl.DEPTH_TEST);
}
function drawOne(obj,seed,tex,textured,fill,motif){if(!obj?.instances)return;
 gl.uniformMatrix4fv(mU.seed,false,seed);gl.uniform1i(mU.txt,textured?1:0);
 gl.uniform1i(mU.fill,fill===2?2:(fill?1:0));gl.uniform1i(mU.motif,motif?1:0);
 gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,tex||texture.forest);
 gl.bindVertexArray(obj.vao);
 gl.drawElementsInstanced(gl.TRIANGLES,obj.count,obj.indexType||gl.UNSIGNED_SHORT,0,obj.instances);
}
let lastSheetEye=null;
function drawMeshes(vp,head){if(state.representation==='sheet'&&sheetRecordsSorted.length>1){
 const needs=!lastSheetEye||len(sub(lastSheetEye,head))>.10;
 if(needs){sheetRecordsSorted.sort((a,b)=>{
   const pa=[a.m[12]+state.period*.5,a.m[13]+state.period*.5,a.m[14]+state.period*.5];
   const pb=[b.m[12]+state.period*.5,b.m[13]+state.period*.5,b.m[14]+state.period*.5];
   return len(sub(pb,head))-len(sub(pa,head));
 });upload(sheetMeshes[state.group],sheetRecordsSorted);lastSheetEye=head.slice();}}
 setupMaterial(vp,head);
 drawOne(rods,mid(),null,false,false,false);
 if(state.representation==='motif'){
  if(state.fadeStyle==='alpha'){gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false);}
  drawOne(motifs[state.motif],state.seed,texture.forest,true,false,true);
  if(state.fadeStyle==='alpha'){gl.depthMask(true);gl.disable(gl.BLEND);}
 }else if(state.representation==='sheet'){
  // Draw the Voronoi/Dirichlet fundamental-domain face network in every cell,
  // including oblique internal faces, with continuous planar PNG coordinates.
  const sym=0;
  gl.uniform1i(mU.panelSym,sym);
  gl.uniform1f(mU.cover,state.coverage);
  const solidWall=state.family==='opaque'&&state.coverage>=.999;
  if(!solidWall){gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false);}
  drawOne(sheetMeshes[state.group],mid(),texture[state.family+state.pattern],true,2,true);
  gl.depthMask(true);gl.disable(gl.BLEND);
 }
 if(state.animate&&state.representation==='motif'&&!grab)drawGeneratorDemonstration(vp,head);
}
function drawGeneratorDemonstration(vp,head){
 if(!state.demoTransforms||!demoMeshes[state.motif])return;
 setupMaterial(vp,head,4);gl.enable(gl.POLYGON_OFFSET_FILL);gl.polygonOffset(-2,-2);
 drawOne(demoMeshes[state.motif],mid(),texture.forest,true,false,false);
 gl.disable(gl.POLYGON_OFFSET_FILL);
}
function drawSection(vp){if(state.representation!=='slice'||!volumeTexture)return;
 const head=trackHead||mid();
 if(state.exterior){drawVolumeExterior(vp,head);return;}
 if(!state.sliceFollow&&!fixedSectionPose)fixedSectionPose=new Float32Array(head);
 const frame=state.sliceFollow?head:fixedSectionPose;
 const size=clamp(state.period*2.2,.6,4.5);
 const plane=mm(frame,mm(mt(0,0,-state.sectionY),ms(size,size,1)));
 gl.useProgram(sliceShader);gl.uniformMatrix4fv(sU.vp,false,vp);gl.uniformMatrix4fv(sU.plane,false,plane);
 gl.uniform3fv(sU.origin,state.origin);gpuInverseBasis(sU.basisInv);gl.uniform1f(sU.period,state.period);
 gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_3D,volumeTexture);gl.uniform1i(sU.volume,1);
 gl.bindVertexArray(quad);gl.disable(gl.CULL_FACE);gl.enable(gl.DEPTH_TEST);gl.depthMask(true);
 gl.drawArrays(gl.TRIANGLES,0,6);
}
function drawVolumeExterior(vp,head){
 // One cell only: a modest, actual isosurface sampled by a GPU ray cast.
 gl.useProgram(exteriorShader);
 const L=state.period,base=state.origin;
 const box=mm(mt(...cellPosition([.5,.5,.5])),cellBasis());
 gl.uniformMatrix4fv(eU.vp,false,vp);gl.uniformMatrix4fv(eU.box,false,box);
 gl.uniform3fv(eU.origin,base);gpuInverseBasis(eU.basisInv);gl.uniform3f(eU.eye,head[12],head[13],head[14]);
 gl.uniform1f(eU.period,L);
 gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_3D,volumeTexture);gl.uniform1i(eU.volume,1);
 gl.disable(gl.BLEND);gl.enable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);
 gl.bindVertexArray(exteriorMesh.vao);gl.drawElements(gl.TRIANGLES,exteriorMesh.count,gl.UNSIGNED_SHORT,0);
 gl.disable(gl.CULL_FACE);
}
function detR(r){return r[0]*(r[4]*r[8]-r[5]*r[7])-r[1]*(r[3]*r[8]-r[5]*r[6])+r[2]*(r[3]*r[7]-r[4]*r[6]);}
// The user's actual XR floor plane is y=0 in a local-floor / bounded-floor reference space.
// The browser may expose a Guardian polygon, but our comfort floor intentionally extends past it.
function configureFloor(){floorSource=ref?.boundsGeometry?.length?'bounded-floor reference':'local-floor reference';}
function drawGround(vp,head){if(!state.ground)return;
 const headPos=head||[player.x,player.y+1.64,player.z];
 const y=-.018; // Local-floor coordinates: never track joystick flying or crouching.
 const far=Math.max(8,state.period*(state.radius+3)*2.6),near=far*.90;
 const plane=mm(mt(headPos[0],y,headPos[2]),mm(rx(-PI/2),ms(far*1.55,far*1.55,1)));
 gl.useProgram(floorShader);gl.uniformMatrix4fv(fU.vp,false,vp);
 gl.uniformMatrix4fv(fU.model,false,plane);gl.uniform3f(fU.center,headPos[0],y,headPos[2]);
 gl.uniform1f(fU.near,near);gl.uniform1f(fU.far,far);
 gl.bindVertexArray(quad);gl.disable(gl.BLEND);gl.disable(gl.CULL_FACE);
 gl.enable(gl.DEPTH_TEST);gl.depthMask(true);gl.drawArrays(gl.TRIANGLES,0,6);
}
function render(vp,eye){drawGround(vp,eye);drawMeshes(vp,eye);drawSection(vp);
 if(state.menu)drawQuad(uiShader,quad,vp,menuPose,menuTexture);gl.bindVertexArray(null);}
function rig(){return mm(mt(player.x,player.y,player.z),ry(player.yaw));}
function headFromTracking(tracking){return mm(rig(),tracking);}
function yawFromHead(m){return Math.atan2(-m[8],-m[10]);}
function frameBody(m){return mm(mt(m[12],m[13],m[14]),ry(yawFromHead(m)));}
function openMenu(head){state.menu=!state.menu;if(state.menu){const facing=yawFromHead(head),forward=[-Math.sin(facing),0,-Math.cos(facing)],center=[head[12]+forward[0]*1.32,head[13]-.06,head[14]+forward[2]*1.32];menuPose=mm(mt(...center),mm(ry(facing),ms(.90,1.13,1)));drawMenu();}notify(state.menu?'Menu · right stick and A':'Menu closed');}
function moveByInput(dt,f,r,up=0){const m=trackHead||mm(mt(player.x,1.6,player.z),ry(player.yaw)),yaw=yawFromHead(m),s=player.speed*dt;if(f||r){const d=Math.hypot(f,r)||1;f/=Math.max(1,d);r/=Math.max(1,d);player.x+=(-Math.sin(yaw)*f+Math.cos(yaw)*r)*s;player.z+=(-Math.cos(yaw)*f-Math.sin(yaw)*r)*s;}player.y+=up*s;}
function turnAroundHead(delta,tracking){const before=headFromTracking(tracking),x=before[12],z=before[14];player.yaw+=delta;const after=headFromTracking(tracking);player.x+=x-after[12];player.z+=z-after[14];}
function pick(rayOrigin,rayDirection){if(state.representation!=='motif')return null;const r=state.occupancy*.85;let best=null,tbest=Infinity;const user=state.fadeViewer?trackHead?.slice(12,15):null;
for(const o of state.instances){const center=point(mm(o.m,state.seed),[0,0,0]);const v=sub(center,rayOrigin),t=v.reduce((s,x,i)=>s+x*rayDirection[i],0);if(t<-.2||t>6)continue;const distance2=len(sub(v,scale(rayDirection,t)));if(distance2>Math.max(.045,r))continue;if(t<tbest){tbest=t;best=o;}}
return best;}
function toggleGrab(rayOrigin,rayDirection,head){if(grab){grab=null;state.animBase=new Float32Array(state.seed);state.animPhase=0;notify('Motif released · exact orbit retained');return;}let picked=pick(rayOrigin,rayDirection);
if(!picked){ // Accessibility fallback: pick nearest copy within 0.65 m of body.
  let dmin=.65;for(const o of state.instances){const c=point(mm(o.m,state.seed),[0,0,0]),d=len(sub(c,[head[12],head[13],head[14]]));if(d<dmin){dmin=d;picked=o;}}
}
if(!picked){notify('Aim at a motif, then press left trigger');return;}
grab={op:picked.m,body:frameBody(head),seed:new Float32Array(state.seed)};state.canonKey=canonicalKey();
notify('Carrying · cross a mirror or cell boundary');}
function canonicalKey(){const g=GROUPS[state.group],p=worldFrac([state.seed[12],state.seed[13],state.seed[14]]);let best=null,index=0;
for(let i=0;i<g.ops.length;i++){const op=g.ops[i],v=rV(op.r,p).map((x,k)=>mod(x+op.t[k]));const key=v.map(x=>Math.round(x*100000)/100000).join(':');if(best===null||key<best){best=key;index=i;}}
return String(index);}
function updateGrab(head){if(!grab)return;const D=mm(frameBody(head),invert(grab.body));state.seed=mm(invert(grab.op),mm(D,mm(grab.op,grab.seed)));
const k=canonicalKey();if(state.canonKey!==undefined&&state.canonKey!==null&&state.canonKey!==k && (performance.now()-(state.lastCanonToast||0))>450){notify('Canonical representative changed · orbit remains continuous');state.lastCanonToast=performance.now();}state.canonKey=k;}

function rotateGenerator(dt){
 if(!state.animate||grab||state.representation!=='motif'){
  state.demoTransforms=null;return;}
 const group=GROUPS[state.group],generator=group.gens.find(g=>detR(g.r)>0&&key(g)!==key(op(I3)));
 if(!generator||!['tetragonal','cubic'].includes(group.system)){state.demoTransforms=null;return;}
 state.animPhase=mod((state.animPhase||0)+dt/5.0);
 const f=state.animPhase,L=state.period,center=state.origin;
 // All instances in one centered stage move together. Their endpoints permute the orbit.
 // Screw motion is the intentional exception: it advances axially by a quarter-period.
 const spin=mm(mt(...center),mm(ry(-PI*.5*f),mt(-center[0],-center[1],-center[2])));
 const animation=mm(mt(0,group.screw?generator.t[1]*L*f:0,0),spin),records=[];
 for(const o of group.ops){const m=mm(cellOp([0,0,0],o),state.seed),p=[m[12],m[13],m[14]];
   m[12]-=Math.round((p[0]-center[0])/L)*L;
   m[14]-=Math.round((p[2]-center[2])/L)*L;
   m[13]-=Math.floor((p[1]-center[1])/L)*L;
   records.push(rec(mm(animation,m),[1.12,.88,.53],[0,0,0]));
 }
 state.demoTransforms=records;upload(demoMeshes[state.motif],records);
}
function scaleCanvas(){const w=Math.max(2,Math.round(innerWidth*Math.min(devicePixelRatio||1,1.5))),h=Math.max(2,Math.round(innerHeight*Math.min(devicePixelRatio||1,1.5)));if(cv.width!==w||cv.height!==h){cv.width=w;cv.height=h;}}
function tickCommon(time,dt,head){trackHead=head;updateGrab(head);if(state.fadeViewer){const next=worldFrac(head.slice(12,15)).map(Math.floor);if(next.some((v,i)=>v!==state.followCenter[i]))state.dirty=true;}if(state.dirty)regen();if(toastTime&&time>toastTime){$('toast').classList.remove('show');toastTime=0;}}
function desktop(time){if(session)return;const dt=clamp((time-lastFrame)/1000||0,0,.05);lastFrame=time;let f=+keys.has('KeyW')-+keys.has('KeyS'),r=+keys.has('KeyD')-+keys.has('KeyA');if(keys.has('KeyQ'))player.yaw+=dt*1.2;if(keys.has('KeyE'))player.yaw-=dt*1.2;moveByInput(dt,f,r,+keys.has('KeyR')-+keys.has('KeyF'));const head=mm(mt(player.x,player.y+1.64,player.z),mm(ry(player.yaw),rx(player.pitch)));tickCommon(time,dt,head);rotateGenerator(dt);scaleCanvas();gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,cv.width,cv.height);gl.clearColor(.018,.039,.066,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);const vp=mm(persp(1.07,cv.width/cv.height,.035,120),invert(head));render(vp,[head[12],head[13],head[14]]);requestAnimationFrame(desktop);}
function once(k,press){const old=pressed.get(k)||false;pressed.set(k,press);return press&&!old;}
function dead(v){return Math.abs(v)<.18?0:v;}
function controllerInput(frame,pose,dt,head){for(const src of session.inputSources){if(!src.gamepad)continue;const pad=src.gamepad,side=src.handedness,axes=pad.axes;let ax=dead(axes.length>=4?axes[axes.length-2]:axes[0]||0),ay=dead(axes.length>=4?axes[axes.length-1]:axes[1]||0);
if(side==='left')moveByInput(dt,-ay,-ax,0);
if(side==='right'){
 if(state.menu){if(once('menu-v',Math.abs(ay)>.65))state.menuRow=(state.menuRow+(ay>0?1:-1)+MENU.length)%MENU.length;
 if(once('menu-h',Math.abs(ax)>.65))menuChange(ax>0?1:-1);
 if(Math.abs(ay)<.35)pressed.set('menu-v',false);if(Math.abs(ax)<.35)pressed.set('menu-h',false);
 }else{if(once('snap',Math.abs(ax)>.72))turnAroundHead(-Math.sign(ax)*PI/6,pose.transform.matrix);if(Math.abs(ax)<.36)pressed.set('snap',false);moveByInput(dt,0,0,-ay*.5);}}
if(side==='left'&&once('grab',!!pad.buttons[0]?.pressed)){
 let position=[head[12],head[13],head[14]],direction=norm([-head[8],-head[9],-head[10]]);const ray=frame.getPose(src.targetRaySpace,ref);
 if(ray){const m=headFromTracking(ray.transform.matrix);position=[m[12],m[13],m[14]];direction=norm([-m[8],-m[9],-m[10]]);}toggleGrab(position,direction,head);}
if(side==='right'&&once('B',!!pad.buttons[5]?.pressed))openMenu(head);
if(side==='right'&&once('A',!!pad.buttons[4]?.pressed)){if(state.menu)menuChange(1);else changeGroup(state.group+1);}
if(side==='left'&&once('X',!!pad.buttons[4]?.pressed)){if(state.menu)menuChange(-1);else{const a=['archer','target','tree'];setVal('motif',a[(a.indexOf(state.motif)+1)%a.length]);notify('Motif · '+state.motif);}}
if(side==='left'&&once('Y',!!pad.buttons[5]?.pressed)){if(state.menu)state.menu=false;else changeGroup(state.group-1);}
if(side==='right'&&once('rightTrigger',!!pad.buttons[0]?.pressed)&&state.menu)menuChange(1);
}}
function xrFrame(time,frame){if(!session)return;session.requestAnimationFrame(xrFrame);const pose=frame.getViewerPose(ref);if(!pose)return;const dt=clamp((time-lastFrame)/1000||0,0,.05);lastFrame=time;const tracked=pose.transform.matrix;let head=headFromTracking(tracked);trackHead=head;controllerInput(frame,pose,dt,head);head=headFromTracking(tracked);tickCommon(time,dt,head);rotateGenerator(dt);
gl.bindFramebuffer(gl.FRAMEBUFFER,session.renderState.baseLayer.framebuffer);gl.clearColor(.018,.039,.066,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
const R=rig();for(const view of pose.views){const port=session.renderState.baseLayer.getViewport(view);gl.viewport(port.x,port.y,port.width,port.height);const eye=mm(R,view.transform.matrix),vp=mm(view.projectionMatrix,invert(eye));render(vp,[eye[12],eye[13],eye[14]]);}}
async function enter(){if(session){await session.end();return;}if(!navigator.xr){notify('Quest Browser over HTTPS is required for WebXR');return;}try{await gl.makeXRCompatible();session=await navigator.xr.requestSession('immersive-vr',{optionalFeatures:['local-floor','bounded-floor']});session.addEventListener('end',()=>{session=null;ref=null;pressed.clear();state.menu=false;$('panel').style.display='';$('enter').textContent='ENTER IMMERSIVE VR';lastFrame=0;requestAnimationFrame(desktop);});session.updateRenderState({baseLayer:new XRWebGLLayer(session,gl,{alpha:false,depth:true,antialias:true,framebufferScaleFactor:0.9})});try{ref=await session.requestReferenceSpace('bounded-floor');}catch(_){try{ref=await session.requestReferenceSpace('local-floor');}catch(__){ref=await session.requestReferenceSpace('local');}}configureFloor();pressed.clear();$('panel').style.display='none';$('enter').textContent='EXIT VR';lastFrame=0;session.requestAnimationFrame(xrFrame);}catch(e){session=null;error(e);}}
function rebuildGroupList(){
 const term=($('groupSearch')?.value||'').trim().toLowerCase();
 const system=$('crystalSystem')?.value||'all',pointGroup=$('pointGroup')?.value||'all';
 const select=$('group'),old=String(state.group);
 select.replaceChildren();
 const buckets={};
 for(let i=0;i<GROUPS.length;i++){
  const g=GROUPS[i],text='#'+g.id+' '+g.symbol+' '+g.short+' '+g.compact+' '+g.hall+' '+g.pointGroup+' '+g.centering;
  if(system!=='all'&&g.system!==system)continue;
  if(pointGroup!=='all'&&g.pointGroup!==pointGroup)continue;
  if(term&&!text.toLowerCase().includes(term)&&!String(g.id).includes(term))continue;
  const cat=system==='all'?g.system:g.pointGroup;
  if(!buckets[cat]){
   const o=document.createElement('optgroup');o.label=cat[0].toUpperCase()+cat.slice(1);
   select.appendChild(o);buckets[cat]=o;
  }
  const opt=document.createElement('option');opt.value=i;
  opt.textContent='#'+g.id+'  '+g.short+'   · '+g.order+' ops';buckets[cat].appendChild(opt);
 }
 if(!select.querySelector('option[value="'+old+'"]')){
  const opt=document.createElement('option');opt.value=old;opt.setAttribute('selected-current','');opt.textContent='#'+GROUPS[state.group].id+' '+GROUPS[state.group].short+'  (currently selected)';
  select.prepend(opt);
 }
 select.value=old;
 $('groupResultCount').textContent=(select.querySelectorAll('option').length-(!!select.querySelector('option[selected-current]')?1:0))+' matching groups';
 const g=GROUPS[state.group];$('groupDetails').textContent='#'+g.id+' '+g.short+' ('+g.symbol+') · '+g.system+' · point group '+g.pointGroup+' · '+g.centering+'-centered lattice · Hall: '+g.hall;
}
function rebuildPointGroups(){
 const sys=$('crystalSystem').value,select=$('pointGroup'),previous=select.value;
 select.replaceChildren();const base=document.createElement('option');base.value='all';base.textContent='All point groups';select.appendChild(base);
 const values=[...new Set(GROUPS.filter(g=>sys==='all'||g.system===sys).map(g=>g.pointGroup))];
 for(const value of values){const opt=document.createElement('option');opt.value=value;opt.textContent=value;select.appendChild(opt);}
 select.value=values.includes(previous)?previous:'all';
}
function pointGroupStep(d){
 const sys=GROUPS[state.group].system,values=[...new Set(GROUPS.filter(g=>g.system===sys).map(g=>g.pointGroup))];
 const current=values.indexOf(GROUPS[state.group].pointGroup),next=values[(current+d+values.length)%values.length];
 const i=GROUPS.findIndex(g=>g.system===sys&&g.pointGroup===next);changeGroup(i);
}
function systemStep(d){
 let k=CRYSTAL_SYSTEMS.indexOf(GROUPS[state.group].system);
 k=(k+d+7)%7;
 const i=GROUPS.findIndex(g=>g.system===CRYSTAL_SYSTEMS[k]);
 changeGroup(i);
 const control=$('crystalSystem');if(control)control.value=CRYSTAL_SYSTEMS[k];
 rebuildGroupList();
}
function cycleWithinPointGroup(d){
 const group=GROUPS[state.group],opts=GROUPS.map((g,i)=>g.system===group.system&&g.pointGroup===group.pointGroup?i:-1).filter(i=>i>=0);
 const k=opts.indexOf(state.group);changeGroup(opts[(k+d+opts.length)%opts.length]);
}
function wire(){
 for(const system of CRYSTAL_SYSTEMS){const opt=document.createElement('option');opt.value=system;opt.textContent=system[0].toUpperCase()+system.slice(1);$('crystalSystem').appendChild(opt);}
 $('crystalSystem').addEventListener('change',()=>{rebuildPointGroups();const selected=$('crystalSystem').value;if(selected!=='all'&&GROUPS[state.group].system!==selected){changeGroup(GROUPS.findIndex(g=>g.system===selected));}else rebuildGroupList();});
 $('pointGroup').addEventListener('change',()=>{const value=$('pointGroup').value;if(value!=='all'&&GROUPS[state.group].pointGroup!==value){const sys=$('crystalSystem').value;changeGroup(GROUPS.findIndex(g=>g.pointGroup===value&&(sys==='all'||g.system===sys)));}else rebuildGroupList();});
 $('groupSearch').addEventListener('input',rebuildGroupList);
 $('groupFeatured').addEventListener('change',e=>{if(e.target.value!==''){ $('crystalSystem').value='all';rebuildPointGroups();$('pointGroup').value='all';$('groupSearch').value='';changeGroup(Number(e.target.value)-1);}e.target.value='';});
 rebuildPointGroups();rebuildGroupList();
 
for(const [name,fn] of Object.entries({group:v=>setVal('group',+v),representation:v=>setVal('representation',v),motif:v=>setVal('motif',v),volume:v=>setVal('volume',v),family:v=>setVal('family',v),pattern:v=>setVal('pattern',+v),coverage:v=>setVal('coverage',+v/100),period:v=>setVal('period',+v),radius:v=>setVal('radius',+v),fadeStart:v=>setVal('fadeStart',+v),occupancy:v=>setVal('occupancy',+v/100),sectionY:v=>setVal('sectionY',+v),fadeStyle:v=>setVal('fadeStyle',v),quality:v=>setVal('quality',v)}))$(name).addEventListener('input',e=>fn(e.target.value));
for(const k of ['safety','fadeViewer','grid','ground','animate','sliceFollow','exterior'])$(k).addEventListener('change',e=>setVal(k,e.target.checked));$('reset').onclick=resetAll;$('enter').onclick=enter;
window.addEventListener('keydown',e=>{if(e.target instanceof HTMLInputElement||e.target instanceof HTMLSelectElement)return;keys.add(e.code);if(e.repeat)return;if(e.code==='BracketRight')changeGroup(state.group+1);if(e.code==='BracketLeft')changeGroup(state.group-1);if(e.code==='KeyM'){const a=['archer','target','tree'];setVal('motif',a[(a.indexOf(state.motif)+1)%a.length]);}if(e.code==='KeyH'){const head=mm(mt(player.x,player.y+1.64,player.z),ry(player.yaw));openMenu(head);}if(e.code==='KeyC'||e.code==='KeyV'){const h=mm(mt(player.x,player.y+1.64,player.z),ry(player.yaw));toggleGrab([h[12],h[13],h[14]],norm([-h[8],0,-h[10]]),h);}});
window.addEventListener('keyup',e=>keys.delete(e.code));cv.addEventListener('pointerdown',e=>{drag=true;dragLast=[e.clientX,e.clientY];cv.setPointerCapture(e.pointerId);});cv.addEventListener('pointermove',e=>{if(!drag)return;player.yaw-=(e.clientX-dragLast[0])*.005;player.pitch=clamp(player.pitch-(e.clientY-dragLast[1])*.005,-1.25,1.25);dragLast=[e.clientX,e.clientY];});cv.addEventListener('pointerup',()=>drag=false);}
try{syncUI();loadAssets().catch(error);requestAnimationFrame(desktop);}catch(e){error(e);}
window.SPACEGROUP_DEBUG={GROUPS,state,closure,compose,key,cellOp,point,mm,resetAll,regen,changeGroup,canonicalKey,defaultSize,detR,get floorSource(){return floorSource},get volumeTexture(){return volumeTexture},getGLError(){return gl.getError()},get materialNames(){return Object.keys(solidVolumes)},get canonicalCache(){return canonicalCache},get faceStats(){return window.SPACEGROUP_FUNDAMENTAL_FACES.map(x=>({facets:x.facets,triangles:x.i.length/3}))},get sheetCount(){return sheetMeshes[state.group]?.instances||0},get sheetTexture(){return texture[state.family+state.pattern]||null},setVal,render};
})();
