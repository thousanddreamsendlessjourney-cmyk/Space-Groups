from pathlib import Path
p=Path(__file__).resolve().parents[1]/'main.js';s=p.read_text()
def rep(a,b):
 global s
 assert a in s,('MISSING',a[:150])
 s=s.replace(a,b)
def swap_between(start,end,body):
 global s
 a=s.index(start);b=s.index(end,a)
 s=s[:a]+body+s[b:]
rep('/* Spacegroup Atlas 0.6', '/* Spacegroup Atlas 0.7')
rep('occupancy:.25,scaleMotif:true','occupancy:.25,scaleMotif:false')
rep('followCenter:[0,0,0],instances:', 'followCenter:[0,0,0],fadeAnchor:null,instances:')
# remove no-longer-relevant contrast shader uniform
rep('uniform sampler3D uVolume;uniform vec3 uOrigin;uniform float uPeriod,uCoverageThreshold;', 'uniform sampler3D uVolume;uniform vec3 uOrigin;uniform float uPeriod;')
rep('float contrast=mix(.65,1.65,uCoverageThreshold);','float contrast=1.15;')
rep('uniform sampler3D uVolume;uniform vec3 uOrigin,uEye;uniform float uPeriod,uThreshold;uniform mat4 uVP;', 'uniform sampler3D uVolume;uniform vec3 uOrigin,uEye;uniform float uPeriod;uniform mat4 uVP;')
rep('mix(.65,1.65,uThreshold)', '1.15')
# visually grounded tracked floor: small subtle grid in real-world meters, avoid cloud fade
swap_between('const floorFS=`#version 300 es','const exteriorVS=', '''const floorFS=`#version 300 es
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
''')
# A special sheet fragment samples the original images with planar coordinates in physical meters.
# This removes resets at cut polygon boundaries; premultiplied alpha avoids black edges.
rep('void main(){vec4 tex=uIsFill==1?texture(uVolume,(vPos-uOrigin)/uPeriod):uTextured==1?texture(uTex,uIsFill==2?invariantUV(vUV):vUV):vec4(1.);', '''void main(){
  vec3 an=abs(normalize(vNormal));
  // World-aligned planar coordinates are continuous across independently clipped
  // fundamental-domain polygons and preserve a fixed physical pattern scale.
  vec2 sheetUV=an.x>an.y&&an.x>an.z?vPos.yz/.72:(an.y>an.z?vPos.xz/.72:vPos.xy/.72);
  // The finite-group panel stabilizer has been incorporated in the projection.
  vec4 tex=uIsFill==1?texture(uVolume,(vPos-uOrigin)/uPeriod):uTextured==1?texture(uTex,uIsFill==2?sheetUV:vUV):vec4(1.);''')
rep('outColor=vec4(color,uIsFill==2?tex.a*uCoverageThreshold*fade:(uIsFill==1?tex.a*uCoverageThreshold*fade:(uFadeStyle==1?fade:1.)));','''// Kenney textures were uploaded premultiplied. ONE / ONE_MINUS_SRC_ALPHA
 // prevents dark RGB under transparent edge pixels from producing black seams.
 if(uIsFill==2){float a=uCoverageThreshold*fade;outColor=vec4(color*a,tex.a*a);}
 else outColor=vec4(color,uIsFill==1?tex.a*uCoverageThreshold*fade:(uFadeStyle==1?fade:1.));''')
