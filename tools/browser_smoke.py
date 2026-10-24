"""Optional real-WebGL visual regression check.

Requires `pip install playwright pillow` and Chromium; on headless Linux,
start with `xvfb-run -a python tools/browser_smoke.py`.

This test intentionally loads scripts into about:blank, making it runnable in
locked-down development environments where local HTTP/file navigation is denied.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
from PIL import Image
import re

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'screenshots'
OUT.mkdir(exist_ok=True)


def screenshot_roi(page, label):
    out = OUT / (label + '.png')
    page.screenshot(path=str(out))
    return Image.open(out).convert('RGB').crop((390, 40, 1250, 840))


def difference(a, b):
    p, q = a.tobytes(), b.tobytes()
    return sum(abs(x-y) for x, y in zip(p, q)) / len(p)


with sync_playwright() as pw:
    browser = pw.chromium.launch(executable_path='/usr/bin/chromium', headless=False,
        args=['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=gl',
              '--enable-webgl', '--ignore-gpu-blocklist'])
    page = browser.new_page(viewport={'width':1280, 'height':900})
    errors = []
    page.on('console', lambda m: errors.append(m.text) if m.type in ('warning','error') else None)
    page.on('pageerror', lambda e: errors.append(str(e)))
    html = (ROOT/'index.html').read_text()
    html = re.sub(r'<link rel="stylesheet" href="style.css\?v=[^\"]+">',
                  lambda _: '<style>'+(ROOT/'style.css').read_text()+'</style>', html)
    html = re.sub(r'<script src="[^\"]+"(?: defer)?></script>', '', html)
    page.goto('about:blank')
    page.set_content(html)
    for js in ['assets-inline.js', 'volume-inline.js', 'fundamental-faces.js', 'main.js']:
        page.add_script_tag(content=(ROOT/js).read_text())
    page.wait_for_function('window.SPACEGROUP_DEBUG && window.SPACEGROUP_DEBUG.materialNames.length === 3')
    page.wait_for_timeout(650)
    assert not page.locator('#error').inner_text(), page.locator('#error').inner_text()

    # Test that the cell-period control changes the visible perspective.
    initial = screenshot_roi(page, 'motif_060')
    page.locator('#period').evaluate('(el)=>{el.value="1.8";el.dispatchEvent(new Event("input",{bubbles:true}));}')
    page.wait_for_timeout(450)
    large = screenshot_roi(page,'motif_180')
    assert page.locator('#periodValue').inner_text() == '1.80 m'
    diff = difference(initial,large)
    assert diff > 3, f'Cell-size control visually inert (MAE {diff:.2f})'

    page.locator('#radius').evaluate('(e)=>{e.value="3";e.dispatchEvent(new Event("input",{bubbles:true}));}')
    page.select_option('#representation','sheet')
    page.wait_for_timeout(400)
    solid = screenshot_roi(page,'walls_opaque')
    page.select_option('#family','line')
    page.wait_for_timeout(400)
    lines = screenshot_roi(page,'walls_lines')
    diff2 = difference(solid,lines)
    assert diff2 > 7, f'Line and opaque walls look identical (MAE {diff2:.2f})'

    page.select_option('#representation','slice')
    page.wait_for_timeout(2500)
    for material in ['oak','walnut','strata']:
        page.select_option('#volume',material)
        page.wait_for_timeout(2500)
        im = screenshot_roi(page,'solid_'+material)
        assert max(im.getextrema()[i][1] for i in range(3)) > 80, 'The 3D section rendered black'
    page.locator('#exterior').set_checked(True)
    page.wait_for_timeout(450)
    exterior = screenshot_roi(page,'exterior')
    assert max(exterior.getextrema()[i][1] for i in range(3)) > 80, 'Exterior rendered black'

    assert not errors, 'Browser errors: '+'; '.join(errors)
    assert page.evaluate('window.SPACEGROUP_DEBUG.getGLError()') == 0, 'WebGL reported an error'
    print(f'PASS: real WebGL rendering; cell-size image delta {diff:.1f}, 2D texture-type delta {diff2:.1f}; solid slice and exterior nonblack; zero GPU errors')
    browser.close()
