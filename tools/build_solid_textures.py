"""Generate reproducible, *adapted* RGB+A solid fields for Spacegroup Atlas.
Original user-supplied .blend shader graphs cannot be faithfully evaluated without Blender.
These self-contained 3D volume studies reproduce broad grain/banding design, NOT original node shaders.
Output is contiguous z,y,x RGBA8 voxels in a periodic 64^3 cell; alpha encodes morphology.
"""
from pathlib import Path
import numpy as np
from scipy.ndimage import gaussian_filter
from PIL import Image, ImageDraw, ImageFont

ROOT=Path(__file__).resolve().parent.parent
N=64
rng=np.random.default_rng(860241)
z,y,x=np.mgrid[:N,:N,:N].astype(np.float32)/N
# every field is periodic with wrapped noise on the torus, including warp channels

def noise(scale,seed,amp=1):
 r=np.random.default_rng(seed).standard_normal((N,N,N)).astype(np.float32)
 n=gaussian_filter(r,scale,mode='wrap')
 n=n/(np.std(n)+1e-6)
 return amp*n

def mix_palette(t,colors):
 colors=np.array(colors,dtype=np.float32)
 t=np.clip(t,0,1)*(len(colors)-1)
 i=np.minimum(len(colors)-2,np.floor(t).astype(np.int32))
 w=(t-i)[...,None]
 return colors[i]*(1-w)+colors[i+1]*w

def wrap_sq(a,b):
 d=np.abs(a-b);return np.minimum(d,1-d)**2

