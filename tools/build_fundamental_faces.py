"""Generate SINGLE-COPY Dirichlet facets of a generic crystallographic site.
Tessellate all finite Voronoi facets crossing [0,1]^3, plus the three
cell boundary walls; deduplicate shared ridges. The points are complete
symmetry orbits including neighboring lattice translations.
"""
import numpy as np
import json
from scipy.spatial import Voronoi
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
I=(1,0,0,0,1,0,0,0,1)
refX=(-1,0,0,0,1,0,0,0,1);refY=(1,0,0,0,-1,0,0,0,1);refZ=(1,0,0,0,1,0,0,0,-1)
inv=(-1,0,0,0,-1,0,0,0,-1);r4=(0,0,-1,0,1,0,1,0,0)
rR=(1,0,0,0,0,-1,0,1,0)
def mul(a,b):return tuple(sum(a[3*r+k]*b[3*k+c] for k in range(3)) for r in range(3) for c in range(3))
def mv(r,p):return tuple(sum(r[3*i+j]*p[j] for j in range(3)) for i in range(3))
def compose(a,b):
 r=mul(a[0],b[0]);v=mv(a[0],b[1]);t=tuple(round((v[i]+a[1][i])%1,6)%1 for i in range(3));return r,t
def closure(gens):
 out=[(I,(0,0,0))];seen=set(out);i=0
 while i<len(out):
  for g in gens:
   o=compose(out[i],g)
   if o not in seen:out.append(o);seen.add(o)
  i+=1
 return out
G=[[],[(inv,(0,0,0))],[(refX,(0,0,0))],[(r4,(0,0,0))],[(r4,(0,.25,0))],[(r4,(0,0,0)),(refX,(0,0,0))],[(refX,(0,0,0)),(refY,(0,0,0)),(refZ,(0,0,0))],[(r4,(0,0,0)),(rR,(0,0,0)),(refX,(0,0,0))]]

def clip(poly,dim,side):
 # side -1 means >=0; +1 means <=1
 def D(v):return v[dim] if side==-1 else 1.-v[dim]
 out=[]
 for A,B in zip(poly,poly[1:]+poly[:1]):
  da,db=D(A),D(B);aa=da>=-1e-9;bb=db>=-1e-9
  if aa:out.append(A)
  if aa!=bb:
   t=da/(da-db);out.append(A+(B-A)*t)
 return out

def intersect(poly):
 poly=[np.array(v,dtype=np.float64) for v in poly]
 for i in range(3):
  for side in (-1,1):
   if not poly:return []
   poly=clip(poly,i,side)
 # remove identical adjacent points
 out=[]
 for p in poly:
  if not out or np.linalg.norm(p-out[-1])>1e-7:out.append(p)
 if len(out)>1 and np.linalg.norm(out[0]-out[-1])<1e-7:out.pop()
 if len(out)<3:return []
 n=np.zeros(3)
 for i in range(1,len(out)-1):n+=np.cross(out[i]-out[0],out[i+1]-out[0])
 return out if np.linalg.norm(n)>1e-7 else []

def make(group):
 ops=closure(group);assert len(ops) in (1,2,4,8,48),len(ops)
 p=np.array([.211,.347,.273])
 # 3x3x3 nearby cells; include enough seed neighbors for bounded ridges
 sites=[];used=set()
 for x in range(-2,3):
  for y in range(-2,3):
   for z in range(-2,3):
    for r,t in ops:
     site=np.array(mv(r,p))+t+[x,y,z]
     key=tuple(np.round(site,8))
     if key not in used:used.add(key);sites.append(site)
 sites=np.asarray(sites);vor=Voronoi(sites)
 facets=[];seen=set()
 for pair,verts in zip(vor.ridge_points,vor.ridge_vertices):
  if -1 in verts or len(verts)<3:continue
  vertices=vor.vertices[verts]
  poly=intersect(vertices)
  if not poly:continue
  # Canonical sorted polygon vertex set, ensuring a ridge is emitted once.
  key=tuple(sorted(tuple(np.round(a,5)) for a in poly))
  if key in seen:continue
  seen.add(key);facets.append(poly)
 # P1 has only translation-cell walls; avoid adding a second arbitrarily shifted
 # Voronoi cube inside its natural primitive cell.
 if len(ops)==1:facets=[]
 # add the three faces on the lower cube boundary so no adjacent cell duplicates.
 for axis in range(3):
  axes=[i for i in range(3) if i!=axis];poly=[]
  for u,v in ((0,0),(1,0),(1,1),(0,1)):
   a=np.zeros(3);a[axes[0]]=u;a[axes[1]]=v;poly.append(a)
  facets.append(poly)
 verts=[];index=[];facetsize=[]
 for poly in facets:
  p0=np.array(poly[0]);edge=np.array(poly[1])-p0
  norm=np.zeros(3)
  for k in range(1,len(poly)-1):norm+=np.cross(poly[k]-p0,poly[k+1]-p0)
  norm/=np.linalg.norm(norm)
  # use world-fractional planar coordinate for continuous UV across polygon clips
  axis=int(np.argmax(np.abs(norm)));uvaxes=[i for i in range(3) if i!=axis]
  base=len(verts)//8
  for v in poly:
   verts.extend([*map(float,v),*map(float,norm),float(v[uvaxes[0]]),float(v[uvaxes[1]])])
  for j in range(1,len(poly)-1):index.extend([base,base+j,base+j+1])
  facetsize.append(len(poly))
 assert len(verts)//8<65535,(len(verts)//8,len(facets))
 return {'v':np.array(verts,dtype=np.float32).tolist(),'i':index,'facets':len(facets),'operations':len(ops),'sites':len(sites)}

allgeo=[]
for idx,g in enumerate(G):
 result=make(g);allgeo.append(result)
 print(idx,'ops',result['operations'],'facets',result['facets'],'vertices',len(result['v'])//8,'tris',len(result['i'])//3)
with open(ROOT/'fundamental-faces.js','w') as fh:
 fh.write('// Precomputed complete Dirichlet face sections per unit translation cell.\nwindow.SPACEGROUP_FUNDAMENTAL_FACES=')
 json.dump(allgeo,fh,separators=(',',':'))
 fh.write(';\n')
