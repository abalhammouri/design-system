"""Build the csicx.com-style e-house page: the site header and fonts, with the 3D
walkthrough as the page itself (no other csicx.com page content).

Usage: python3 -I tools/build_csicx_tour_page.py
Reads tools/source-commissioning.html (a saved csicx.com page, used only for its
<head> styles, header, mobile menu and menu scripts) and ehouse/index.html (the
walkthrough). Writes csicx-ehouse-page/en/services/e-house/index.html.
"""
import os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = open(os.path.join(ROOT, 'tools/source-commissioning.html'), encoding='utf-8').read()
tour = open(os.path.join(ROOT, 'ehouse/index.html'), encoding='utf-8').read()

# ---------- pieces of the csicx.com page ----------
head = src[src.index('<head>') + 6:src.index('</head>')]
head = re.sub(r'<script async src="https://www\.googletagmanager\.com.*?</script>\s*<script>.*?</script>', '', head, count=1, flags=re.S)
head = head.replace('<title>CSI Engineering - Commissioning Services</title>',
                    '<title>CSI Engineering - E-House Walkthrough</title>\n    <meta name="robots" content="noindex, nofollow">')
head = re.sub(r'(<meta name="description" content=")[^"]*(")',
              r'\1Walk inside a CSI e-house: switchgear, controls, batteries, drives, building systems and the QC records behind them.\2', head, count=1)
head = re.sub(r'\s*<link[^>]+service-scroll-reveal\.css[^>]*>', '', head)

b0 = src.index('<header class="header-one header--sticky">')
b1 = src.index('<div id="anywhere-home"')
header_and_menu = src[b0:b1] + '<div id="anywhere-home" class="" aria-hidden="true"></div>'

# menu scripts only; leave out smooth scrolling and scroll-reveal, which fight the scroll-driven tour
keep = ['plugins/jquery.js', 'plugins/odometer.js', 'plugins/jquery-appear.js', 'plugins/gsap.js', 'plugins/split-text.js', 'plugins/scroll-trigger.js', 'plugins/metismenu.js', 'plugins/popup.js', 'vendor/bootstrap.min.js', 'plugins/swiper.js', 'main.js']
scripts = '\n'.join(f'    <script defer src="https://www.csicx.com/js/{k}"></script>' for k in keep)
tail_scripts = src[src.rindex('<script>\n    /* ── Dropdown hover-delay fix'):src.rindex('</body>')]

# ---------- pieces of the walkthrough ----------
css = re.search(r'<style>(.*?)</style>', tour, re.S).group(1)
body = tour[tour.index('<div id="track">'):tour.index('<script type="importmap">')]
body = re.sub(r'\s*<header>.*?</header>', '', body, count=1, flags=re.S)   # the site header replaces it

def scope(css, pre='#ehx'):
    out, i = [], 0
    while i < len(css):
        j = css.find('{', i)
        if j < 0:
            break
        sel = css[i:j].strip()
        if sel.startswith('@media') or sel.startswith('@supports'):
            depth, k = 1, j + 1
            while depth:
                depth += {'{': 1, '}': -1}.get(css[k], 0); k += 1
            out.append(sel + '{' + scope(css[j + 1:k - 1], pre) + '}'); i = k; continue
        k = css.index('}', j) if not sel.startswith('@keyframes') else None
        if sel.startswith('@keyframes'):
            depth, k = 1, j + 1
            while depth:
                depth += {'{': 1, '}': -1}.get(css[k], 0); k += 1
            out.append(css[i:k]); i = k; continue
        rule = css[j:k + 1]
        parts = []
        for s in sel.split(','):
            s = s.strip()
            if s in (':root', 'html') or s.startswith(':root'):
                parts.append(s)
            elif s == 'body':
                parts.append(pre)
            elif s.startswith('body.'):
                cls, rest = (s.split(' ', 1) + [''])[:2]
                parts.append(f'{cls} {pre} {rest}'.strip())
            elif s == '*':
                parts.append(f'{pre} *')
            else:
                parts.append(f'{pre} {s}')
        out.append(','.join(parts) + rule); i = k + 1
    return '\n'.join(out)

tour_css = scope(css) + '''
/* fit under the fixed csicx.com header and use the site fonts */
.header-one.header--sticky{position:fixed!important;top:0;left:0;right:0;width:100%;z-index:999!important;background:#fff!important;box-shadow:0 1px 10px rgba(0,0,0,.08)}
body.index-one{padding-top:var(--hh,80px)!important;background:#0a1a30}
html,body.index-one{overflow:visible!important;overflow-x:clip!important}
#ehx .qc li,#ehx .sig .sg{margin:0!important;line-height:1.35}#ehx .view td,#ehx .view th{line-height:1.35}#ehx .qc ul{gap:7px}
#ehx{font-family:"DM Sans",system-ui,sans-serif;--hh:80px}
#ehx #stage{top:var(--hh,80px);height:calc(100vh - var(--hh,80px));height:calc(100svh - var(--hh,80px))}
#ehx .panel h2{font-family:"Red Hat Display","DM Sans",sans-serif;color:#fff;letter-spacing:-.01em}
#ehx .panel p,#ehx .panel li{font-family:"DM Sans",system-ui,sans-serif}
#ehx .panel ul{display:flex}
#ehx .panel ul li{list-style:none;margin:0}
#ehx #plan{top:20px}
#ehx #docs .scr,#ehx .spot span{font-family:"DM Sans",system-ui,sans-serif}
#ehx .go{color:#0a1a30}
@media(max-width:700px){#ehx #plan{top:12px}#ehx #docs{top:16px}}
'''

page = f'''<!DOCTYPE html>
<html lang="en">
<head>
{head}
<style>
{tour_css}
</style>
</head>
<body class="index-one">
    {header_and_menu}

<main id="ehx">
{body}
</main>
<script type="importmap">{{"imports":{{"three":"/e-house-tour/vendor/three.module.js"}}}}</script>
<script type="module" src="/e-house-tour/app.js"></script>
<script>
(function(){{
  var h=document.querySelector('.header-one');
  function set(){{if(h)document.documentElement.style.setProperty('--hh',h.offsetHeight+'px');var m=document.getElementById('ehx');if(m&&h)m.style.setProperty('--hh',h.offsetHeight+'px');}}
  set();addEventListener('resize',set);addEventListener('load',set);
}})();
</script>
{scripts}
    {tail_scripts}
</body>
</html>
'''

# local copies of the site's assets; links to other pages stay on the live site
page = re.sub(r'https://www\.csicx\.com/(css|js|img|fonts)/', r'/\1/', page)
page = page.replace('href="/Contact-us"', 'href="https://www.csicx.com/en/contact-us"').replace('href="/Home"', 'href="https://www.csicx.com/en"')
for old in ['<li><a href="https://www.csicx.com/en/services/mission-critical">Mission Critical <span>›</span></a></li>',
            '<li><a href="https://www.csicx.com/en/services/mission-critical">Mission Critical</a></li>']:
    page = page.replace(old, old + '\n' + old.replace('https://www.csicx.com/en/services/mission-critical', '/en/services/e-house/').replace('Mission Critical', 'E-House Solutions'))

out = os.path.join(ROOT, 'csicx-ehouse-page/en/services/e-house/index.html')
os.makedirs(os.path.dirname(out), exist_ok=True)
open(out, 'w', encoding='utf-8').write(page)
print('wrote', out, len(page))
