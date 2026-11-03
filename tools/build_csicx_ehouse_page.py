"""Build the E-House Solutions page as a clone of csicx.com/en/services/commissioning.

Usage: python3 -I build_clone.py <source commissioning html> <output site dir>
"""
import re, sys, os, html

src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
lines = s.split('\n')

# ---------- content ----------
SECTIONS = [
 dict(id='e-house-design-engineering', title='E-House Design & Engineering', img='ehouse-60.webp', stop=4,
  intro='Every e-house starts from your single-line diagram. We size the building around the equipment and the people who will work in it, then engineer the structure, building systems and interconnections as one package.',
  overview='Design & Engineering covers the electrical, structural and building-systems design of the e-house: equipment layout, working clearances and egress, arc-flash venting, HVAC and heat-load sizing, fire detection and suppression, lighting, grounding and cable routing.',
  approach="CSI's multidisciplinary team develops the layout from the single-line diagram and equipment data, checks working space and egress against the adopted NEC edition and the equipment manufacturers' requirements, and coordinates the structural skid, lifting points and shipping splits with transport limits from the start.",
  value='A building designed around its equipment avoids late re-layouts, oversized footprints and field modifications. Clearances, venting and building systems are resolved on paper, where changes are cheap.',
  faqs=[('What information do you need to start an e-house design?','A single-line diagram, the equipment list with vendor data where available, site conditions (climate, seismic and wind loads, hazardous-area classification) and the delivery route. We can start from a preliminary single-line and refine as equipment is selected.'),
        ('How do you decide the size of the e-house?','Size follows from the equipment footprint, the working clearances and egress paths required in front of each lineup, arc-flash venting needs, and shipping limits. Larger e-houses are built in splits and joined on site.'),
        ('Can existing equipment or a client-specified vendor be used?','Yes. We design around the equipment your project specifies and coordinate directly with the vendors for drawings, weights, heat loads and installation requirements.')]),
 dict(id='e-house-integration-qc', title='Factory Integration & Quality Control', img='ehouse-50.webp', stop=3,
  intro='Switchgear, MCCs, drives, UPS, batteries and building systems are set, bussed and wired inside the building in a controlled factory environment.',
  overview='Factory Integration & Quality Control covers equipment setting and anchoring, bus duct and cable installation, control wiring, building-systems installation and the inspections that verify each step against the drawings and the project quality plan.',
  approach="CSI's QA/QC engineers inspect torque, clearances, labelling, wiring terminations and construction at defined hold points, record every check, and close non-conformances before the building moves to testing.",
  value='Work done indoors is faster, cleaner and easier to inspect than work done in the field. Issues are caught at the bench, not during energization.',
  faqs=[('Which inspections are performed during integration?','Typical hold points include receipt inspection of equipment, anchoring and alignment, bus and cable termination torque, point-to-point wiring checks, labelling, grounding continuity and building-systems installation checks.'),
        ('Can the owner or engineer of record attend inspections?','Yes. Inspection and test plans identify witness and hold points, and clients are invited to attend any of them in person or remotely.')]),
 dict(id='e-house-fat', title='Factory Acceptance Testing (FAT)', img='ehouse-41.webp', stop=12,
  intro='Before the e-house leaves the factory, the complete assembly is tested as a working system, with your team invited to witness and sign off.',
  overview='Factory Acceptance Testing verifies that the integrated e-house performs to the specification: insulation and continuity testing, protective relay and interlock testing, control and SCADA functional checks, UPS and DC system testing, and building systems such as HVAC, fire alarm and lighting.',
  approach='CSI prepares the FAT procedures from the project specification and drawings, runs the tests with calibrated equipment, records every result, and manages a punch list to closure before shipment is released.',
  value='Problems found in the factory cost a fraction of what they cost on site. A witnessed FAT gives the owner confidence and evidence before the building ships.',
  faqs=[('What does a typical e-house FAT include?','Insulation resistance and hi-pot testing, primary and secondary injection of protective relays, breaker and interlock functional tests, control and communication checks, UPS and battery tests, and functional tests of HVAC, lighting and fire detection.'),
        ('How long does a FAT take?','It depends on the size and complexity of the e-house. A single-module building can often be tested in days; multi-module projects with extensive controls take longer. The schedule is agreed in the FAT procedure.'),
        ('Can a FAT be witnessed remotely?','Yes. We can stream tests and share results live for stakeholders who cannot travel, alongside in-person witnesses.')]),
 dict(id='e-house-offsite-commissioning', title='Off-Site Commissioning', img='ehouse-110.webp', stop=9,
  intro='Power, controls and building systems are brought up together in the factory, so integration issues are found before the e-house is on a truck.',
  overview='Off-Site Commissioning energizes and operates the e-house systems as they will run in service, verifying sequences of operation, alarms, communications to the plant control system, and the interaction between electrical and building systems.',
  approach="CSI's commissioning engineers apply the same structured process used on our site commissioning work: documented pre-functional checks, functional performance tests, issue tracking and verification of fixes before handover to transport.",
  value='Commissioning in the factory shortens site startup, reduces the number of people needed on site and lowers the risk of delays at energization.',
  faqs=[('What is the difference between FAT and off-site commissioning?','FAT verifies that equipment and assemblies meet the specification. Off-site commissioning goes further and operates the integrated systems together, verifying sequences, alarms and communications as they will run on site.'),
        ('Does off-site commissioning replace site commissioning?','No. It moves most of the work into the factory, so site commissioning is shorter and focuses on interconnections, site-specific systems and final performance verification.')]),
 dict(id='e-house-sat-neta', title='Site Acceptance & NETA Testing', img='ehouse-154.webp', stop=13,
  intro='After transport and setting, the e-house is reconnected, re-tested and energized on site.',
  overview='Site Acceptance Testing confirms the e-house arrived undamaged and performs as it did in the factory. It includes NETA acceptance testing of the electrical equipment, verification of field interconnections and a supervised first energization.',
  approach="CSI's NETA-certified technicians perform acceptance testing to ANSI/NETA ATS, verify the field terminations and interconnections, and coordinate energization with the owner, utility and contractors.",
  value='The owner receives independent, standards-based evidence that the equipment is safe and ready for service, and a single team accountable from factory to energization.',
  faqs=[('Why is testing needed again on site?','Transport, lifting and setting can disturb connections and equipment. Site acceptance and NETA testing confirm nothing changed and verify the field connections made after delivery.'),
        ('Which standard is used for acceptance testing?','Electrical acceptance testing is performed to ANSI/NETA ATS, the Standard for Acceptance Testing Specifications for Electrical Power Equipment and Systems, together with the project specification.')]),
 dict(id='e-house-documentation-handover', title='Documentation & Handover', img='ehouse-20.webp', stop=1,
  intro='The record ships with the building.',
  overview='Documentation & Handover compiles the test reports, as-built drawings, operation and maintenance manuals, certificates and training material for the e-house into a complete, organized turnover package.',
  approach='CSI collects documentation throughout design, integration and testing rather than at the end, reviews it for completeness, and delivers it in the format your facility team uses, with training for operators and maintenance staff.',
  value='Complete records make operation, maintenance and future modifications faster and safer, and support warranty and compliance requirements.',
  faqs=[('What is included in the turnover package?','Typically: as-built drawings, FAT and SAT reports, NETA test reports, relay settings, equipment manuals and data sheets, spare parts lists, certificates and training records.'),
        ('Can documentation be delivered digitally?','Yes. Turnover packages can be delivered as organized digital files or loaded into the owner\'s document management or CMMS platform.')]),
]