rep('let rods=mesh(boxGeom()),panels=mesh(panelGeom()),exteriorMesh=mesh(boxGeom())', '''let rods=mesh(boxGeom()),panels=mesh(panelGeom()),sheetMeshes=[],exteriorMesh=mesh(boxGeom())''')
rep('gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texImage2D','gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,true);gl.texImage2D')
rep('const VOL_N=64,volumeHist=', 'const VOL_N=128,volumeHist=')
# Fast mathematically exact symmetrization using generator unions on high-res toroidal voxel grid.
swap_between('const canonicalCache=new Map();','function updateCoverageThreshold(){', '''const canonicalCache=new Map();
function canonicalMap(g){
 if(canonicalCache.has(g))return canonicalCache.get(g);
 const N=VOL_N,count=N*N*N,parent=new Uint32Array(count),gens=GROUPS[g].gens;
 for(let i=0;i<count;i++)parent[i]=i;
 const root=a=>{while(parent[a]!==a){parent[a]=parent[parent[a]];a=parent[a];}return a;};
 // The three generators suffice to connect every orbit. Linking always to the
 // smallest index produces a deterministic canonical voxel without O(|G|N³).
 for(const operation of gens){
  const r=operation.r,t=operation.t;
  const axes=[],signs=[],offsets=[];
  for(let row=0;row<3;row++){
   const a=r.slice(row*3,row*3+3).findIndex(v=>v!==0);
   axes.push(a);signs.push(r[row*3+a]);offsets.push(Math.round(t[row]*N));
  }
  const wrap=k=>(k+N)%N;
  for(let z=0;z<N;z++)for(let y=0;y<N;y++)for(let x=0;x<N;x++){
   const xyz=[x,y,z],out=new Array(3);
   for(let k=0;k<3;k++)out[k]=wrap((signs[k]>0?xyz[axes[k]]:N-1-xyz[axes[k]])+offsets[k]);
   const a=x+N*(y+N*z),b=out[0]+N*(out[1]+N*out[2]);
   let ra=root(a),rb=root(b);
   if(ra!==rb){if(ra<rb)parent[rb]=ra;else parent[ra]=rb;}
  }
 }
 for(let i=0;i<count;i++)parent[i]=root(i);
 canonicalCache.clear();canonicalCache.set(g,parent);return parent;
}
function rebuildVolume(){if(loading)return;
 const N=VOL_N;
 if(!volumeDirty||state.representation!=='slice')return;
 const source=solidVolumes[state.volume];
 if(!source)throw Error('Missing solid texture '+state.volume);
 const vox=new Uint8Array(source.length),map=canonicalMap(state.group);
 volumeHist.fill(0);
 for(let i=0;i<map.length;i++){
  const a=i*4,b=map[i]*4;
  vox[a]=source[b];vox[a+1]=source[b+1];vox[a+2]=source[b+2];vox[a+3]=source[b+3];
  volumeHist[vox[a+3]]++;
 }
 volumeTexture=upload3D(volumeTexture,vox);volumeDirty=false;
}
''')
# use scale-safe position differing from unrestrained origin for visible toggle (opt for exotic elements)
rep("state.seedFrac=[.21,.34,.27];resetSeed();", "state.seedFrac=state.safety?[.211,.347,.273]:[0,0,0];resetSeed();")
rep('function resetSeed(){grab=null;', '''function resetSeed(){state.seedFrac=state.safety?[.211,.347,.273]:[0,0,0];grab=null;''')
# Replace regen to use translation-cell-based sheet meshes, full internal Dirichlet faces
swap_between('function regen(){if(loading)return;','function syncStats(){', '''function regen(){if(loading)return;state.dirty=false;
const motifRecords=[],rodRecords=[],sheetRecords=[],group=GROUPS[state.group],L=state.period,R=state.radius;
if(state.representation==='slice'&&volumeDirty)rebuildVolume();
const camera=trackHead?Array.from(trackHead.slice(12,15)):[player.x,player.y+1.64,player.z];
if(!state.fadeAnchor)state.fadeAnchor=state.origin.map(v=>v+.5*L);
const fadePoint=state.fadeViewer?camera:state.fadeAnchor;
const poolCenter=fadePoint.map((v,i)=>Math.floor((v-state.origin[i])/L));state.followCenter=poolCenter;
// Include a one-cell halo so a cutoff at radius=1 is still fully represented.
const poolR=R+1,cells=[];
for(let x=-poolR;x<=poolR;x++)for(let y=-poolR;y<=poolR;y++)for(let z=-poolR;z<=poolR;z++){
 const tax=Math.abs(x)+Math.abs(y)+Math.abs(z);if(tax>poolR+1)continue;
 const c=[x+poolCenter[0],y+poolCenter[1],z+poolCenter[2]];cells.push({c,tax});}
for(const {c,tax} of cells){
 if(state.grid&&tax<=R){for(let a=0;a<3;a++){
  const p=add(state.origin,scale(c,L)),next=p.slice();next[a]+=L;
  rodRecords.push(rec(rod(p,next,L*.005),[.31,.33,.36],c));}}
 if(state.representation==='motif')for(let k=0;k<group.ops.length;k++)
  motifRecords.push(rec(cellOp(c,group.ops[k]),[1,1,1],c,{opIndex:k,op:group.ops[k]}));
 if(state.representation==='sheet')
  sheetRecords.push(rec(mm(mt(state.origin[0]+c[0]*L,state.origin[1]+c[1]*L,state.origin[2]+c[2]*L),ms(L)),[1,1,1],c));
}
state.instances=motifRecords;state.effectiveRadius=R;
state.sceneCount=state.representation==='motif'?motifRecords.length:state.representation==='sheet'?sheetRecords.length:0;
for(const m of Object.values(motifs))upload(m,motifRecords);
if(state.representation==='sheet'&&sheetMeshes[state.group])upload(sheetMeshes[state.group],sheetRecords);
upload(rods,rodRecords);syncStats();}
''')
rep('Textured lattice walls', 'Full fundamental-face orbit')
# UI no slice contrast; section constant .5
rep("$('coverageLabel').textContent=state.representation==='sheet'?'Wall opacity':'Section / exterior contrast';", "$('coverageLabel').textContent='Wall opacity';")
rep("$('coverageRow').hidden=state.representation==='motif';", "$('coverageRow').hidden=state.representation!=='sheet';")
# scale around immutable eye and maintain physical size of motif by default to produce visual change
swap_between(" if(k==='period'){"," if(k==='representation'&&v!=='motif')", ''' if(k==='period'){
  v=clamp(Number(v),.10,2.5);if(!Number.isFinite(v))return;
  const old=state.period,head=trackHead||mt(player.x,player.y+1.64,player.z);
  const eye=[head[12],head[13],head[14]],ratio=v/old;
  // The CURRENT VIEWER COORDINATE is a fixed point of the scaling.
  // No headset or locomotion transform is changed, including in immersive VR.
  for(let i=0;i<3;i++){
   state.origin[i]=eye[i]+ratio*(state.origin[i]-eye[i]);
   state.seed[12+i]=eye[i]+ratio*(state.seed[12+i]-eye[i]);
  }
  if(state.scaleMotif)for(let i=0;i<3;i++)for(let j=0;j<3;j++)state.seed[j*4+i]*=ratio;
  // Hold the stationary fade specimen anchored in physical space while scaling.
  state.period=v;state.dirty=true;syncUI();return;
 }
''')
rep("if(k==='motif'||k==='occupancy'||k==='safety')if(!grab)resetSeed();", "if(k==='motif'||k==='occupancy'||k==='safety')if(!grab)resetSeed();")
rep("if(k==='sliceFollow'&&v)fixedSectionPose=null;", "if(k==='sliceFollow'&&v)fixedSectionPose=null;\n if(k==='fadeViewer'&&!v){const head=trackHead||mt(player.x,player.y+1.64,player.z);state.fadeAnchor=[head[12],head[13],head[14]];}")
rep("if(k==='radius'){state.quality='custom';if(state.fadeStart>state.radius)state.fadeStart=state.radius;}","if(k==='radius'){state.quality='custom';if(state.fadeStart>state.radius)state.fadeStart=state.radius;}")
# renderer special mesh UV alpha premultiplication / do not use contrast for 3D mode
rep("const c=state.fadeViewer?head.map((v,i)=>(v-state.origin[i])/state.period):[0,0,0];", "const c=(state.fadeViewer?head:(state.fadeAnchor||state.origin)).map((v,i)=>(v-state.origin[i])/state.period);")
rep("if(state.representation==='sheet'&&sheetRecordsSorted.length>1){", "if(false&&state.representation==='sheet'&&sheetRecordsSorted.length>1){")
rep("  const sym=[0,2,1,4,4,4,3,4][state.group];", "  const sym=0;")
rep('gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false);\n  drawOne(panels,mid(),texture[state.family+state.pattern],true,2,true);', '''gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false);
  drawOne(sheetMeshes[state.group],mid(),texture[state.family+state.pattern],true,2,true);''')