def save(name,rgb,metric):
 rgb=np.clip(rgb,0,255).astype(np.uint8)
 alpha=np.uint8(np.clip(metric,0,1)*255)
 rgba=np.concatenate([rgb,alpha[...,None]],axis=-1)
 dest=ROOT/'assets'/f'volume_{name}.rgba'
 dest.write_bytes(rgba.tobytes())
 print(name,dest.stat().st_size,'rgb min max',rgb.min(),rgb.max(),'density',float(metric.mean()), 'std=',float(rgb.std()))
 # orthogonal slices: yz at x=.49; xz at y=.49; xy at z=.49
 slices=[rgb[:,:,N//2],rgb[:,N//2,:],rgb[N//2,:,:]]
 previews=[Image.fromarray(arr,'RGB').resize((384,384),Image.Resampling.NEAREST) for arr in slices]
 return previews

warpA=noise(5.0,15,.020)+noise(11.0,4,.035)
warpB=noise(6.0,14,.021)+noise(9.0,24,.028)
warpC=noise(4.5,16,.018)
# OAK: strongly varying longitudinal grain, crooked growth rings, asymmetrical knot distortion.
center_x=.43+.060*np.sin(2*np.pi*y+1.4)+.023*np.cos(4*np.pi*y+1.5)
center_z=.53+.051*np.cos(2*np.pi*y-.6)+.022*np.sin(4*np.pi*y+.5)
dx=(x-center_x)+warpA+.011*np.sin(4*np.pi*z+2*np.pi*y)
dz=(z-center_z)+warpB+.016*np.cos(2*np.pi*x-2*np.pi*y)
angle=np.arctan2(dz,dx)
rad=np.sqrt((dx*1.08)**2+(dz*.88)**2+.000002)
knot=np.exp(-(wrap_sq(x,.76)/.008+wrap_sq(z,.24)/.007+wrap_sq(y,.49)/.026))
phase=rad*21.5+1.5*np.sin(angle*3.0+3.6*y)*rad+1.8*knot*np.sin(angle*1.5+2*y)
ring=(np.cos(2*np.pi*phase)+1)/2
accent=np.power(ring,9.5)
q=.30+.49*ring-.20*accent+.07*noise(1.1,52,1)+.05*noise(4.5,53,1)-.30*knot
rgb=mix_palette(np.clip(q,0,1),[(65,37,23),(105,64,39),(157,104,64),(205,151,97),(241,202,143)])
line=np.maximum(0,np.cos(2*np.pi*(phase*5.3+noise(2.2,61,.15))))**16
rgb*= (1-.18*line)[...,None]
pre_oak=save('oak',rgb,.65*accent+.3*line+.4*knot)

# WALNUT: distinctive cathedral/burl grain, strong dark bands, locally concentrated whorls.
wx=x-.50+.060*np.sin(2*np.pi*(y+z*.33))+.042*np.sin(4*np.pi*y+2*np.pi*z)+.035*noise(6,101)
wz=z-.46+.07*np.cos(2*np.pi*(y*.75+x*.30))+.036*noise(5,102)
r=np.sqrt((wx*1.15)**2+(wz*.95)**2+.0000001)
warpangle=np.arctan2(wz,wx)
loc=np.exp(-(wrap_sq(x,.31)/.014+wrap_sq(z,.66)/.017+wrap_sq(y,.58)/.014))
loc2=np.exp(-(wrap_sq(x,.69)/.010+wrap_sq(z,.30)/.015+wrap_sq(y,.22)/.010))
phase=17.8*r +1.4*np.sin(3*warpangle+8*np.pi*y)*r+2.2*loc+1.1*loc2+noise(4,105,.28)
woodband=(1+np.cos(2*np.pi*phase))/2
mosaic=np.power(woodband,15)
q=.12+.65*woodband-.2*mosaic+.06*noise(1.2,107)-.25*loc-.18*loc2
rgb=mix_palette(np.clip(q,0,1),[(25,15,15),(48,25,20),(86,44,31),(143,82,49),(194,130,76)])
fgrain=np.maximum(0,np.cos(2*np.pi*(phase*3+noise(1.5,108,.3))))**12
rgb *= (1-.25*fgrain)[...,None]
pre_walnut=save('walnut',rgb,np.clip(.70*mosaic+.4*fgrain+.5*loc+.4*loc2,0,1))

# STRATA: substantial oblique sedimentary bands and intersecting veins in 3D,
# not 2D UV mapping or a wispy cloud density.
u=.30*x+.89*y-.41*z
u+=.075*np.sin(2*np.pi*(.8*x+.6*z))+.049*np.sin(2*np.pi*(1.3*z-y))
u+=noise(8,211,.040)+noise(3.5,215,.013)
strata=(1+np.cos(2*np.pi*8.5*u))/2
clay=np.power(strata,5)
veincoord=.72*x-.46*y+.89*z+.05*np.sin(2*np.pi*(x+1.5*y))+.015*noise(5,220)
veins=np.exp(-((np.sin(2*np.pi*3.0*veincoord)/.18)**2))
speck=(np.clip(noise(.8,224),-.9,2)+.9)/3
q=np.clip(.24+.6*strata-.17*clay+.06*speck-.26*veins,0,1)
rgb=mix_palette(q,[(40,48,48),(77,84,78),(117,117,103),(170,157,126),(219,203,163)])
rgb=np.clip(rgb+11*noise(1.3,226)[...,None],0,255)
pre_strata=save('strata',rgb,np.clip(.64*clay+.47*veins+.20*speck,0,1))

# contact sheet for user's 3D verification, each axis cross-section, NOT a surface render
thumbs=[pre_oak,pre_walnut,pre_strata]
out=Image.new('RGB',(3*384,3*(384+46)),(22,27,30));draw=ImageDraw.Draw(out)
for row,(name,frames) in enumerate(zip(['OAK · 3D rings / bent grain','WALNUT · burl / grain','STRATA · bedding / veins'],thumbs)):
 for col,frame in enumerate(frames):
  x0=col*384;y0=row*(384+46)+46
  out.paste(frame,(x0,y0))
  draw.text((x0+10,y0-31),f'{name}    |   {("YZ","XZ","XY")[col]} section',fill=(232,237,238))
out.save(ROOT/'solid_texture_sections.png')
