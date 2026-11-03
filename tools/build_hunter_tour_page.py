"""Build the Hunter Buildings e-house page: a Hunter-style header, a white page
in Hunter's colours, and the 3D walkthrough in its light 'hunter' theme.

Usage: python3 -I tools/build_hunter_tour_page.py
Reads ehouse/index.html and ehouse/app.js; writes hunter-ehouse-page/ (index.html
and a copy of the tour in e-house-tour/).
"""
import os, re, shutil

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'hunter-ehouse-page')
tour = open(os.path.join(ROOT, 'ehouse/index.html'), encoding='utf-8').read()

css = re.search(r'<style>(.*?)</style>', tour, re.S).group(1)
body = tour[tour.index('<div id="track">'):tour.index('<script type="importmap">')]
body = re.sub(r'\s*<header>.*?</header>', '', body, count=1, flags=re.S)
body = body.replace('src="./brand/', 'src="/e-house-tour/brand/')

def scope(css, pre='#ehx'):
    out, i = [], 0
    while i < len(css):
        j = css.find('{', i)
        if j < 0:
            break
        sel = css[i:j].strip()
        if sel.startswith('@media') or sel.startswith('@keyframes'):
            depth, k = 1, j + 1
            while depth:
                depth += {'{': 1, '}': -1}.get(css[k], 0); k += 1
            out.append(sel + '{' + scope(css[j + 1:k - 1], pre) + '}' if sel.startswith('@media') else css[i:k]); i = k; continue
        k = css.index('}', j)
        parts = []
        for s in sel.split(','):
            s = s.strip()
            if s.startswith(':root') or s == 'html':
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
        out.append(','.join(parts) + css[j:k + 1]); i = k + 1
    return '\n'.join(out)

G, N, O = '#006341', '#13294B', '#E58117'
LINK = 'https://www.hunterbuildings.com'
NAV = [('Products', '/products/'), ('Markets', '/markets/'), ('Services', '/services/'), ('Site Services', '/site-services/'),
       ('Rentals', '/rentals/'), ('About', '/about/'), ('Locations', '/locations/'), ('Resources', '/resources/')]
UTIL = [('Projects', '/projects/'), ('Blog', '/blog/'), ('Contact', '/contact/')]
QUOTE = LINK + '/hunter-buildings-quote/'

