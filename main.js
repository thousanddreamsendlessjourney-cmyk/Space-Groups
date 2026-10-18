/* Spacegroup Atlas — dependency-free WebGL2 + WebXR laboratory.
   Copyright (c) 2026. MIT licensed. See LICENSE.
   Crystallographic note: physical orbit instances use 3D space-group
   affine operations, while the floor is deliberately only a guide layer. */
(() => {
'use strict';
const canvas = document.getElementById('scene');
const ui = {
  group: document.getElementById('group'), distance: document.getElementById('distance'),
  detail: document.getElementById('detail'), grid: document.getElementById('grid'),
  mosaic: document.getElementById('mosaic'), orbit: document.getElementById('orbit'),
  order: document.getElementById('order'), status: document.getElementById('status'),
  enter: document.getElementById('enter'), error: document.getElementById('error')
};
const gl = canvas.getContext('webgl2', { antialias:true, alpha:false, depth:true, xrCompatible:true, powerPreference:'high-performance' });
if (!gl) { ui.error.style.display='block'; ui.error.textContent='WebGL2 is required. Please use Quest Browser or an updated desktop browser.'; return; }
const MATH = Math;
const TAU = 2*Math.PI;
const clamp=(a,l,h)=>Math.max(l,Math.min(h,a));
const mod1=n=>((n%1)+1)%1;
const mIdentity=()=>new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]);
const mMultiply=(a,b)=>{ const o=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++){let v=0;for(let k=0;k<4;k++)v+=a[k*4+r]*b[c*4+k];o[c*4+r]=v;}return o;};
const mTranslate=(x,y,z)=>{let m=mIdentity();m[12]=x;m[13]=y;m[14]=z;return m;};
const mRotY=(t)=>{let c=Math.cos(t),s=Math.sin(t),m=mIdentity();m[0]=c;m[2]=-s;m[8]=s;m[10]=c;return m;};
const mRotX=(t)=>{let c=Math.cos(t),s=Math.sin(t),m=mIdentity();m[5]=c;m[6]=s;m[9]=-s;m[10]=c;return m;};
function mPerspective(fovy,aspect,near,far){const f=1/Math.tan(fovy/2),o=new Float32Array(16);o[0]=f/aspect;o[5]=f;o[10]=(far+near)/(near-far);o[11]=-1;o[14]=2*far*near/(near-far);return o;}
function mInvert(a){
  // Gauss–Jordan inversion using row-major scratch matrices, output column-major.
  const x=[[],[],[],[]],b=[[],[],[],[]];
  for(let r=0;r<4;r++)for(let c=0;c<4;c++){x[r][c]=a[c*4+r];b[r][c]=r===c?1:0;}
  for(let i=0;i<4;i++){let pivot=i;for(let r=i+1;r<4;r++)if(Math.abs(x[r][i])>Math.abs(x[pivot][i]))pivot=r;
    if(Math.abs(x[pivot][i])<1e-12)return mIdentity();
    [x[i],x[pivot]]=[x[pivot],x[i]];[b[i],b[pivot]]=[b[pivot],b[i]];
    const d=x[i][i];for(let c=0;c<4;c++){x[i][c]/=d;b[i][c]/=d;}
    for(let r=0;r<4;r++)if(r!==i){const t=x[r][i];for(let c=0;c<4;c++){x[r][c]-=t*x[i][c];b[r][c]-=t*b[i][c];}}
  }
  const o=new Float32Array(16);for(let r=0;r<4;r++)for(let c=0;c<4;c++)o[c*4+r]=b[r][c];return o;
}
function mFromAffine(linear, position,scale=1){const m=mIdentity();for(let r=0;r<3;r++)for(let c=0;c<3;c++)m[c*4+r]=linear[r*3+c]*scale;m[12]=position[0];m[13]=position[1];m[14]=position[2];return m;}
const I=[1,0,0,0,1,0,0,0,1];
const flipX=[-1,0,0,0,1,0,0,0,1];
const flipY=[1,0,0,0,-1,0,0,0,1];
const flipZ=[1,0,0,0,1,0,0,0,-1];
const flipXYZ=[-1,0,0,0,-1,0,0,0,-1];
const r2Y=[-1,0,0,0,1,0,0,0,-1];
const r4Y=[0,0,-1,0,1,0,1,0,0];
const r4X=[1,0,0,0,0,-1,0,1,0];
// Hexagonal basis: a along X, c at +60° in XZ. (u,v)->(-v,u+v).
const r6Y=[0,0,-1,0,1,0,1,0,1];
const r3Y=[-1,0,-1,0,1,0,1,0,0]; // r6^2
const gen=(r,t=[0,0,0])=>({r,t});
const GROUPS=[
  {id:1, symbol:'P1',name:'Primitive, no point symmetry',type:'triclinic',basis:[[16,0,0],[0,16,0],[4,0,15]],gens:[],order:1,petals:1},
  {id:2, symbol:'P-1',name:'Inversion pairs',type:'triclinic',basis:[[16,0,0],[0,16,0],[4,0,15]],gens:[gen(flipXYZ)],order:2,petals:2},
  {id:3, symbol:'P2',name:'Twofold rotations',type:'monoclinic',basis:[[16,0,0],[0,17,0],[4,0,15]],gens:[gen(r2Y)],order:2,petals:2},
  {id:47,symbol:'Pmmm',name:'Three perpendicular mirrors',type:'orthorhombic',basis:[[16,0,0],[0,17,0],[0,0,19]],gens:[gen(flipX),gen(flipY),gen(flipZ)],order:8,petals:2},
  {id:75,symbol:'P4',name:'Fourfold rotations',type:'tetragonal',basis:[[16,0,0],[0,19,0],[0,0,16]],gens:[gen(r4Y)],order:4,petals:4},
  {id:76,symbol:'P4₁',name:'Quarter-turn screw staircase',type:'tetragonal',basis:[[16,0,0],[0,19,0],[0,0,16]],gens:[gen(r4Y,[0,.25,0])],order:4,petals:4,screw:true},
  {id:99,symbol:'P4mm',name:'Fourfold axis and vertical mirrors',type:'tetragonal',basis:[[16,0,0],[0,19,0],[0,0,16]],gens:[gen(r4Y),gen(flipX)],order:8,petals:4},
  {id:143,symbol:'P3',name:'Threefold rotations',type:'trigonal',basis:[[17,0,0],[0,19,0],[8.5,0,14.72243]],gens:[gen(r3Y)],order:3,petals:3},
  {id:168,symbol:'P6',name:'Sixfold rotations',type:'hexagonal',basis:[[17,0,0],[0,19,0],[8.5,0,14.72243]],gens:[gen(r6Y)],order:6,petals:6},
  {id:183,symbol:'P6mm',name:'Hexagonal mirrors',type:'hexagonal',basis:[[17,0,0],[0,19,0],[8.5,0,14.72243]],gens:[gen(r6Y),gen([0,0,1,0,1,0,1,0,0])],order:12,petals:6},
  {id:221,symbol:'Pm-3m',name:'Full cubic symmetry',type:'cubic',basis:[[17,0,0],[0,17,0],[0,0,17]],gens:[gen(r4Y),gen(r4X),gen(flipX)],order:48,petals:4},
];
// NOTE: All fractional transforms are spatially genuine lattice automorphisms.
// Reflection for P6mm: swap fractional u/v, i.e. reflect across their bisector.
function rMult(a,b){let r=Array(9).fill(0);for(let i=0;i<3;i++)for(let j=0;j<3;j++)for(let k=0;k<3;k++)r[i*3+j]+=a[i*3+k]*b[k*3+j];return r;}
function rVec(a,v){return [a[0]*v[0]+a[1]*v[1]+a[2]*v[2],a[3]*v[0]+a[4]*v[1]+a[5]*v[2],a[6]*v[0]+a[7]*v[1]+a[8]*v[2]];}
function compose(a,b){const t=rVec(a.r,b.t);return {r:rMult(a.r,b.r),t:[mod1(t[0]+a.t[0]),mod1(t[1]+a.t[1]),mod1(t[2]+a.t[2])]};}
function opKey(op){return op.r.join(',')+';'+op.t.map(x=>Math.round(mod1(x)*10000)%10000).join(',');}
function closure(gens){const id=gen(I),out=[id],keys=new Set([opKey(id)]);for(let at=0;at<out.length;at++){for(const g of gens){const o=compose(out[at],g),k=opKey(o);if(!keys.has(k)){keys.add(k);out.push(o);if(out.length>64)throw Error('Invalid operation closure >64');}}}return out;}
// Flat basis B stores columns in vectors (a,b,c); inverse obtained by 3x3 cofactor.
function inv3(m){let a=m[0],b=m[1],c=m[2],d=m[3],e=m[4],f=m[5],g=m[6],h=m[7],i=m[8],det=a*(e*i-f*h)-b*(d*i-f*g)+c*(d*h-e*g);if(Math.abs(det)<1e-12)throw Error('Degenerate lattice');return [(e*i-f*h)/det,(c*h-b*i)/det,(b*f-c*e)/det,(f*g-d*i)/det,(a*i-c*g)/det,(c*d-a*f)/det,(d*h-e*g)/det,(b*g-a*h)/det,(a*e-b*d)/det];}
function basisMatrix(group){const b=group.basis;return [b[0][0],b[1][0],b[2][0],b[0][1],b[1][1],b[2][1],b[0][2],b[1][2],b[2][2]];}
function transformFrac(B,frac){return rVec(B,frac);}
function normalWorldMatrix(B,invB,fracR){return rMult(rMult(B,fracR),invB);}
function positiveUnitOrbit(ops,seed){const seen=new Set(),out=[];for(const op of ops){let pos=rVec(op.r,seed);pos=pos.map((x,i)=>mod1(x+op.t[i]));const key=pos.map(v=>Math.round(v*100000)).join(',');if(!seen.has(key)){seen.add(key);out.push({pos,op});}}return out;}
function anchorWorld(B,i,j,k){return transformFrac(B,[i,k,j]);} // x,z cell indices, k=vertical level
function worldCell(B,i,j,k,frac){return transformFrac(B,[i+frac[0],k+frac[1],j+frac[2]]);}
function matBox(position,scale){const m=mIdentity();m[0]=scale[0];m[5]=scale[1];m[10]=scale[2];m[12]=position[0];m[13]=position[1];m[14]=position[2];return m;}
function vecSub(a,b){return [a[0]-b[0],a[1]-b[1],a[2]-b[2]];}
function vecAdd(a,b){return [a[0]+b[0],a[1]+b[1],a[2]+b[2]];}
function vecNorm(a){const l=Math.hypot(...a)||1;return a.map(v=>v/l);}
function vecCross(a,b){return [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];}
function matrixRod(a,b,radius){const d=vecSub(b,a),len=Math.hypot(...d),y=vecNorm(d);const aux=Math.abs(y[1])>.95?[1,0,0]:[0,1,0],x=vecNorm(vecCross(aux,y)),z=vecCross(x,y),p=[(a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2];return new Float32Array([x[0]*radius,x[1]*radius,x[2]*radius,0, y[0]*len,y[1]*len,y[2]*len,0, z[0]*radius,z[1]*radius,z[2]*radius,0, p[0],p[1],p[2],1]);}
function makeGeometry(){
  const verts=[],normals=[],colors=[],indices=[];
  const addBox=(p,s,c)=>{
    const faces=[[[1,0,0],[1,3,7,5]], [[-1,0,0],[0,4,6,2]], [[0,1,0],[2,6,7,3]], [[0,-1,0],[0,1,5,4]], [[0,0,1],[4,5,7,6]], [[0,0,-1],[0,2,3,1]]];
    const xyz=[];for(let z of [-1,1])for(let y of [-1,1])for(let x of [-1,1])xyz.push([p[0]+x*s[0]/2,p[1]+y*s[1]/2,p[2]+z*s[2]/2]);
    // corners enumerated x-fast then y then z; faces use corrected winding above.
    for(const [normal,face] of faces){const start=verts.length/3;for(const id of face){verts.push(...xyz[id]);normals.push(...normal);colors.push(...c);}indices.push(start,start+1,start+2,start,start+2,start+3);}
  };
  return {verts,normals,colors,indices,addBox};
}
function cuboidGeometry(){const g=makeGeometry();g.addBox([0,0,0],[1,1,1],[1,1,1]);return g;}
function glyphGeometry(){const g=makeGeometry();
  // Chiral F-shaped assemblage. Symmetry transformations visibly rotate / mirror the gold fin.
  g.addBox([0,.1,0],[.23,2.5,.23],[.28,.88,.84]);
  g.addBox([.45,.82,0],[1.12,.22,.28],[1,.66,.35]);
  g.addBox([.34,.24,.0],[.80,.19,.26],[.94,.55,.32]);
  g.addBox([.69,.86,.30],[.20,.25,.72],[.99,.82,.41]);
  g.addBox([-.22,-.65,-.37],[.35,.21,.88],[.38,.62,1]);
  g.addBox([-.16,1.47,0],[.53,.31,.46],[.88,1,.84]);
  return g;
}
function pyramidGeometry(){const verts=[0,.9,0,-.7,-.4,.7,.7,-.4,.7,.7,-.4,-.7,-.7,-.4,-.7],indices=[0,1,2,0,2,3,0,3,4,0,4,1,1,4,3,1,3,2];const normals=[],colors=[],positions=[],ids=[];for(let j=0;j<indices.length;j+=3){const a=verts.slice(indices[j]*3,indices[j]*3+3),b=verts.slice(indices[j+1]*3,indices[j+1]*3+3),c=verts.slice(indices[j+2]*3,indices[j+2]*3+3),n=vecNorm(vecCross(vecSub(b,a),vecSub(c,a)));for(const p of [a,b,c]){positions.push(...p);normals.push(...n);colors.push(1,1,1);ids.push(ids.length);}}return {verts:positions,normals,colors,indices:ids};}
function createShader(vert,frag){const program=gl.createProgram();for(const [type,src] of [[gl.VERTEX_SHADER,vert],[gl.FRAGMENT_SHADER,frag]]){const sh=gl.createShader(type);gl.shaderSource(sh,src);gl.compileShader(sh);if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS))throw Error('Shader: '+gl.getShaderInfoLog(sh));gl.attachShader(program,sh);gl.deleteShader(sh);}gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('Link: '+gl.getProgramInfoLog(program));return program;}
const meshVS=`#version 300 es
precision highp float;
layout(location=0) in vec3 aPos;
layout(location=1) in vec3 aNormal;
layout(location=2) in vec3 aColor;
layout(location=3) in vec4 iM0;
layout(location=4) in vec4 iM1;
layout(location=5) in vec4 iM2;
layout(location=6) in vec4 iM3;
layout(location=7) in vec3 iTint;
uniform mat4 uVP;
out vec3 vColor;out vec3 vNormal;out vec3 vPos;
void main(){mat4 model=mat4(iM0,iM1,iM2,iM3);vec4 world=model*vec4(aPos,1.0);vPos=world.xyz;vNormal=normalize(mat3(model)*aNormal);vColor=aColor*iTint;gl_Position=uVP*world;}`;
const meshFS=`#version 300 es
precision highp float;
in vec3 vColor;in vec3 vNormal;in vec3 vPos;
uniform vec3 uEye;uniform vec3 uFog;uniform float uFogDensity;
out vec4 outColor;
void main(){float lit=.66+.32*abs(dot(normalize(vNormal),normalize(vec3(-.5,.9,.38))));vec3 col=vColor*lit;
float d=distance(vPos,uEye);float fog=1.0-exp(-pow(d*uFogDensity,1.45));col=mix(col,uFog,clamp(fog,0.,.98));outColor=vec4(col,1.0);}`;
const floorVS=`#version 300 es
precision highp float;
layout(location=0) in vec3 aPos;
uniform mat4 uVP;
out vec3 vP;
void main(){vP=aPos;gl_Position=uVP*vec4(aPos,1.);}`;
const floorFS=`#version 300 es
precision highp float;
in vec3 vP;
uniform vec3 uEye;uniform vec3 uFog;
uniform vec4 uInvBasis;
uniform float uPetals;uniform float uGuide;uniform float uFogDensity;
out vec4 outColor;
void main(){vec2 uv=vec2(dot(uInvBasis.xy,vP.xz),dot(uInvBasis.zw,vP.xz));vec2 cell=fract(uv);vec2 centered=cell-0.5;
vec3 col=vec3(.023,.075,.104);
// Derivative-based antialiasing keeps distant grid frequencies stable.
vec2 border=min(cell,1.-cell);vec2 fw=max(fwidth(uv),vec2(.0008));
float grid=1.-smoothstep(.003,.003+fw.x*1.8,border.x);grid=max(grid,1.-smoothstep(.003,.003+fw.y*1.8,border.y));
vec2 worldRel=centered*vec2(16.,16.);float r=length(worldRel);
float rings=exp(-pow((r-4.3)/.10,2.))*0.12 +exp(-pow((r-5.3)/.055,2.))*0.08;
float angle=atan(worldRel.y,worldRel.x);float flower=abs(cos(angle*uPetals));
float petal=exp(-pow((r-(2.6+1.15*flower))/.09,2.))*.10;
float mosaic=(rings+petal)*uGuide;
col+=vec3(.11,.34,.36)*grid*.6+vec3(.12,.44,.41)*mosaic;
float origin=exp(-pow(r/.7,2.));col+=vec3(.10,.25,.22)*origin*uGuide;
float d=distance(vP,uEye);float fog=1.-exp(-pow(d*uFogDensity,1.45));col=mix(col,uFog,clamp(fog*.83,0.,.97));outColor=vec4(col,1.);}`;
const uiVS=`#version 300 es
precision highp float;
layout(location=0) in vec2 aPos;
uniform mat4 uVP;uniform mat4 uModel;
out vec2 vUv;
void main(){vUv=aPos*.5+.5;gl_Position=uVP*uModel*vec4(aPos,0.,1.);}`;
const uiFS=`#version 300 es
precision highp float;
in vec2 vUv;uniform sampler2D uTexture;out vec4 outColor;
void main(){outColor=texture(uTexture,vec2(vUv.x,1.-vUv.y));}`;
let meshProgram,floorProgram,uiProgram;
try{meshProgram=createShader(meshVS,meshFS);floorProgram=createShader(floorVS,floorFS);uiProgram=createShader(uiVS,uiFS);}catch(err){ui.error.style.display='block';ui.error.textContent=String(err);return;}
const uni=(p,s)=>gl.getUniformLocation(p,s);
const mu={vp:uni(meshProgram,'uVP'),eye:uni(meshProgram,'uEye'),fog:uni(meshProgram,'uFog'),fd:uni(meshProgram,'uFogDensity')};
const fu={vp:uni(floorProgram,'uVP'),eye:uni(floorProgram,'uEye'),fog:uni(floorProgram,'uFog'),inv:uni(floorProgram,'uInvBasis'),pet:uni(floorProgram,'uPetals'),guide:uni(floorProgram,'uGuide'),fd:uni(floorProgram,'uFogDensity')};
const hu={vp:uni(uiProgram,'uVP'),model:uni(uiProgram,'uModel'),tex:uni(uiProgram,'uTexture')};
function makeMesh(geom){const vao=gl.createVertexArray();gl.bindVertexArray(vao);const data=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,data);
  const n=geom.verts.length/3,inter=new Float32Array(n*9);for(let i=0;i<n;i++){inter.set(geom.verts.slice(i*3,i*3+3),i*9);inter.set(geom.normals.slice(i*3,i*3+3),i*9+3);inter.set(geom.colors.slice(i*3,i*3+3),i*9+6);}
  gl.bufferData(gl.ARRAY_BUFFER,inter,gl.STATIC_DRAW);
  for(let k=0;k<3;k++){gl.enableVertexAttribArray(k);gl.vertexAttribPointer(k,3,gl.FLOAT,false,36,k*12);}
  const ib=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ib);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(geom.indices),gl.STATIC_DRAW);
  const instance=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,instance);gl.bufferData(gl.ARRAY_BUFFER,80,gl.DYNAMIC_DRAW);
  for(let k=0;k<4;k++){gl.enableVertexAttribArray(k+3);gl.vertexAttribPointer(k+3,4,gl.FLOAT,false,76,k*16);gl.vertexAttribDivisor(k+3,1);}
  gl.enableVertexAttribArray(7);gl.vertexAttribPointer(7,3,gl.FLOAT,false,76,64);gl.vertexAttribDivisor(7,1);
  gl.bindVertexArray(null);return {vao,ib,instance,count:geom.indices.length,instances:0};
}
const rods=makeMesh(cuboidGeometry()),symbols=makeMesh(glyphGeometry()),nodes=makeMesh(pyramidGeometry());
function upload(mesh,instances){mesh.instances=instances.length;const a=new Float32Array(instances.length*19);let p=0;for(const o of instances){a.set(o.matrix,p);p+=16;a.set(o.tint,p);p+=3;}gl.bindBuffer(gl.ARRAY_BUFFER,mesh.instance);gl.bufferData(gl.ARRAY_BUFFER,a,gl.DYNAMIC_DRAW);}
function meshDraw(mesh){if(!mesh.instances)return;gl.bindVertexArray(mesh.vao);gl.drawElementsInstanced(gl.TRIANGLES,mesh.count,gl.UNSIGNED_SHORT,0,mesh.instances);}
const floorVAO=gl.createVertexArray();gl.bindVertexArray(floorVAO);const floorBuf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,floorBuf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-3500,-.045,-3500,3500,-.045,-3500,-3500,-.045,3500,3500,-.045,-3500,3500,-.045,3500,-3500,-.045,3500]),gl.STATIC_DRAW);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,3,gl.FLOAT,false,0,0);gl.bindVertexArray(null);
const hudCanvas=document.createElement('canvas');hudCanvas.width=1024;hudCanvas.height=300;const hc=hudCanvas.getContext('2d');
const hudTexture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,hudTexture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
const hudVAO=gl.createVertexArray();gl.bindVertexArray(hudVAO);const quadBuf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,quadBuf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);gl.bindVertexArray(null);
const world={gidx:4,ops:[],orbit:[],B:null,invB:null,cellX:0,cellZ:0,globalX:0,globalZ:0,dirty:true,latticeOn:true,mosaicOn:true,far:17,near:3,symbols:0,rods:0,nodes:0};
const player={x:0,z:0,yaw:0,pitch:-.06,eyeHeight:1.65,speed:7.4};
let session=null,xrReference=null,prevTime=0,lastXRButtons=new Map(),keyboard=new Set(),dragging=false,prevX=0,prevY=0,hudVisible=true;
function showError(e){ui.error.style.display='block';ui.error.textContent=String(e?.stack||e);console.error(e);}
function makeHUD(){const g=GROUPS[world.gidx];hc.clearRect(0,0,1024,300);hc.fillStyle='rgba(6,26,39,0.82)';hc.beginPath();hc.roundRect(0,0,1010,286,26);hc.fill();hc.strokeStyle='rgba(95,228,214,.7)';hc.lineWidth=3;hc.stroke();hc.fillStyle='#8df1df';hc.font='700 29px system-ui';hc.fillText('SPACEGROUP ATLAS  /  '+g.symbol,32,56);hc.fillStyle='#f1f7ff';hc.font='600 36px system-ui';hc.fillText(g.name,32,112);hc.fillStyle='#a9c3cd';hc.font='26px system-ui';hc.fillText(`No. ${g.id}  ·  ${g.type}  ·  orbit ${world.orbit.length}/cell`,32,159);hc.font='22px system-ui';hc.fillText('Left stick: move    Right stick: turn',32,210);hc.fillText('A/X: next/previous    B/Y: guides',32,244);
  gl.bindTexture(gl.TEXTURE_2D,hudTexture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,hudCanvas);
}
function selectGroup(index){world.gidx=(index+GROUPS.length)%GROUPS.length;const g=GROUPS[world.gidx];world.ops=closure(g.gens);
  if(world.ops.length!==g.order)throw Error(`${g.symbol}: got ${world.ops.length} ops instead of ${g.order}`);
  world.orbit=positiveUnitOrbit(world.ops,[.19,.13,.31]);world.B=basisMatrix(g);world.invB=inv3(world.B);world.dirty=true;ui.group.value=String(world.gidx);ui.orbit.textContent=world.orbit.length;ui.order.textContent=world.ops.length;
  player.x=0;player.z=0;world.cellX=0;world.cellZ=0;world.globalX=0;world.globalZ=0;makeHUD();updateStats();
}
function updateStats(){const g=GROUPS[world.gidx];ui.status.textContent=`${g.symbol}  #${g.id} · ${world.ops.length} operations\n${world.symbols.toLocaleString()} orbit copies · ${world.rods.toLocaleString()} rods\ncell ${world.globalX+world.cellX},${world.globalZ+world.cellZ}`;ui.status.style.whiteSpace='pre-line';}
function getFracXZ(x,z){const v=rVec(world.invB,[x,0,z]);return [v[0],v[2]];}
function push(meshArr,matrix,tint){meshArr.push({matrix,tint});}
function regen(){world.dirty=false;const g=GROUPS[world.gidx],B=world.B,invB=world.invB,R=world.far,N=world.near;
  const rodArr=[],glyphArr=[],nodeArr=[];const seed=[.19,.13,.31];
  const accent=[.4,.94,1],warm=[1,.72,.34],ice=[.54,.77,1];
  for(let i=world.cellX-R;i<=world.cellX+R;i++)for(let j=world.cellZ-R;j<=world.cellZ+R;j++){
    const dist=Math.hypot(i-world.cellX,j-world.cellZ),isNear=dist<=N+0.25;
    if(dist>R+.3)continue;
    for(let k=0;k<3;k++){
      const p=anchorWorld(B,i,j,k),pA=vecAdd(p,g.basis[0]),pB=vecAdd(p,g.basis[1]),pC=vecAdd(p,g.basis[2]);
      const isMain=k===0;
      if(world.latticeOn){
        // Orthogonal frame and intercell connections; subdued educational overlay.
        const tint=dist>N?[.15,.31,.39]:[.27,.52,.57];
        const thin=dist>N?.045:.075;
        push(rodArr,matrixRod(p,pA,thin),tint);push(rodArr,matrixRod(p,pB,thin),tint);push(rodArr,matrixRod(p,pC,thin),tint);
        if(isNear||k===1)push(nodeArr,matBox(p,[.21,.35,.21]),[.48,.81,.78]);
      }else if(isMain)push(nodeArr,matBox(p,[.12,.19,.12]),[.25,.51,.58]);
      if(isNear){
        for(let t=0;t<world.orbit.length;t++){
          const o=world.orbit[t],pos=worldCell(B,i,j,k,o.pos),rw=normalWorldMatrix(B,invB,o.op.r);
          // 4x4 can hold reflections. Cull is disabled so negative determinants draw correctly.
          const s=.77;const matrix=mFromAffine(rw,pos,s);
          push(glyphArr,matrix,t%2?[.94,.88,1]:[1,1,1]);
        }
        if(g.screw){ // Invariant helical chain: four steps, with a final cross-cell step.
          const step=world.orbit.slice().sort((a,b)=>a.pos[1]-b.pos[1]);
          for(let t=0;t<step.length;t++){
            const a=worldCell(B,i,j,k,step[t].pos);
            const b=t<step.length-1?worldCell(B,i,j,k,step[t+1].pos):worldCell(B,i,j,k+1,step[0].pos);
            push(rodArr,matrixRod(a,b,.075),[1,.55,.28]);
          }
        }
      }
    }
  }
  upload(rods,rodArr);upload(symbols,glyphArr);upload(nodes,nodeArr);
  world.rods=rodArr.length;world.symbols=glyphArr.length;world.nodes=nodeArr.length;updateStats();
}
function drawScene(vp,eye){
  const g=GROUPS[world.gidx];const fd=.0019;
  gl.useProgram(floorProgram);gl.uniformMatrix4fv(fu.vp,false,vp);gl.uniform3f(fu.eye,...eye);gl.uniform3f(fu.fog,.018,.060,.085);gl.uniform1f(fu.fd,fd);
  const ib=world.invB;gl.uniform4f(fu.inv,ib[0],ib[2],ib[6],ib[8]);gl.uniform1f(fu.pet,g.petals);gl.uniform1f(fu.guide,world.mosaicOn?1:0);
  gl.bindVertexArray(floorVAO);gl.drawArrays(gl.TRIANGLES,0,6);
  gl.useProgram(meshProgram);gl.uniformMatrix4fv(mu.vp,false,vp);gl.uniform3f(mu.eye,...eye);gl.uniform3f(mu.fog,.018,.060,.085);gl.uniform1f(mu.fd,fd);
  meshDraw(rods);meshDraw(nodes);meshDraw(symbols);
  gl.bindVertexArray(null);
}
function drawHUD(vp,headWorld){if(!hudVisible)return;const model=mMultiply(headWorld,mMultiply(mTranslate(-.42,-.27,-1.75),(()=>{let m=mIdentity();m[0]=.45;m[5]=.13;return m;})()));
  gl.useProgram(uiProgram);gl.uniformMatrix4fv(hu.vp,false,vp);gl.uniformMatrix4fv(hu.model,false,model);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,hudTexture);gl.uniform1i(hu.tex,0);
  gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.disable(gl.DEPTH_TEST);
  gl.bindVertexArray(hudVAO);gl.drawArrays(gl.TRIANGLES,0,6);gl.disable(gl.BLEND);gl.enable(gl.DEPTH_TEST);
}
function resize(){const dpr=Math.min(devicePixelRatio||1,1.7),w=Math.max(2,Math.floor(innerWidth*dpr)),h=Math.max(2,Math.floor(innerHeight*dpr));if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}}
function keyMove(dt,forward,right){let dist=player.speed*dt*(keyboard.has('ShiftLeft')||keyboard.has('ShiftRight')?3.1:1);const l=Math.hypot(forward,right);if(l>1){forward/=l;right/=l;}
  player.x+=(-Math.sin(player.yaw)*forward+Math.cos(player.yaw)*right)*dist;
  player.z+=(-Math.cos(player.yaw)*forward-Math.sin(player.yaw)*right)*dist;
}
function updateCell(){
  const [u,v]=getFracXZ(player.x,player.z),x=Math.floor(u),z=Math.floor(v);
  // Floating origin: keep WebGL float coordinates small while advancing exact
  // integer lattice coordinates indefinitely. Rebase is an invisible lattice translation.
  if(Math.abs(x)>48||Math.abs(z)>48){
    const shift=transformFrac(world.B,[x,0,z]);
    player.x-=shift[0];player.z-=shift[2];
    world.globalX+=x;world.globalZ+=z;world.cellX=0;world.cellZ=0;world.dirty=true;
  }else if(x!==world.cellX||z!==world.cellZ){world.cellX=x;world.cellZ=z;world.dirty=true;}
}
function desktopFrame(now){if(session)return;const dt=clamp((now-prevTime)/1000||0,0,.05);prevTime=now;
  const f=Number(keyboard.has('KeyW')||keyboard.has('ArrowUp'))-Number(keyboard.has('KeyS')||keyboard.has('ArrowDown'));
  const r=Number(keyboard.has('KeyD'))-Number(keyboard.has('KeyA'));
  if(keyboard.has('KeyQ')||keyboard.has('ArrowLeft'))player.yaw+=dt*1.35;
  if(keyboard.has('KeyE')||keyboard.has('ArrowRight'))player.yaw-=dt*1.35;
  if(f||r)keyMove(dt,f,r);
  updateCell();if(world.dirty)regen();resize();gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,canvas.width,canvas.height);gl.clearColor(.018,.06,.085,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
  const worldCam=mMultiply(mTranslate(player.x,player.eyeHeight,player.z),mMultiply(mRotY(player.yaw),mRotX(player.pitch)));
  const vp=mMultiply(mPerspective(1.05,canvas.width/canvas.height,.05,1800),mInvert(worldCam));
  drawScene(vp,[player.x,player.eyeHeight,player.z]);requestAnimationFrame(desktopFrame);
}
function xrRig(){return mMultiply(mTranslate(player.x,0,player.z),mRotY(player.yaw));}
function getHeadWorld(viewerPose){return mMultiply(xrRig(),viewerPose.transform.matrix);}
function turnAroundHead(delta,headTracking){let prev=mMultiply(xrRig(),headTracking),x=prev[12],z=prev[14];player.yaw+=delta;let now=mMultiply(xrRig(),headTracking);player.x+=x-now[12];player.z+=z-now[14];}
function xrInput(frame,pose,dt){const head=mMultiply(xrRig(),pose.transform.matrix);const forward=vecNorm([-head[8],0,-head[10]]),right=vecNorm([head[0],0,head[2]]);
  for(const source of session.inputSources){const pad=source.gamepad;if(!pad)continue;
    const axes=pad.axes;let a=axes.length>=4?axes[axes.length-2]:axes[0]||0,b=axes.length>=4?axes[axes.length-1]:axes[1]||0;
    if(Math.abs(a)<.17)a=0;if(Math.abs(b)<.17)b=0;
    if(source.handedness==='left'){
      const speed=player.speed*dt*(pad.buttons[1]?.pressed?2:1);
      const x=right[0]*a+forward[0]*-b,z=right[2]*a+forward[2]*-b;
      player.x+=x*speed;player.z+=z*speed;
    }
    if(source.handedness==='right'){
      const key='snap-'+source.handedness,old=lastXRButtons.get(key)||false;
      if(Math.abs(a)>.7&&!old)turnAroundHead(-Math.sign(a)*Math.PI/6,pose.transform.matrix);
      lastXRButtons.set(key,Math.abs(a)>.35);
    }
    for(const n of [4,5]){const key=source.handedness+'-'+n,was=lastXRButtons.get(key)||false,is=!!pad.buttons[n]?.pressed;
      if(is&&!was){
        if(n===4)selectGroup(world.gidx+(source.handedness==='right'?1:-1));
        else if(source.handedness==='right'){world.latticeOn=!world.latticeOn;world.dirty=true;ui.grid.checked=world.latticeOn;}
        else {world.mosaicOn=!world.mosaicOn;ui.mosaic.checked=world.mosaicOn;}
      }
      lastXRButtons.set(key,is);
    }
  }
}
function xrFrame(now,frame){if(!session)return;session.requestAnimationFrame(xrFrame);const pose=frame.getViewerPose(xrReference);if(!pose)return;
  const dt=clamp((now-prevTime)/1000||0,0,.05);prevTime=now;xrInput(frame,pose,dt);updateCell();if(world.dirty)regen();
  gl.bindFramebuffer(gl.FRAMEBUFFER,session.renderState.baseLayer.framebuffer);
  gl.clearColor(.018,.06,.085,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
  const rig=xrRig(),headWorld=mMultiply(rig,pose.transform.matrix);
  for(const view of pose.views){const viewport=session.renderState.baseLayer.getViewport(view);gl.viewport(viewport.x,viewport.y,viewport.width,viewport.height);
    const eyeWorld=mMultiply(rig,view.transform.matrix),vp=mMultiply(view.projectionMatrix,mInvert(eyeWorld));
    drawScene(vp,[eyeWorld[12],eyeWorld[13],eyeWorld[14]]);drawHUD(vp,headWorld);
  }
}
async function enterVR(){if(session){await session.end();return;}
  if(!navigator.xr){alert('WebXR is unavailable. Open the hosted HTTPS link using Meta Quest Browser.');return;}
  try{await gl.makeXRCompatible();session=await navigator.xr.requestSession('immersive-vr',{optionalFeatures:['local-floor','bounded-floor']});
    session.addEventListener('end',()=>{session=null;xrReference=null;lastXRButtons.clear();ui.enter.textContent='ENTER VR ON QUEST';document.getElementById('panel').style.display='';ui.status.style.display='';document.getElementById('hint').style.display='';prevTime=0;requestAnimationFrame(desktopFrame);});
    session.updateRenderState({baseLayer:new XRWebGLLayer(session,gl,{alpha:false,depth:true,stencil:false,antialias:true,framebufferScaleFactor:.85})});
    try{xrReference=await session.requestReferenceSpace('local-floor');}catch(_){xrReference=await session.requestReferenceSpace('local');}
    ui.enter.textContent='EXIT VR';document.getElementById('panel').style.display='none';ui.status.style.display='none';document.getElementById('hint').style.display='none';prevTime=0;session.requestAnimationFrame(xrFrame);
  }catch(err){session=null;showError(err);}
}
function init(){
  GROUPS.forEach((g,i)=>{const opt=document.createElement('option');opt.value=i;opt.textContent=`#${g.id}  ${g.symbol} — ${g.name}`;ui.group.appendChild(opt);});
  ui.group.addEventListener('change',()=>selectGroup(+ui.group.value));
  ui.distance.addEventListener('input',()=>{world.far=+ui.distance.value;document.getElementById('distanceText').textContent=world.far+' cells';world.dirty=true;});
  ui.detail.addEventListener('input',()=>{world.near=+ui.detail.value;document.getElementById('detailText').textContent=world.near+' cells';world.dirty=true;});
  ui.grid.addEventListener('change',()=>{world.latticeOn=ui.grid.checked;world.dirty=true;});
  ui.mosaic.addEventListener('change',()=>{world.mosaicOn=ui.mosaic.checked;});
  ui.enter.addEventListener('click',enterVR);
  document.getElementById('collapse').addEventListener('click',()=>{const p=document.getElementById('panel');p.classList.toggle('collapsed');document.getElementById('collapse').textContent=p.classList.contains('collapsed')?'▾':'▴';});
  window.addEventListener('keydown',e=>{if(e.target.tagName==='SELECT'||e.target.tagName==='INPUT')return;keyboard.add(e.code);if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();if(/^Digit[0-9]$/.test(e.code)){const n=+e.code.slice(5);selectGroup(n===0?9:n-1);}if(e.code==='BracketRight')selectGroup(world.gidx+1);if(e.code==='BracketLeft')selectGroup(world.gidx-1);});
  window.addEventListener('keyup',e=>keyboard.delete(e.code));
  window.addEventListener('blur',()=>{keyboard.clear();dragging=false;});
  canvas.addEventListener('pointerdown',e=>{dragging=true;prevX=e.clientX;prevY=e.clientY;canvas.setPointerCapture(e.pointerId);});
  canvas.addEventListener('pointermove',e=>{if(!dragging)return;player.yaw-=(e.clientX-prevX)*.004;player.pitch=clamp(player.pitch-(e.clientY-prevY)*.003,-1.38,1.38);prevX=e.clientX;prevY=e.clientY;});
  canvas.addEventListener('pointerup',()=>dragging=false);
  canvas.addEventListener('pointercancel',()=>dragging=false);
  gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.disable(gl.CULL_FACE);gl.enable(gl.DITHER);
  selectGroup(4);regen();resize();requestAnimationFrame(desktopFrame);
  if(!window.isSecureContext)document.getElementById('secureHint').textContent='Desktop works via HTTP. On Quest, publish this folder to an HTTPS host before entering VR.';
  if(navigator.xr){navigator.xr.isSessionSupported('immersive-vr').then(ok=>{ui.enter.textContent=ok?'ENTER IMMERSIVE VR':'VR REQUIRES QUEST BROWSER';}).catch(()=>{});}
  console.info('Spacegroup Atlas: WebGL2 renderer initialized; groups',GROUPS.length);
}
try{init();}catch(e){showError(e);}
})();
