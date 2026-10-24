from pathlib import Path
p=Path(__file__).resolve().parents[1]/'main.js'
s=p.read_text()
def swap(old,new):
 global s
 assert old in s, old[:120]
 s=s.replace(old,new)
def section(start,end,new):
 global s
 a=s.index(start);b=s.index(end,a)
 s=s[:a]+new+'\n'+s[b:]

swap('Spacegroup Atlas 0.7','Spacegroup Atlas 0.8')
section('const GROUPS=[','for(const g of GROUPS)', '''const GROUPS=(window.SPACEGROUP_ALL||[]).map(d=>({
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
''')
swap('for(const g of GROUPS){g.ops=closure(g.gens);if(g.ops.length!==g.order)throw Error(\'Incorrect closure \'+g.symbol+\': \'+g.ops.length);}', '''// Generator closures are independently verified in tools/build_group_database.py.
for(const g of GROUPS)if(g.ops.length!==g.order)throw Error('Bad order for '+g.symbol);''')
swap("const state={group:2,", "const state={group:5,")
swap('occupancy:.25,scaleMotif:false','occupancy:.16,scaleMotif:false')
swap('state.scaleMotif)for(let i=0;i<3;i++)for(let j=0;j<3;j++)state.seed[j*4+i]*=ratio;', 'false){}') if False else None
# Coordinate-system shaders: all positions, normals and volume sampling use the selected lattice.
swap('uniform mat4 uVP,uSeed;uniform vec3 uViewerCell,uOrigin;', 'uniform mat4 uVP,uSeed;uniform mat3 uInvBasis;uniform vec3 uViewerCell,uOrigin;')
swap('vNormal=normalize(mat3(model)*aNormal);','vNormal=normalize(transpose(inverse(mat3(model)))*aNormal);')
swap('vec3 fractional=(originOfCopy-uOrigin)/uPeriod;', 'vec3 fractional=uInvBasis*(originOfCopy-uOrigin)/uPeriod;')
swap('uniform int uTextured,uFadeStyle,uIsFill,uPanelSym,uGroup;uniform float uCoverageThreshold,uPeriod;uniform vec3 uLight,uOrigin;', 'uniform int uTextured,uFadeStyle,uIsFill,uPanelSym,uGroup;uniform mat3 uInvBasis;uniform float uCoverageThreshold,uPeriod;uniform vec3 uLight,uOrigin;')
swap('vec3 c=canonicalPosition(fract((vPos-uOrigin)/uPeriod));','vec3 c=fract(uInvBasis*(vPos-uOrigin)/uPeriod);')
swap('vec2 sheetUV=vec2(c.x+.37*c.z,c.y+.53*c.z)*tileCount;', 'vec2 sheetUV=vec2(c.x+c.z,c.y+c.z)*tileCount;')
swap('texture(uVolume,(vPos-uOrigin)/uPeriod)', 'texture(uVolume,uInvBasis*(vPos-uOrigin)/uPeriod)')
swap('in vec3 vPos;uniform sampler3D uVolume;uniform vec3 uOrigin;uniform float uPeriod;', 'in vec3 vPos;uniform sampler3D uVolume;uniform vec3 uOrigin;uniform mat3 uInvBasis;uniform float uPeriod;')
swap('in vec3 vWorld;uniform sampler3D uVolume;uniform vec3 uOrigin,uEye;uniform float uPeriod;uniform mat4 uVP;', 'in vec3 vWorld;uniform sampler3D uVolume;uniform vec3 uOrigin,uEye;uniform mat3 uInvBasis;uniform float uPeriod;uniform mat4 uVP;')
swap('vec3 f=(vWorld-uOrigin)/uPeriod;', 'vec3 f=uInvBasis*(vWorld-uOrigin)/uPeriod;')
swap("group:un(meshShader,'uGroup')", "group:un(meshShader,'uGroup'),basisInv:un(meshShader,'uInvBasis'),basisInvV:un(meshShader,'uInvBasis')")
swap("volume:un(sliceShader,'uVolume')", "volume:un(sliceShader,'uVolume'),basisInv:un(sliceShader,'uInvBasis')")
swap("period:un(exteriorShader,'uPeriod')", "period:un(exteriorShader,'uPeriod'),basisInv:un(exteriorShader,'uInvBasis')")
swap('const VOL_N=128,volumeHist', 'const VOL_N=144,SOURCE_VOL_N=128,volumeHist')
swap('if(raw.length!==VOL_N**3*4)', 'if(raw.length!==SOURCE_VOL_N**3*4)')
section('function canonicalMap(g){','function rebuildVolume()', '''function canonicalMap(g){
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
}''')
# source 128 cubed baked samples, target 144 cubed symmetrized
section('function rebuildVolume(){','function updateCoverageThreshold()', '''function rebuildVolume(){if(loading||!volumeDirty||state.representation!=='slice')return;
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
}''')
section('function changeGroup(i){','function initialPose()', '''function safeCrop(){const n=GROUPS[state.group].order;
 return n>96?2:n>48?3:n>24?4:n>8?5:6;}
function changeGroup(i){
 state.group=(i+GROUPS.length)%GROUPS.length;volumeDirty=true;
 if(state.quality==='safe'||state.quality==='balanced'){
  const r=safeCrop()+(state.quality==='balanced'?1:0);
  state.radius=r;state.fadeStart=Math.max(0,r-2);
 }
 state.seedFrac=state.safety?[.211,.347,.273]:[0,0,0];resetSeed();
 state.dirty=true;syncUI();notify('#'+GROUPS[state.group].id+' '+GROUPS[state.group].symbol+' · '+GROUPS[state.group].system);
}''')
swap("const p=state.period,o=state.origin;return mt(o[0]+p*state.seedFrac[0],o[1]+p*state.seedFrac[1],o[2]+p*state.seedFrac[2]);", "return mt(...cellPosition(state.seedFrac));")
swap('const d=len(sub(q,p));if(d>1e-5)min=Math.min(min,d);', 'const d=len(latticeVector(sub(q,p)));if(d>1e-5)min=Math.min(min,d);')
swap('const desired=state.period*state.occupancy;return state.safety?Math.min(desired,Math.max(.01,state.period*(safeSize()*.48/(rad||.8)))):desired;', 'const desired=state.occupancy;return state.safety?Math.min(desired,Math.max(.01,safeSize()*.48/(rad||.8))):desired;')
section('function cellOp(c,o){','function regen()', '''function cellOp(c,o){
 const g=GROUPS[state.group],B=g.basis,inv=g.basisInv;
 const R=rMult(rMult(B,o.r),inv);
 const t=add(state.origin,latticeVector(add(c,o.t)));
 return affine(R,sub(t,rV(R,state.origin)));
}''')
swap('state.fadeAnchor=state.origin.map(v=>v+.5*L);', 'state.fadeAnchor=cellPosition([.5,.5,.5]);')
swap('fadePoint.map((v,i)=>Math.floor((v-state.origin[i])/L))', 'worldFrac(fadePoint).map(Math.floor)')
swap('const p=add(state.origin,scale(c,L)),next=p.slice();next[a]+=L;', 'const p=cellPosition(c),next=cellPosition(c.map((x,k)=>x+(k===a?1:0)));')
swap('sheetRecords.push(rec(mm(mt(state.origin[0]+c[0]*L,state.origin[1]+c[1]*L,state.origin[2]+c[2]*L),ms(L)),[1,1,1],c));', 'sheetRecords.push(rec(mm(mt(...cellPosition(c)),cellBasis()),[1,1,1],c));')
# Modify loading 230 meshes to lazily loaded, cap GPU geometry caches
swap('if(!Array.isArray(faceData)||faceData.length!==GROUPS.length)throw Error(\'Missing fundamental-face geometry\');\nfor(const d of faceData)sheetMeshes.push(mesh({v:new Float32Array(d.v),i:new Uint16Array(d.i)}));', '''if(!Array.isArray(faceData)||faceData.length!==GROUPS.length)throw Error('Missing complete fundamental-face geometry');
sheetMeshes=new Array(GROUPS.length).fill(null);''')
swap('function upload(obj,arr){', '''let lastSheetGroups=[];
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
function upload(obj,arr){''')
swap('gl.drawElementsInstanced(gl.TRIANGLES,obj.count,gl.UNSIGNED_SHORT,0,obj.instances);', 'gl.drawElementsInstanced(gl.TRIANGLES,obj.count,obj.indexType||gl.UNSIGNED_SHORT,0,obj.instances);')
swap("if(state.representation==='sheet'&&sheetMeshes[state.group]){sheetRecordsSorted=sheetRecords;lastSheetEye=null;upload(sheetMeshes[state.group],sheetRecords);}", "if(state.representation==='sheet'){sheetRecordsSorted=sheetRecords;lastSheetEye=null;upload(ensureSheetMesh(state.group),sheetRecords);}")
# Debug robust book state and slider state, physically fixed floor
section(" if(k==='period'){", " if(k==='representation'&&v!=='motif')", ''' if(k==='period'){
  v=clamp(Number(v),.10,2.5);if(!Number.isFinite(v))return;
  const old=state.period,ratio=v/old;
  // Use the center of the CURRENT cell as a fixed point. The room-scale
  // viewer and XR floor are never transformed. Only crystal geometry moves.
  const head=trackHead||mt(player.x,player.y+1.64,player.z);
  const eye=[head[12],head[13],head[14]];
  const oldCoords=worldFrac(eye);
  const cellCenter=cellPosition(oldCoords.map(x=>Math.floor(x)+.5));
  state.origin=add(cellCenter,scale(sub(state.origin,cellCenter),ratio));
  // Keep the seed's fractional position but NEVER scale its orientation or size.
  const seedAt=add(cellCenter,scale(sub(point(state.seed,[0,0,0]),cellCenter),ratio));
  state.seed[12]=seedAt[0];state.seed[13]=seedAt[1];state.seed[14]=seedAt[2];
  state.period=v;state.dirty=true;syncUI();return;
 }''')