theme = f'''
:root{{--g:{G};--n:{N};--o:{O};--paper:#ffffff;--mist:#eef3f0;--ink:#13294B;--text:#33445a}}
html,body{{margin:0;background:var(--paper);overflow-x:clip}}
body{{font-family:"Signika","Open Sans",system-ui,sans-serif;color:var(--ink);-webkit-font-smoothing:antialiased}}
/* ---------- Hunter-style header ---------- */
.hb{{position:fixed;top:0;left:0;right:0;z-index:50;background:#fff;box-shadow:0 1px 0 rgba(19,41,75,.08)}}
.hb-top{{background:var(--n);color:#fff;text-align:center;font:400 12.5px/30px "Signika",sans-serif;letter-spacing:.1em;text-transform:uppercase}}
.hb-in{{max-width:1080px;margin:0 auto;padding:16px max(16px,env(safe-area-inset-left,0px)) 6px;display:flex;align-items:center;gap:20px}}
.hb-logo img{{display:block;height:52px;width:auto}}
.hb-util{{margin-left:auto;display:flex;align-items:center}}
.hb-util a{{color:var(--g);text-decoration:none;font:400 13px "Signika",sans-serif;letter-spacing:.1em;text-transform:uppercase;padding:0 16px;border-left:1px solid var(--g)}}
.hb-util a.q{{border:0;background:var(--o);color:var(--n);font:400 14px "Anton",sans-serif;letter-spacing:.04em;padding:7px 16px;margin-right:4px}}
.hb-util a.q+a{{border-left:0}}
.hb-util a:hover{{text-decoration:underline}}.hb-util a.q:hover{{text-decoration:none;background:#f0962f}}
.hb-nav{{max-width:1080px;margin:0 auto;padding:6px 16px 14px;display:flex;justify-content:space-between}}
.hb-nav a{{color:var(--g);text-decoration:none;font:400 13px "Signika",sans-serif;letter-spacing:.1em;text-transform:uppercase;padding:6px 4px}}
.hb-nav a:hover,.hb-nav a:focus-visible{{color:var(--o)}}
.hb-burger{{display:none;margin-left:auto;width:44px;height:44px;border:0;background:var(--g);color:#fff;font-size:22px;cursor:pointer}}
.hb-menu{{display:none}}
@media(max-width:900px){{.hb-top{{font-size:10px;letter-spacing:.06em;line-height:24px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding:0 10px}}.hb-util,.hb-nav{{display:none}}.hb-burger{{display:block}}.hb-logo img{{height:40px}}.hb-in{{padding:10px 16px}}
 .hb.open .hb-menu{{display:grid;gap:2px;padding:6px 16px 16px;background:#fff;border-top:1px solid rgba(0,99,65,.15)}}
 .hb-menu a{{color:var(--g);text-decoration:none;text-transform:uppercase;letter-spacing:.1em;font-size:14px;padding:10px 0;border-bottom:1px solid rgba(0,99,65,.1)}}
 .hb-menu a.q{{background:var(--o);color:var(--n);font-family:"Anton",sans-serif;text-align:center;border:0;margin-top:8px}}}}
/* ---------- light Hunter theme for the tour ---------- */
#ehx{{--hh:0px}}
#ehx #stage{{top:var(--hh);height:calc(100vh - var(--hh));height:calc(100svh - var(--hh));background:linear-gradient(180deg,#ffffff 0%,#f1f5f2 55%,#dbe5df 100%)}}
/* split layout: text column on the left, the 3D view on the right; nothing overlaps the model */
#ehx #stage{{background:#fff}}
#ehx #stage::after{{display:none}}
#ehx canvas,#ehx #spots{{left:38%;width:62%;right:auto}}
#ehx canvas{{background:linear-gradient(180deg,#ffffff 0%,#f1f5f2 55%,#dbe5df 100%);border-left:1px solid rgba(0,99,65,.12)}}
#ehx #panels{{position:absolute;left:0;top:0;bottom:64px;width:38%;z-index:5}}
#ehx .panel{{left:clamp(24px,3.2vw,56px);right:clamp(20px,2.4vw,40px);max-width:none;bottom:auto;top:50%;transform:translateY(calc(-50% + 24px))}}
#ehx .panel.on{{transform:translateY(-50%)}}
#ehx #hud{{right:calc(62% + 28px);left:clamp(24px,3.2vw,56px)}}
#ehx #docs{{right:2.5vw;width:min(55vw,860px)}}
#ehx #hint{{display:none}}
@media(max-width:700px){{
 #ehx canvas,#ehx #spots{{left:0;width:100%;top:0;height:54%;bottom:auto;border-left:0;border-bottom:1px solid rgba(0,99,65,.12)}}
 #ehx #panels{{top:54%;bottom:44px;width:100%}}
 #ehx .panel{{left:16px;right:16px;top:14px;transform:translateY(14px)}}#ehx .panel.on{{transform:none}}
 #ehx #hud{{left:16px;right:16px;bottom:14px}}
 #ehx #docs{{left:10px;right:10px;width:auto;top:10px}}
}}
#ehx #loading{{background:#fff;color:var(--g)}}
#ehx .eyebrow{{color:var(--o);font:600 12px "Signika",sans-serif;letter-spacing:.18em}}
#ehx .panel h2{{font-family:"Anton",sans-serif;font-weight:400;text-transform:uppercase;letter-spacing:.01em;line-height:1.02;color:var(--n);font-size:clamp(30px,4.2vw,54px)}}
#ehx .panel p{{color:var(--text);font-family:"Signika",sans-serif}}
#ehx .panel .why{{color:#4a5a70;border-left-color:var(--g)}}#ehx .panel .why b{{color:var(--g)}}
#ehx .panel li{{border-color:rgba(0,99,65,.45);background:rgba(0,99,65,.07);color:var(--g);font-family:"Signika",sans-serif}}
#ehx .go{{background:var(--o);color:var(--n);border-radius:0;font:400 16px "Anton",sans-serif;letter-spacing:.04em;text-transform:uppercase}}
#ehx .go::after{{content:" \\25B8"}}
#ehx #bar{{background:rgba(19,41,75,.15)}}#ehx #fill{{background:var(--g)}}
#ehx #dots i{{background:#fff;border-color:rgba(19,41,75,.35)}}#ehx #dots i.done{{background:var(--g);border-color:var(--g)}}
#ehx #count,#ehx #hint{{color:var(--n)}}
#ehx .spot i{{background:var(--o);box-shadow:0 0 0 4px rgba(229,129,23,.28),0 0 12px rgba(229,129,23,.8);animation:none}}
#ehx .spot span{{background:#fff;border-color:var(--g);color:var(--n);box-shadow:0 2px 8px rgba(19,41,75,.12);font-family:"Signika",sans-serif}}
#ehx #plan{{top:16px;background:rgba(255,255,255,.92);border-color:rgba(0,99,65,.3)}}#ehx #plan .t{{color:var(--g)}}
#ehx #planSvg>rect:not(.eq){{fill:#f6f8f7;stroke:var(--g)}}#ehx #planSvg line{{stroke:var(--o)}}
#ehx #plan rect.eq{{fill:rgba(19,41,75,.14);stroke:rgba(19,41,75,.35)}}#ehx #plan rect.eq.on{{fill:var(--o);stroke:var(--n)}}
#ehx #planSvg path{{fill:rgba(229,129,23,.35)}}#ehx #planSvg circle{{fill:var(--n);stroke:var(--o)}}
#ehx #dark{{background:#0b1a14}}
/* on the dark records screen the panel switches to light text */
body.dark-on #ehx .panel h2{{color:#fff}}body.dark-on #ehx .panel p{{color:#d5e2db}}body.dark-on #ehx .panel .why{{color:#b8cbc1}}body.dark-on #ehx .panel .why b{{color:#7fd3a8}}
body.dark-on #ehx .panel li{{color:#d5efe2;border-color:rgba(127,211,168,.5);background:rgba(0,99,65,.35)}}
body.dark-on #ehx #count{{color:#fff}}body.dark-on #ehx #dots i{{background:#0b1a14}}
@media(max-width:700px){{#ehx #plan{{top:10px}}#ehx #docs .scr{{height:min(32vh,260px)}}#ehx .panel h2{{font-size:28px}}#ehx .panel p{{font-size:14px}}}}

/* recording mode: no site header, no CSS transitions (frames are rendered one by one) */
body.rec .hb{{display:none}}body.rec #ehx *{{transition:none!important;animation:none!important}}
'''

