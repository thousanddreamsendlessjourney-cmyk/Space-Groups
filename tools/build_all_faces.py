import json, numpy as np, time
from pathlib import Path
from scipy.spatial import Voronoi
root=Path(__file__).resolve().parents[1]
groups=json.loads((root/'spacegroups-data.js').read_text().split('=',1)[1].rstrip(';\n'))
def clipped(vs):
 p=[np.array(x) for x in vs]
 for d in range(3):
  for side in (0,1):
   if not p:return []
   def dist(q):return q[d] if side==0 else 1-q[d]
   out=[]
   for a,b in zip(p,p[1:]+p[:1]):
    da,db=dist(a),dist(b);ia=da>=-1e-8;ib=db>=-1e-8
    if ia:out.append(a)
    if ia!=ib:out.append(a+(b-a)*(da/(da-db)))
   p=out
 out=[]
 for q in p:
  q=np.clip(q,0,1)
  if not out or np.linalg.norm(q-out[-1])>1e-6:out.append(q)
 if len(out)>1 and np.linalg.norm(out[0]-out[-1])<1e-6:out.pop()
 return out if len(out)>2 and np.linalg.norm(np.cross(out[1]-out[0],out[2]-out[0]))>1e-8 else []
def make(g):
 ops=g['ops'];B=np.array(g['basis']).reshape(3,3);invB=np.linalg.inv(B);seed=np.array([.211,.347,.273]);used=set();sites=[]
 for x in range(-1,2):
  for y in range(-1,2):
   for z in range(-1,2):
    for o in ops:
     q=np.array(o[:9]).reshape(3,3)@seed+np.array(o[9:])/24+np.array([x,y,z]);k=tuple(np.round(q,8))
     if k not in used:used.add(k);sites.append(q)
 polys=[]
 if len(ops)>1:
  vor=Voronoi(np.array(sites)@B.T,qhull_options='Qbb Qc Qz');seen=set()
  for faces in vor.ridge_vertices:
   if -1 in faces or len(faces)<3:continue
   frac=vor.vertices[faces]@invB.T
   if np.any(frac.max(axis=0)<-1e-8) or np.any(frac.min(axis=0)>1+1e-8):continue
   poly=clipped(frac)
   if not poly:continue
   key=tuple(sorted(tuple(round(float(s),5) for s in q) for q in poly))
   if key not in seen:seen.add(key);polys.append(poly)
 for axis in range(3):
  others=[i for i in range(3) if i!=axis];poly=[]
  for u,v in [(0,0),(1,0),(1,1),(0,1)]:
   q=np.zeros(3);q[others[0]]=u;q[others[1]]=v;poly.append(q)
  polys.append(poly)
 verts=[];idx=[]
 for poly in polys:
  n=np.cross(poly[1]-poly[0],poly[2]-poly[0]);size=np.linalg.norm(n)
  if size<1e-9:continue
  n/=size;axis=np.argmax(abs(n));uvaxes=[i for i in range(3) if i!=axis];start=len(verts)//8
  for q in poly:verts.extend([round(float(x),5) for x in q]);verts.extend([round(float(x),5) for x in n]);verts.extend([round(float(q[i]),5) for i in uvaxes])
  for j in range(1,len(poly)-1):idx.extend([start,start+j,start+j+1])
 return {'v':verts,'i':idx,'facets':len(polys),'sites':len(sites)}
t=time.monotonic();allgeo=[]
for i,g in enumerate(groups):
 o=make(g);allgeo.append(o)
 if i%10==0 or i==229:print(f'{i+1}/230 {g["symbol"]} sites={o["sites"]} faces={o["facets"]} elapsed={time.monotonic()-t:.1f}s',flush=True)
 if max(o['i'],default=0)>=65535:print('ERROR index uint16 overflow for',g['id'],flush=True)
(root/'fundamental-faces.js').write_text('window.SPACEGROUP_FUNDAMENTAL_FACES='+json.dumps(allgeo,separators=(',',':'))+';\n')
print('DONE', (root/'fundamental-faces.js').stat().st_size,round(time.monotonic()-t,2),flush=True)