H1 = 'E-House Solutions'
LEAD = ('Prefabricated, climate-controlled power buildings that receive, protect and distribute power for your site. '
        'We engineer, integrate, test and commission every e-house in a controlled factory, then verify it on site so it is ready to energize.')
TOUR = '/e-house-tour/'

def faq_block(sec):
    acc = 'acc' + re.sub(r'[^A-Za-z]', '', sec['id'].title())[:24]
    out = [f'<h5>Related FAQs</h5>', f'<div class="accordion faq-wrapper-inner-page mt--50" id="{acc}" style="padding-bottom:50px;">']
    for i, (q, a) in enumerate(sec['faqs'], 1):
        first = i == 1
        out.append(f'''<div class="accordion-item">
  <h2 class="accordion-header" id="h{acc}{i}">
    <button class="accordion-button{'' if first else ' collapsed'}" type="button" data-bs-toggle="collapse" data-bs-target="#c{acc}{i}" aria-expanded="{'true' if first else 'false'}" aria-controls="c{acc}{i}">{i:02d}. {html.escape(q)}</button>
  </h2>
  <div id="c{acc}{i}" class="accordion-collapse collapse{' show' if first else ''}" aria-labelledby="h{acc}{i}" data-bs-parent="#{acc}">
    <div class="accordion-body">{html.escape(a)}</div>
  </div>
</div>''')
    out.append('</div>')
    return '\n'.join(out)