header = f'''<header class="hb" id="hb">
 <div class="hb-top">Your global resource for specialty modular structures</div>
 <div class="hb-in">
  <a class="hb-logo" href="{LINK}/"><img src="/e-house-tour/brand/hunter-logo.svg" alt="Hunter. On Every Front." width="244" height="56"></a>
  <div class="hb-util"><a class="q" href="{QUOTE}">Request a quote &#9656;</a>{''.join(f'<a href="{LINK}{u}">{t}</a>' for t, u in UTIL)}</div>
  <button class="hb-burger" id="hbBurger" aria-label="Open menu" aria-expanded="false">&#9776;</button>
 </div>
 <nav class="hb-nav" aria-label="Main">{''.join(f'<a href="{LINK}{u}">{t}</a>' for t, u in NAV)}</nav>
 <nav class="hb-menu" aria-label="Menu">{''.join(f'<a href="{LINK}{u}">{t}</a>' for t, u in NAV + UTIL)}<a class="q" href="{QUOTE}">Request a quote</a></nav>
</header>'''

page = f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Hunter E-House Walkthrough</title>
<meta name="description" content="Walk inside a Hunter e-house: switchgear, controls, batteries, drives and building systems, built in the factory and verified on site.">
<meta name="robots" content="noindex, nofollow">
<link rel="icon" href="/e-house-tour/brand/hunter-logo.svg">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Anton&family=Open+Sans:wght@400;600;700&family=Signika:wght@300;400;600;700&display=swap">
<style>
{scope(css)}
{theme}
</style>
</head>
<body data-tour="hunter">
<main id="ehx">
{body}
</main>
<script type="importmap">{{"imports":{{"three":"/e-house-tour/vendor/three.module.js"}}}}</script>
<script type="module" src="/e-house-tour/app.js"></script>
<script>
(function(){{

}})();
</script>
</body>
</html>
'''

os.makedirs(OUT, exist_ok=True)
t = os.path.join(OUT, 'e-house-tour')
for sub in ('vendor', 'brand', 'evidence'):
    shutil.copytree(os.path.join(ROOT, 'ehouse', sub), os.path.join(t, sub), dirs_exist_ok=True)
for f in ('index.html', 'app.js'):
    shutil.copy(os.path.join(ROOT, 'ehouse', f), os.path.join(t, f))
open(os.path.join(OUT, 'index.html'), 'w', encoding='utf-8').write(page)
print('wrote', OUT)