rep('gl.uniform3fv(sU.origin,state.origin);gl.uniform1f(sU.period,state.period);gl.uniform1f(sU.cover,volumeThreshold);', 'gl.uniform3fv(sU.origin,state.origin);gl.uniform1f(sU.period,state.period);')
rep('gl.uniform1f(eU.period,L);gl.uniform1f(eU.threshold,volumeThreshold);','gl.uniform1f(eU.period,L);')
rep('const y=session?player.y-.018:player.y-.018;', 'const y=-.018; // Local-floor coordinates: never track joystick flying or crouching.')
rep('const far=Math.max(10,state.period*(state.radius+3)*2.2),near=far*.67;', 'const far=Math.max(8,state.period*(state.radius+3)*2.6),near=far*.90;')
# shader separate world-relative floor coordinates from fog; UI fade modes? fine
# consistent follow anchor tracking for every movement beyond cell crossing
rep("if(state.fadeViewer){const next=head.slice(12,15).map((v,i)=>Math.floor((v-state.origin[i])/state.period));", "if(state.fadeViewer){const next=head.slice(12,15).map((v,i)=>Math.floor((v-state.origin[i])/state.period));")
# remove panel UV symmetry outdated comment
rep("  // Render the original Kenney PNG on the actual orbit of each full cell face.\n  // This preserves the image's full resolution and native alpha, unlike the\n  // obsolete 48^3 sampled field (which also failed texture upload in v0.5).", "  // Draw the Voronoi/Dirichlet fundamental-domain face network in every cell,\n  // including oblique internal faces, with continuous planar PNG coordinates.")
# dynamic MENU surface - keep index order
rep("'Sheet opacity / section contrast'", "'Wall opacity'")
rep("case 10:return Math.round(state.coverage*100)+'%'", "case 10:return state.representation==='sheet'?Math.round(state.coverage*100)+'%':'n/a'")
rep("case 7:setVal('radius',clamp(state.radius+direction,2,8));", "case 7:setVal('radius',clamp(state.radius+direction,1,8));")
rep("case 10:setVal('coverage',clamp(state.coverage+direction*.1,.1,1));break;", "case 10:if(state.representation==='sheet')setVal('coverage',clamp(state.coverage+direction*.1,.1,1));break;")
rep("Room-scale symmetry lab  ·  0.6", "Room-scale symmetry lab  ·  0.7")
# Reset fade center should reset when explicit reset.
rep("state.origin=[0,1.38,-1.7];resetSeed();", "state.origin=[0,1.38,-1.7];state.fadeAnchor=null;resetSeed();")
# Loaded geometry from .js defined before main.js
rep("function loadImg(file){", "function loadImg(file){")
rep("loading=false;changeGroup(state.group);syncUI();", '''const faceData=window.SPACEGROUP_FUNDAMENTAL_FACES;
if(!Array.isArray(faceData)||faceData.length!==GROUPS.length)throw Error('Missing fundamental-face geometry');
for(const d of faceData)sheetMeshes.push(mesh({v:new Float32Array(d.v),i:new Uint16Array(d.i)}));
loading=false;changeGroup(state.group);syncUI();''')
# Control debug instrumentation for QA
rep('get sheetCount(){return panels.instances}', 'get sheetCount(){return sheetMeshes[state.group]?.instances||0}')
rep('get canonicalCache(){return canonicalCache}', 'get canonicalCache(){return canonicalCache},get faceStats(){return window.SPACEGROUP_FUNDAMENTAL_FACES.map(x=>({facets:x.facets,triangles:x.i.length/3}))}')
# avoid black artifacts on 2D textures: high quality PNG pre-multiplied.
# zoom motif scaling disabled by default to avoid mathematical similarity invariance.
p.write_text(s)
print('Patched main.js',len(s))