def section(sec):
    return f'''
<div class="py-5 border-bottom" style="border-color: rgba(32,40,45,0.2);">
  <div class="row mb-4"><div class="col-12">
    <h4 class="title text-center text-md-start anchor-offset" id="{sec['id']}">{html.escape(sec['title'])}</h4>
  </div></div>
  <div class="row align-items-center">
    <div class="col-md-4 mb-3 mb-md-0 d-flex justify-content-center">
      <button type="button" class="ehx-thumb" data-stop="{sec['stop']}" aria-label="Open the 3D walkthrough at {html.escape(sec['title'])}">
        <img loading="lazy" src="/img/Services/EHouse/{sec['img']}" alt="{html.escape(sec['title'])}" class="img-fluid rounded">
        <span class="ehx-thumb-tag">3D view</span>
      </button>
    </div>
    <div class="col-md-8"><div class="inner ps-md-4"><p class="disc">{html.escape(sec['intro'])}</p></div></div>
  </div>
  <div class="row mt-4"><div class="col-12">
    <p class="disc"><strong>Service Overview:</strong> {html.escape(sec['overview'])}</p>
    <p class="disc"><strong>CSI Approach:</strong> {html.escape(sec['approach'])}</p>
    <p class="disc"><strong>Value to the project:</strong> {html.escape(sec['value'])}</p>
    {faq_block(sec)}
  </div></div>
</div>'''

STOPS = [('The building',1),('Step inside',2),('MV switchgear',3),('Protection & control',4),('Transformer',5),('Battery room',6),
         ('UPS & DC',7),('Drives',8),('MCC',9),('LV switchgear',10),('Building systems',11),('FAT',12),('Site acceptance',13)]

LEFT = f'''
<div class="rts-service-details-area-main-bottom">
    <div class="container">
        <div class="row">
            <div class="col-xl-8">
                <div class="service-details-left-area">
                    <div class="thumbnail ehx-hero">
                        <img src="/img/Services/EHouse/ehouse-20.webp" alt="CSI e-house exterior with entry doors and landing">
                        <div class="ehx-hero-shade"></div>
                        <div class="ehx-hero-copy">
                            <span class="ehx-kicker">Interactive 3D</span>
                            <h3>Walk inside an e-house</h3>
                            <p>Approach the building, step through the door and see every component explained, from medium-voltage switchgear to the battery room.</p>
                            <button type="button" class="rts-btn btn-primary ehx-open" data-stop="0">Start the walkthrough <i class="far fa-long-arrow-right"></i></button>
                        </div>
                    </div>
                    <div class="ehx-stops" aria-label="Jump to a stop in the walkthrough">
                        {''.join(f'<button type="button" class="ehx-stop" data-stop="{n}"><span>{n:02d}</span>{html.escape(t)}</button>' for t,n in STOPS)}
                    </div>
                    <div>
                        <h3 class="title mt-4">Key Benefits</h3>
                        <ul class="disc ps-3">
                            <li><strong>Shorter Project Schedules:</strong> The e-house is built and tested in the factory while site civil work proceeds, so the two run in parallel instead of in sequence.</li>
                            <li><strong>Reduced Field Risk:</strong> Integration, wiring and most testing happen indoors under controlled conditions, which means less rework, fewer field crews and fewer weather delays.</li>
                            <li><strong>Proven Before Delivery:</strong> Factory acceptance testing and off-site commissioning verify the complete system before it ships.</li>
                            <li><strong>Safer by Design:</strong> Working clearances, egress, arc-flash venting and fire protection are engineered into the building from the start.</li>
                            <li><strong>Single Point of Accountability:</strong> One team from design through integration, testing, NETA site acceptance and handover.</li>
                        </ul>

                        <h3 style="padding-top:35px;" class="title mt-4">What's Inside a CSI E-House</h3>
                        <p class="disc fw-bold mb-2">Typical equipment and systems, configured to your single-line diagram:</p>
                        <ul class="disc ps-3">
                            <li><strong>Power Distribution:</strong> Medium-voltage switchgear, dry-type transformers, low-voltage switchgear and bus duct.</li>
                            <li><strong>Motor Control:</strong> Motor control centers and variable frequency drives.</li>
                            <li><strong>Protection &amp; Control:</strong> Protective relays, SCADA / RTU and operator HMI.</li>
                            <li><strong>Backup Power:</strong> UPS, DC chargers and battery systems in a separated, ventilated battery room.</li>
                            <li><strong>Building Systems:</strong> Redundant HVAC, cable tray, lighting and emergency lighting, fire detection and clean-agent suppression.</li>
                        </ul>
                    </div>
                    <div class="container" style="padding-top:50px;">
                        {''.join(section(x) for x in SECTIONS)}
                    </div>
                </div>
            </div>'''

