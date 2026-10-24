from playwright.sync_api import sync_playwright
from pathlib import Path
import re,time
root=Path(__file__).resolve().parents[1]
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-gpu'])
 p=b.new_page(viewport={'width':1100,'height':800});errors=[]
 p.on('pageerror',lambda e:errors.append(str(e)))
 html=(root/'index.html').read_text()
 html=re.sub(r'<link rel="stylesheet" href="style.css\?v=[^"]+">',lambda _: '<style>'+(root/'style.css').read_text()+'</style>',html)
 html=re.sub(r'<script src="[^"]+"(?: defer)?></script>','',html)
 p.goto('about:blank');p.set_content(html)
 patch='''(()=>{const orig=HTMLCanvasElement.prototype.getContext;let counter=1;
 const gl=new Proxy({}, {get(o,k){if(k==='getShaderParameter'||k==='getProgramParameter')return ()=>true;
  if(k==='getError')return ()=>0;
  if(k==='NO_ERROR')return 0;
  if(k==='createBuffer'||k==='createTexture'||k==='createVertexArray'||k==='createProgram'||k==='createShader')return ()=>({fake:counter++});
  if(k==='getUniformLocation')return ()=>({uniform:true});
  if(k==='getShaderInfoLog'||k==='getProgramInfoLog')return ()=>'';
  if(k==='canvas')return document.getElementById('scene');
  if(k==='getParameter')return ()=>2048;
  if(typeof k==='string'&&k===k.toUpperCase())return 1;
  return ()=>{};
 }});
 HTMLCanvasElement.prototype.getContext=function(t,...args){if(t==='webgl2')return gl;return orig.call(this,t,...args)};
 })();'''
 p.add_script_tag(content=patch)
 for x in ['assets-inline.js','volume-inline.js','spacegroups-data.js','fundamental-faces.js','main.js']:
  t=time.monotonic();p.add_script_tag(content=(root/x).read_text());print('loaded',x,round(time.monotonic()-t,2),flush=True)
 try:p.wait_for_function('window.SPACEGROUP_DEBUG && window.SPACEGROUP_DEBUG.materialNames.length===3',timeout=60000)
 except Exception as e:print('FAILED',str(e)[:500]);print('error box',p.locator('#error').text_content());print('PAGE ERR',errors[:5]);raise
 print('init',p.evaluate('''() => ({len:SPACEGROUP_DEBUG.GROUPS.length,selected:SPACEGROUP_DEBUG.state.group,symbol:SPACEGROUP_DEBUG.GROUPS[SPACEGROUP_DEBUG.state.group].symbol,opts:document.querySelectorAll('#group option').length})'''),flush=True)
 assert p.evaluate('SPACEGROUP_DEBUG.GROUPS.length')==230
 assert p.evaluate("document.querySelectorAll('#group option').length")==230
 p.locator('#groupSearch').fill('225')
 print('search',p.locator('#groupResultCount').text_content(),p.locator('#group').text_content()[:150],flush=True)
 p.locator('#groupSearch').fill('')
 p.locator('#crystalSystem').select_option('hexagonal')
 print('hex',p.locator('#groupResultCount').text_content(),flush=True)
 p.locator('#groupFeatured').select_option('225')
 print('featured',p.evaluate("[SPACEGROUP_DEBUG.state.group,SPACEGROUP_DEBUG.GROUPS[SPACEGROUP_DEBUG.state.group].order]"),flush=True)
 p.locator('#ground').check()
 # change group to simple Pm via featured
 p.locator('#groupFeatured').select_option('6')
 d='SPACEGROUP_DEBUG'
 before=p.evaluate(f'''()=>{{const s={d}.state;return {{period:s.period,origin:s.origin.slice(),seed:[...s.seed],floor:s.ground,player:[0,1.64,0],ops:{d}.GROUPS[s.group].ops.length,bas:{d}.GROUPS[s.group].basis}}}}''')
 p.locator('#period').evaluate("e=>{e.value='1.40';e.dispatchEvent(new Event('input',{bubbles:true}))}")
 after=p.evaluate(f'''()=>{{const s={d}.state;return {{period:s.period,origin:s.origin.slice(),seed:[...s.seed],floor:s.ground}}}}''')
 print('before',before,'after',after,flush=True)
 assert after['period']==1.4
 assert abs(after['seed'][0]-before['seed'][0])<1e-8
 assert abs(after['seed'][5]-before['seed'][5])<1e-8
 assert abs(after['seed'][10]-before['seed'][10])<1e-8
 assert after['origin']!=before['origin']
 # verify lattice generator distance grows, motif absolute size constant
 first=p.evaluate(f'''()=>{{const t={d}.cellOp([0,0,0],{d}.GROUPS[{d}.state.group].ops[0]);return [t[12],t[13],t[14]]}}''')
 print('cell placement',first,flush=True)
 # activation of sheet and volume
 p.locator('#representation').select_option('sheet');p.evaluate(f'{d}.regen()')
 print('sheet geometry',p.evaluate(f'{d}.sheetCount'),flush=True)
 assert p.evaluate(f'{d}.sheetCount')>0
 p.locator('#representation').select_option('slice')
 p.evaluate(f'{d}.regen()')
 p.wait_for_timeout(250)
 print('slice ready',p.evaluate(f'{d}.getGLError()'),flush=True)
 # Representative settings in all seven crystal systems, including high-order cubic.
 for n in [1,14,62,76,146,194,221,225,230]:
  p.evaluate(f'{d}.changeGroup({n-1})')
  p.evaluate(f'{d}.regen()')
  obj=p.evaluate(f'()=>({{group:{d}.state.group,order:{d}.GROUPS[{d}.state.group].ops.length,ready:{d}.volumeTexture!==null,error:document.querySelector("#error").textContent}})')
  print('group',n,'ops',obj['order'],'volume',obj['ready'],flush=True)
  assert obj['group']==n-1 and obj['order']>0 and not obj['error']
 print('errors',errors[:4],flush=True)
 assert not errors
 b.close()