swap("const safe=state.group===7?4:state.group===6?5:6;", "const safe=safeCrop();")
swap("if(k==='motif'||k==='occupancy'||k==='safety')", "if(k==='motif'||k==='occupancy'||k==='safety')")
swap("const r=state.period*state.occupancy*.85;", "const r=state.occupancy*.85;")
swap("const g=GROUPS[state.group],p=state.seed.slice(12,15).map((v,i)=>(v-state.origin[i])/state.period);", "const g=GROUPS[state.group],p=worldFrac([state.seed[12],state.seed[13],state.seed[14]]);")
swap('const desired=add(state.origin,scale(p,state.period));','const desired=cellPosition(p);')
swap("const d=sub(target,desired);state.origin=add(state.origin,d);", "const d=sub(target,desired);state.origin=add(state.origin,d);")
# Visual materials and floor
swap('const L=state.period,base=state.origin;\n const box=mm(mt(base[0]+.5*L,base[1]+.5*L,base[2]+.5*L),ms(L));', 'const L=state.period,base=state.origin;\n const box=mm(mt(...cellPosition([.5,.5,.5])),cellBasis());')
swap('const c=(state.fadeViewer?head:(state.fadeAnchor||state.origin)).map((v,i)=>(v-state.origin[i])/state.period);', 'const c=worldFrac(state.fadeViewer?head:(state.fadeAnchor||state.origin));')
swap("gl.uniform3fv(mU.viewer,c);", "gl.uniformMatrix3fv(mU.basisInv,false,new Float32Array([GROUPS[state.group].basisInv[0],GROUPS[state.group].basisInv[3],GROUPS[state.group].basisInv[6],GROUPS[state.group].basisInv[1],GROUPS[state.group].basisInv[4],GROUPS[state.group].basisInv[7],GROUPS[state.group].basisInv[2],GROUPS[state.group].basisInv[5],GROUPS[state.group].basisInv[8]]));gl.uniform3fv(mU.viewer,c);")
# shared helper upload inverse basis to shaders
swap('function setupMaterial(vp,head,mode){', '''function gpuInverseBasis(loc){const b=GROUPS[state.group].basisInv;
 gl.uniformMatrix3fv(loc,false,new Float32Array([b[0],b[3],b[6],b[1],b[4],b[7],b[2],b[5],b[8]]));}
function setupMaterial(vp,head,mode){''')
swap("gl.uniformMatrix3fv(mU.basisInv,false,new Float32Array([GROUPS[state.group].basisInv[0],GROUPS[state.group].basisInv[3],GROUPS[state.group].basisInv[6],GROUPS[state.group].basisInv[1],GROUPS[state.group].basisInv[4],GROUPS[state.group].basisInv[7],GROUPS[state.group].basisInv[2],GROUPS[state.group].basisInv[5],GROUPS[state.group].basisInv[8]]));gl.uniform3fv(mU.viewer,c);", "gpuInverseBasis(mU.basisInv);gl.uniform3fv(mU.viewer,c);")
swap('gl.uniform3fv(sU.origin,state.origin);gl.uniform1f(sU.period,state.period);', 'gl.uniform3fv(sU.origin,state.origin);gpuInverseBasis(sU.basisInv);gl.uniform1f(sU.period,state.period);')
swap('gl.uniform3fv(eU.origin,base);gl.uniform3f(eU.eye,head[12],head[13],head[14]);', 'gl.uniform3fv(eU.origin,base);gpuInverseBasis(eU.basisInv);gl.uniform3f(eU.eye,head[12],head[13],head[14]);')
swap('const next=head.slice(12,15).map((v,i)=>Math.floor((v-state.origin[i])/state.period));', 'const next=worldFrac(head.slice(12,15)).map(Math.floor);')
swap("const f=state.animPhase,L=state.period,center=state.origin;", "const f=state.animPhase,L=state.period,center=state.origin;")
# don't distort generators under more complex noncubic ops; just suppress unsupported animations.
swap("if(!generator){state.demoTransforms=null;return;}", "if(!generator||!['tetragonal','cubic'].includes(group.system)){state.demoTransforms=null;return;}")
# Rework synced labels and menu value
swap("$('occupancyValue').textContent=Math.round(state.occupancy*100)+'% of cell';", "$('occupancyValue').textContent=Math.round(state.occupancy*100)+' cm';")
swap("case 9:return Math.round(state.occupancy*100)+'%';", "case 9:return Math.round(state.occupancy*100)+' cm';")
swap("case 9:setVal('occupancy',clamp((Math.round(state.occupancy*100)+direction*2)/100,.05,.35));break;", "case 9:setVal('occupancy',clamp((Math.round(state.occupancy*100)+direction*2)/100,.03,.75));break;")
swap("occupancy:v=>setVal('occupancy',+v/100)", "occupancy:v=>setVal('occupancy',+v/100)")
# group selection category filtering, text search desktop; one extra category row in XR
section('function wire(){GROUPS.forEach','for(const [name,fn] of Object.entries', '''function rebuildGroupList(){
 const term=($('groupSearch')?.value||'').trim().toLowerCase();
 const system=$('crystalSystem')?.value||'all';
 const select=$('group'),old=String(state.group);
 select.replaceChildren();
 const buckets={};
 for(let i=0;i<GROUPS.length;i++){
  const g=GROUPS[i],text='#'+g.id+' '+g.symbol+' '+g.compact+' '+g.hall;
  if(system!=='all'&&g.system!==system)continue;
  if(term&&!text.toLowerCase().includes(term)&&!String(g.id).includes(term))continue;
  if(!buckets[g.system]){
   const o=document.createElement('optgroup');o.label=g.system[0].toUpperCase()+g.system.slice(1);
   select.appendChild(o);buckets[g.system]=o;
  }
  const opt=document.createElement('option');opt.value=i;
  opt.textContent='#'+g.id+'  '+g.symbol+'   · '+g.order+' ops';buckets[g.system].appendChild(opt);
 }
 if(!select.querySelector('option[value="'+old+'"]')){
  const opt=document.createElement('option');opt.value=old;opt.textContent='#'+GROUPS[state.group].id+' '+GROUPS[state.group].symbol+'  (currently selected)';
  select.prepend(opt);
 }
 select.value=old;
 $('groupResultCount').textContent=select.querySelectorAll('option').length+' groups';
}
function systemStep(d){
 let k=CRYSTAL_SYSTEMS.indexOf(GROUPS[state.group].system);
 k=(k+d+7)%7;
 const i=GROUPS.findIndex(g=>g.system===CRYSTAL_SYSTEMS[k]);
 changeGroup(i);
 const control=$('crystalSystem');if(control)control.value=CRYSTAL_SYSTEMS[k];
 rebuildGroupList();
}
function cycleWithinSystem(d){
 const system=GROUPS[state.group].system,opts=GROUPS.map((g,i)=>g.system===system?i:-1).filter(i=>i>=0);
 const k=opts.indexOf(state.group);changeGroup(opts[(k+d+opts.length)%opts.length]);
}
function wire(){
 for(const system of CRYSTAL_SYSTEMS){const opt=document.createElement('option');opt.value=system;opt.textContent=system[0].toUpperCase()+system.slice(1);$('crystalSystem').appendChild(opt);}
 $('crystalSystem').addEventListener('change',rebuildGroupList);
 $('groupSearch').addEventListener('input',rebuildGroupList);
 $('groupFeatured').addEventListener('change',e=>{if(e.target.value!=='')changeGroup(Number(e.target.value)-1);e.target.value='';});
 rebuildGroupList();
 ''')