SIDEBAR_CATS = '\n'.join(f'''<ul class="single-categories"><li><a href="#{x['id']}">{html.escape(x['title'])}<i class="far fa-long-arrow-right"></i></a></li></ul>''' for x in SECTIONS)

OVERLAY = f'''
<div class="ehx-modal" id="ehxModal" role="dialog" aria-modal="true" aria-label="E-house 3D walkthrough" hidden>
  <button type="button" class="ehx-close" id="ehxClose" aria-label="Close walkthrough">&times;</button>
  <iframe id="ehxFrame" title="E-house 3D walkthrough" allow="fullscreen"></iframe>
</div>
<style>
.ehx-hero{{position:relative;overflow:hidden;border-radius:6px;background:#0a1a30}}
.ehx-hero img{{display:block;width:100%;aspect-ratio:16/9;object-fit:cover}}
.ehx-hero-shade{{position:absolute;inset:0;background:linear-gradient(90deg,rgba(10,26,48,.88) 0%,rgba(10,26,48,.55) 45%,rgba(10,26,48,0) 75%)}}
.ehx-hero-copy{{position:absolute;left:clamp(20px,4%,44px);top:50%;transform:translateY(-50%);max-width:420px;color:#fff}}
.ehx-kicker{{display:inline-block;font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:#5AA5D9;font-weight:600;margin-bottom:10px}}
.ehx-hero-copy h3{{color:#fff;font-size:clamp(24px,3vw,36px);line-height:1.1;margin:0 0 12px}}
.ehx-hero-copy p{{color:#d6e3f1;font-size:15px;line-height:1.55;margin:0 0 20px}}
.ehx-open{{display:inline-flex;align-items:center;gap:10px;border:0;cursor:pointer}}
.ehx-stops{{display:flex;flex-wrap:wrap;gap:8px;margin:18px 0 10px}}
.ehx-stops .ehx-stop{{width:auto!important;max-width:none!important;flex:0 0 auto;display:inline-flex;align-items:center;margin:0!important;line-height:1.2;border:1px solid rgba(23,62,106,.25);background:#fff;color:#173E6A;border-radius:999px;padding:7px 13px;font-size:13px;font-weight:600;cursor:pointer;transition:.2s}}
.ehx-stops .ehx-stop span{{color:#5AA5D9;margin-right:6px;font-variant-numeric:tabular-nums}}
.ehx-stop:hover,.ehx-stop:focus-visible{{background:#173E6A;color:#fff;border-color:#173E6A}}
.ehx-thumb{{position:relative;display:block;width:100%;padding:0 0 25px;border:0;background:none;cursor:pointer}}
.ehx-thumb img{{object-fit:cover;height:250px;width:100%}}
.ehx-thumb-tag{{position:absolute;left:10px;top:10px;background:rgba(10,26,48,.8);color:#fff;font-size:11px;letter-spacing:.12em;text-transform:uppercase;padding:5px 9px;border-radius:4px}}
.ehx-modal{{position:fixed;inset:0;z-index:100000;background:#0a1a30}}
.ehx-modal[hidden]{{display:none}}
.ehx-modal iframe{{position:absolute;inset:0;width:100%;height:100%;border:0}}
.ehx-close{{position:absolute;z-index:2;top:max(14px,env(safe-area-inset-top));left:50%;transform:translateX(-50%);width:44px;height:44px;border-radius:50%;border:1px solid rgba(255,255,255,.45);background:rgba(10,26,48,.6);color:#fff;font-size:26px;line-height:1;cursor:pointer}}
@media(max-width:767px){{.ehx-hero img{{aspect-ratio:4/5}}.ehx-hero-shade{{background:linear-gradient(0deg,rgba(10,26,48,.92) 0%,rgba(10,26,48,.6) 50%,rgba(10,26,48,0) 80%)}}.ehx-hero-copy{{top:auto;bottom:22px;transform:none;right:20px}}}}
</style>
<script>
(function(){{
  var modal=document.getElementById('ehxModal'),frame=document.getElementById('ehxFrame'),closeBtn=document.getElementById('ehxClose'),last=null;
  function open(stop,btn){{last=btn;frame.src='{TOUR}?embed=1&stop='+(stop||0);modal.hidden=false;document.documentElement.style.overflow='hidden';closeBtn.focus();}}
  function close(){{modal.hidden=true;frame.src='about:blank';document.documentElement.style.overflow='';if(last)last.focus();}}
  document.querySelectorAll('[data-stop]').forEach(function(b){{b.addEventListener('click',function(){{open(+b.getAttribute('data-stop'),b);}});}});
  closeBtn.addEventListener('click',close);
  document.addEventListener('keydown',function(e){{if(e.key==='Escape'&&!modal.hidden)close();}});
}})();
</script>'''

