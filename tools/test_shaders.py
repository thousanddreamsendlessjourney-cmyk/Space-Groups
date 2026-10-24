"""Compile and link the five atlas GLSL ES3 shader pairs in a surfaceless EGL context."""
import ctypes as c, pathlib, subprocess, json, sys
p=pathlib.Path(__file__).resolve().parent.parent
# Shader extraction without executing the web app
js=r'''const fs=require('fs');let s=fs.readFileSync(process.argv[1],'utf8');for(const m of s.matchAll(/const\s+(VS|FS|planeVS|planeFS|floorVS|floorFS|exteriorVS|exteriorFS|uiVS|uiFS)=`([\s\S]*?)`;/g))fs.writeFileSync('/tmp/atlas_'+m[1]+'.glsl',m[2]);'''
subprocess.check_call(['node','-e',js,str(p/'main.js')])
egl=c.CDLL('/usr/lib/chromium/libEGL.so')
gles=c.CDLL('/usr/lib/chromium/libGLESv2.so')
P=c.c_void_p; I=c.c_int; UI=c.c_uint; STRING=c.c_char_p

def fn(lib,name,ret,arg):
 f=getattr(lib,name);f.restype=ret;f.argtypes=arg;return f
getproc=fn(egl,'eglGetProcAddress',P,[STRING])
getDisplay=fn(egl,'eglGetDisplay',P,[P]);initialize=fn(egl,'eglInitialize',I,[P,c.POINTER(I),c.POINTER(I)])
platform_fn=getproc(b'eglGetPlatformDisplayEXT')
if platform_fn:
 getPlatform=c.CFUNCTYPE(P,I,P,P)(platform_fn)
 display=getPlatform(0x31DD,None,None)
else:display=getDisplay(None)
major=I();minor=I();assert initialize(display,c.byref(major),c.byref(minor)), 'EGL initialize failed'
bindApi=fn(egl,'eglBindAPI',I,[I]);assert bindApi(0x30A0)
choose=fn(egl,'eglChooseConfig',I,[P,c.POINTER(I),c.POINTER(P),I,c.POINTER(I)])
attrs=(I*15)(0x3024,8,0x3023,8,0x3022,8,0x3021,8,0x3040,0x40,0x3033,1,0x3038)
config=P();num=I();assert choose(display,attrs,c.byref(config),1,c.byref(num)) and num.value>0
createContext=fn(egl,'eglCreateContext',P,[P,P,P,c.POINTER(I)])
ctx=createContext(display,config,None,(I*3)(0x3098,3,0x3038));assert ctx,'No GLES3 context'
createSurf=fn(egl,'eglCreatePbufferSurface',P,[P,P,c.POINTER(I)])
surf=createSurf(display,config,(I*5)(0x3057,32,0x3056,32,0x3038));assert surf
make=fn(egl,'eglMakeCurrent',I,[P,P,P,P]);assert make(display,surf,surf,ctx),'eglMakeCurrent'
getstr=fn(gles,'glGetString',STRING,[UI]);print('Context',major.value,minor.value,'GL',getstr(0x1F02))
create=fn(gles,'glCreateShader',UI,[UI]);source=fn(gles,'glShaderSource',None,[UI,I,c.POINTER(STRING),P]);compile=fn(gles,'glCompileShader',None,[UI]);getShader=fn(gles,'glGetShaderiv',None,[UI,UI,c.POINTER(I)]);getShaderLog=fn(gles,'glGetShaderInfoLog',None,[UI,I,c.POINTER(I),P]);
createProg=fn(gles,'glCreateProgram',UI,[]);attach=fn(gles,'glAttachShader',None,[UI,UI]);link=fn(gles,'glLinkProgram',None,[UI]);getProg=fn(gles,'glGetProgramiv',None,[UI,UI,c.POINTER(I)]);getProgLog=fn(gles,'glGetProgramInfoLog',None,[UI,I,c.POINTER(I),P]);
for vs,fs in [('VS','FS'),('planeVS','planeFS'),('floorVS','floorFS'),('exteriorVS','exteriorFS'),('uiVS','uiFS')]:
 prog=createProg()
 for key,typ in [(vs,0x8B31),(fs,0x8B30)]:
  shader=create(typ)
  b=pathlib.Path('/tmp/atlas_'+key+'.glsl').read_bytes();pstr=STRING(b)
  source(shader,1,c.byref(pstr),None);compile(shader)
  ok=I();getShader(shader,0x8B81,c.byref(ok))
  if not ok.value:
   buf=c.create_string_buffer(8192);getShaderLog(shader,8192,None,buf);raise RuntimeError(key+': '+buf.value.decode())
  attach(prog,shader)
 link(prog);ok=I();getProg(prog,0x8B82,c.byref(ok))
 if not ok.value:
  buf=c.create_string_buffer(8192);getProgLog(prog,8192,None,buf);raise RuntimeError(vs+' / '+fs+': '+buf.value.decode())
 print('PASS',vs,fs)