swap('function changeGroup(i){\n state.group=', 'function changeGroup(i){\n state.group=')
swap("state.dirty=true;syncUI();notify('#'+GROUPS[state.group].id+' '+GROUPS[state.group].symbol+' · '+GROUPS[state.group].system);", "state.dirty=true;if($('group'))rebuildGroupList();syncUI();notify('#'+GROUPS[state.group].id+' '+GROUPS[state.group].symbol+' · '+GROUPS[state.group].system);")
swap("const MENU=['Group'", "const MENU=['Crystal system','Group'")
swap("function menuValue(k){switch(k){", "function menuValue(k){if(k===0)return GROUPS[state.group].system;k--;switch(k){")
swap("function menuChange(direction=1){const k=state.menuRow;", "function menuChange(direction=1){if(state.menuRow===0){systemStep(direction);drawMenu();return;}const k=state.menuRow-1;")
swap("case 0:setVal('group',(state.group+direction+GROUPS.length)%GROUPS.length);break;", "case 0:cycleWithinSystem(direction);break;")
swap('22:state.menu=false;', '22:state.menu=false;')
swap("ctx.fillText('Room-scale symmetry lab  ·  0.7'", "ctx.fillText('Room-scale symmetry lab  ·  0.8'")
swap('const y=222+i*52;', 'const y=216+i*49;')
swap("case 16:setVal('scaleMotif',!state.scaleMotif);break;", "case 16:notify('Motif size is independent of cell period');break;")
swap("case 16:return state.scaleMotif?'ON':'OFF';", "case 16:return 'Independent';")
swap("if(state.quality==='safe'||state.quality==='balanced'){", "if(state.quality==='safe'||state.quality==='balanced'){")
# Scale motif toggle removed from actual UI; underlying false option retained for old menu compatibility.
swap("$('scaleMotifRow').hidden=state.representation!=='motif';", "")
swap("for(const k of ['safety','fadeViewer','grid','ground','animate','sliceFollow','exterior','scaleMotif'])$(k).checked=state[k];", "for(const k of ['safety','fadeViewer','grid','ground','animate','sliceFollow','exterior'])$(k).checked=state[k];")
swap("for(const k of ['safety','fadeViewer','grid','ground','animate','sliceFollow','exterior','scaleMotif'])$(k).addEventListener", "for(const k of ['safety','fadeViewer','grid','ground','animate','sliceFollow','exterior'])$(k).addEventListener")
swap("get faceStats(){return window.SPACEGROUP_FUNDAMENTAL_FACES.map(x=>({facets:x.facets,triangles:x.i.length/3}))}", "get faceStats(){return window.SPACEGROUP_FUNDAMENTAL_FACES.map(x=>({facets:x.facets,triangles:x.i.length/3}))}") if False else None
# Face filtering: CPU face polygons also need geometry spatial transform, not just translation.
swap("state.sceneCount=state.representation==='motif'?motifRecords.length:state.representation==='sheet'?sheetRecords.length:0;", "state.sceneCount=state.representation==='motif'?motifRecords.length:state.representation==='sheet'?sheetRecords.length:0;")
swap('gl.uniform1i(mU.group,state.group);', 'gl.uniform1i(mU.group,state.group);')
swap("const L=state.period,base=state.origin;", "const L=state.period,base=state.origin;")
# status and tags
swap("${Math.round(state.period*100)} cm periods", "${Math.round(state.period*100)} cm cell scale")
swap("${state.sceneCount>20000?", "${state.sceneCount>20000?")
swap("$('status').textContent=`${g.symbol} · #${g.id} · ${g.ops.length} operations", "$('status').textContent=`${g.system.toUpperCase()} · ${g.symbol} · #${g.id} · ${g.ops.length} operations")
swap("const rad=state.motif==='archer'?", "const rad=state.motif==='archer'?")
p.write_text(s)
print('Patched JS',p.stat().st_size,'bytes')