# ---------- splice ----------
def find(pat, start=0):
    for i in range(start, len(lines)):
        if pat in lines[i]:
            return i
    raise SystemExit('not found: ' + pat)

a = find('<div class="rts-service-details-area-main-bottom">')
b = find('<div class="col-xl-4 col-md-12', a)
lines[a:b] = LEFT.split('\n')
s = '\n'.join(lines)

# sidebar categories
s = re.sub(r'(<h5 class="title">\s*)Commissioning Services(\s*</h5>)', r'\1E-House Solutions\2', s, count=1)
s = re.sub(r'(<div class="wized-body">\s*<!-- single categories -->).*?(</div>\s*\n\s*</div>\s*<!-- single wizered End -->)',
           lambda m: m.group(1) + '\n' + SIDEBAR_CATS + '\n' + m.group(2), s, count=1, flags=re.S)

# hero
s = re.sub(r'<h1 class="title rts-text-anime-style-1".*?</h1>', f'<h1 class="title rts-text-anime-style-1">{H1}</h1>', s, count=1, flags=re.S)
s = re.sub(r'(<p class="disc" style="padding-bottom:50px;">).*?(</p>)', lambda m: m.group(1) + '\n' + LEAD + '\n' + m.group(2), s, count=1, flags=re.S)
s = s.replace('<span class="bg-title">Business</span>', '<span class="bg-title">E-House</span>', 1)

# head
s = s.replace('<title>CSI Engineering - Commissioning Services</title>', '<title>CSI Engineering - E-House Solutions</title>\n    <meta name="robots" content="noindex, nofollow">')
s = re.sub(r'(<meta name="description" content=")[^"]*(")', r'\1' + 'CSI Engineering e-house solutions: design, factory integration, FAT, off-site commissioning, NETA site acceptance and handover of prefabricated power buildings.' + r'\2', s, count=1)

# menus: add the new page under Solutions, after Mission Critical
s = s.replace('<li><a href="https://www.csicx.com/en/services/mission-critical">Mission Critical <span>›</span></a></li>',
              '<li><a href="https://www.csicx.com/en/services/mission-critical">Mission Critical <span>›</span></a></li>\n<li><a href="/en/services/e-house/">E-House Solutions <span>›</span></a></li>')
s = s.replace('<li><a href="https://www.csicx.com/en/services/mission-critical">Mission Critical</a></li>',
              '<li><a href="https://www.csicx.com/en/services/mission-critical">Mission Critical</a></li>\n<li><a href="/en/services/e-house/">E-House Solutions</a></li>')

# local assets; site links stay pointed at the live site
s = re.sub(r'https://www\.csicx\.com/(css|js|img|fonts)/', r'/\1/', s)
s = s.replace('href="/Contact-us"', 'href="https://www.csicx.com/en/contact-us"').replace('href="/Home"', 'href="https://www.csicx.com/en"')

# overlay before </body>
s = s.replace('</body>', OVERLAY + '\n</body>', 1)

os.makedirs(os.path.join(out, 'en/services/e-house'), exist_ok=True)
open(os.path.join(out, 'en/services/e-house/index.html'), 'w', encoding='utf-8').write(s)
open(os.path.join(out, 'index.html'), 'w').write('<!doctype html><meta charset="utf-8"><meta name="robots" content="noindex"><meta http-equiv="refresh" content="0;url=/en/services/e-house/"><a href="/en/services/e-house/">E-House Solutions</a>\n')
print('ok', len(s))
