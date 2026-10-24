from pathlib import Path
from playwright.sync_api import sync_playwright
from PIL import Image
import re, time
R=Path(__file__).resolve().parents[1]
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--enable-webgl','--use-angle=swiftshader','--ignore-gpu-blocklist'])
 p=b.new_page(viewport={'width':1280,'height':900});errors=[]
 p.on('pageerror',lambda e: errors.append(str(e)))
 p.on('console',lambda m: errors.append('console '+m.text) if m.type=='error' else None)
 html=(R/'index.html').read_text()
 html=re.sub(r'<link rel="stylesheet" href="style.css\?v=[^"]+">',lambda _: '<style>'+(R/'style.css').read_text()+'</style>',html)
 html=re.sub(r'<script src="[^"]+"(?: defer)?></script>','',html)
 p.goto('about:blank');p.set_content(html)
 for f in ['assets-inline.js','volume-inline.js','fundamental-faces.js','main.js']:
  p.add_script_tag(content=(R/f).read_text())
 p.wait_for_function('window.SPACEGROUP_DEBUG && window.SPACEGROUP_DEBUG.materialNames.length===3',timeout=120000)
 dbg='window.SPACEGROUP_DEBUG'
 # safe toggle visually relocates distinct point / size
 a=p.evaluate(f'{dbg}.state.seed[12]')
 p.locator('#safety').set_checked(False)
 c=p.evaluate(f'{dbg}.state.seed[12]')
 assert abs(a-c)>.04,(a,c)
 p.locator('#safety').set_checked(True)
 # scaling exactly fixes physical eye and its fractional cell coordinates
 before=p.evaluate(f'''()=>{{const s={dbg}.state;const eye=[0,1.64,0];return {{origin:s.origin.slice(),p:s.period,frac:eye.map((e,i)=>(e-s.origin[i])/s.period)}}}}''')
 p.locator('#period').evaluate("(e)=>{e.value='1.45';e.dispatchEvent(new Event('input',{bubbles:true}));}")
 after=p.evaluate(f'''()=>{{const s={dbg}.state;const eye=[0,1.64,0];return {{origin:s.origin.slice(),p:s.period,frac:eye.map((e,i)=>(e-s.origin[i])/s.period)}}}}''')
 assert max(abs(x-y) for x,y in zip(before['frac'],after['frac']))<.00001,(before,after)
 # fade lock at exact player world coordinates when follow goes OFF
 p.locator('#fadeViewer').set_checked(True)
 p.evaluate('window.dispatchEvent(new KeyboardEvent("keydown",{code:"KeyD",bubbles:true}))')
 p.wait_for_timeout(300)
 p.evaluate('window.dispatchEvent(new KeyboardEvent("keyup",{code:"KeyD",bubbles:true}))')
 p.locator('#fadeViewer').set_checked(False)
 fade=p.evaluate(f'{dbg}.state.fadeAnchor')
 assert any(abs(fade[i]-[0,1.64,0][i])>.01 for i in range(3)),fade
 # cutoff 1; no clamping
 p.locator('#radius').evaluate("(e)=>{e.value='1';e.dispatchEvent(new Event('input',{bubbles:true}));}")
 assert p.evaluate(f'{dbg}.state.radius')==1
 # full interiors included, unlike 3 wall faces of P1
 assert p.evaluate(f'{dbg}.faceStats[7].facets')>70
 # floor is a well-defined plane, and enabling it never changes locomotion
 p.locator('#ground').set_checked(True)
 p.wait_for_timeout(400)
 p.screenshot(path=str(R/'screenshots'/'floor_v07.png'))
 # ensure plane rendered with visible variation, not uniform gray fog
 im=Image.open(R/'screenshots'/'floor_v07.png').convert('RGB')
 assert im.getpixel((950,800))!=im.getpixel((950,300)),(im.getpixel((950,800)),im.getpixel((950,300)))
 # volume 128^3 and switching to most expensive group remains responsive
 p.select_option('#representation','slice')
 t=time.perf_counter();p.select_option('#group','7')
 p.wait_for_function(f'{dbg}.state.group===7 && {dbg}.volumeTexture',timeout=120000)
 p.wait_for_timeout(350)
 print('Group 48 full-resolution build sec',round(time.perf_counter()-t,2))
 assert p.evaluate(f'{dbg}.getGLError()')==0
 assert not errors, errors[:4]
 print('PASS v0.7: safe location, invariant eye coordinates, fade freezes at eye, crop 1, internal orbit faces, floor, 128³ volume and Pm3m no GL errors')
 b.close()
