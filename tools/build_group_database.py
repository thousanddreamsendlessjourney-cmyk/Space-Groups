"""Export all 230 standardized IT/CCP4 space groups from Gemmi.
Each operation is integer 3x3 fractional rotation and translation with denominator 24.
"""
from pathlib import Path
import gemmi, json, numpy as np
D=24
root=Path(__file__).resolve().parents[1]
systems=['triclinic','monoclinic','orthorhombic','tetragonal','trigonal','hexagonal','cubic']

def tup(op):
    assert gemmi.Op.DEN==24
    r=[int(op.rot[i][j]//D) for i in range(3) for j in range(3)]
    t=[int(x%D) for x in op.tran]
    return tuple(r+t)

def mult(a,b):
    r1=np.array(a[:9]).reshape((3,3));r2=np.array(b[:9]).reshape((3,3))
    t1=np.array(a[9:]);t2=np.array(b[9:]);r=r1@r2;t=(r1@t2+t1)%D
    return tuple(int(x) for x in r.reshape(-1))+tuple(int(x) for x in t)
I=(1,0,0,0,1,0,0,0,1,0,0,0)
def clos(gens):
    out=[I]; seen={I}
    i=0
    while i<len(out):
        for g in gens:
            v=mult(out[i],g)
            if v not in seen:
                seen.add(v);out.append(v)
        i+=1
        if len(out)>192:raise ValueError('closure too big')
    return seen

def basis(system):
    if system=='triclinic':
        # arbitrary, nondegenerate triclinic unit cell
        return np.array([[1., .19, .13],[0.,1.08,.20],[0.,0.,1.22]])
    if system=='monoclinic':
        return np.array([[1.,0.,-.30],[0.,1.09,0.],[0.,0.,1.19]])
    if system=='orthorhombic':return np.diag([1,1.16,1.35])
    if system=='tetragonal':return np.diag([1,1,1.34])
    if system in ('trigonal','hexagonal'):
        return np.array([[1.,-.5,0.],[0.,np.sqrt(3)/2,0.],[0.,0.,1.42]])
    return np.eye(3)

out=[]
for number in range(1,231):
    # all operations including centered cosets
    g=gemmi.find_spacegroup_by_number(number)
    assert g.number==number,(number,g)
    system=g.crystal_system_str()
    ops=[tup(o) for o in g.operations()]
    assert len(set(ops))==len(ops)
    allset=set(ops)
    gens=[]; computed={I}
    for q in ops:
        if q not in computed:
            gens.append(q);computed=clos(gens)
        if computed==allset:break
    assert computed==allset,(number,len(computed),len(ops))
    B=basis(system)
    for o in ops:
        r=np.array(o[:9]).reshape(3,3)
        q=B@r@np.linalg.inv(B)
        assert np.max(np.abs(q.T@q-np.eye(3)))<1e-8,(number,g.hm,r,q)
    out.append({'id':number,'symbol':g.xhm(),'short':(g.xhm().split(':')[0].replace(' ','') if g.centring_type()=='R' else g.short_name()),'compact':g.xhm().replace(' ',''),
                'system':system,'pointGroup':g.point_group_hm(),'centering':g.centring_type(),'hall':g.hall,'order':len(ops),'ops':[list(o) for o in ops],
                'gens':[list(o) for o in gens],
                'basis':np.round(B,8).reshape(-1).tolist()})

p=root/'spacegroups-data.js'
p.write_text('// Reference settings: Gemmi (IT/CCP4 space-group tables).\nwindow.SPACEGROUP_ALL='+json.dumps(out,separators=(',',':'))+';\n')
print('Saved',p,p.stat().st_size,'bytes')
print('Generators (mean,max)',sum(len(x['gens']) for x in out)/230,max(len(x['gens']) for x in out))
for num in [1,2,6,76,146,168,221,225,230]:
 g=out[num-1]; print(num,g['symbol'],g['system'],'ops',g['order'],'gens',len(g['gens']))
