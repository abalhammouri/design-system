import * as THREE from 'three';
import {GLTFLoader} from './vendor/GLTFLoader.js';

const STAGES=[
 [1,40,'01 · Overview','One unit. Fully built, tested, ready to energize.','A CSI e-house is a prefabricated, climate-controlled power building: switchgear, MCCs, UPS, batteries, bus duct and building systems, integrated and proven in the factory.',['Switchgear','MCCs','Bus duct','Batteries']],
 [40,90,'02 · Construction','Frame, walls and roof come together.','A welded steel skid and frame carry insulated wall panels and a roof with rooftop HVAC, built to the site loading, thermal and corrosion requirements.',['Skid base','Insulated panels','Lifting lugs']],
 [90,140,'03 · Equipment integration','Every cabinet, rack and tray goes in place.','Switchgear, motor control centers, UPS and battery racks are set, bussed and wired, with HVAC, lighting and fire alarm installed around them.',['HVAC','Lighting','Fire alarm','Cable tray']],
 [140,170,'04 · Quality checks','Inspected before anything is energized.','Torque, clearances, labelling, wiring and construction are checked against drawings and the project quality plan.',['Wiring','Torque','Labelling']],
 [170,200,'05 · Factory acceptance testing','Proven on our floor, witnessed by yours.','Functional, protection and interlock tests run on the complete assembly, with the customer invited to witness and sign off.',['FAT','Protection','Interlocks']],
 [200,230,'06 · Off-site commissioning','Systems commissioned before they ship.','Power, controls and building systems are brought up together so integration issues are found in the factory, not in the field.',['Controls','Power-up','Integration']],
 [230,260,'07 · Documentation and handover','The record ships with the building.','Test reports, as-builts, manuals and certificates are compiled and handed over with the unit.',['Reports','As-builts','Manuals']],
 [260,300,'08 · SAT / NETA testing','Set on site. Verified. Energized.','After transport and placement, site acceptance and NETA testing confirm the e-house performs as proven in the factory.',['SAT','NETA','Energization']]
];
// Blender frame -> camera/target (Blender Z-up -> glTF Y-up: x, z, -y)
const CAM={1:[[13,-11,5.2],[0,0,1.8]],40:[[13,-11,5.2],[0,0,1.8]],60:[[11,-9,9],[0,0,2]],90:[[10,-9.5,8.5],[0,0,2]],125:[[9,-6.5,6],[0,0,2]],145:[[7,-8.2,3.4],[0,0,1.6]],175:[[3.5,-6,2.5],[1.5,0,1.4]],205:[[-3,-5.8,2.7],[-3,1,1.4]],235:[[4.5,-3,2],[0,0,1.2]],265:[[15,-8,4],[0,0,1.8]],300:[[9,12,6],[0,0,1.8]]};
const KEYS=Object.keys(CAM).map(Number).sort((a,b)=>a-b);
const toV=a=>new THREE.Vector3(a[0],a[2],-a[1]);
const ease=t=>t*t*(3-2*t);
function camAt(f){
  let i=0;while(i<KEYS.length-2&&f>KEYS[i+1])i++;
  const a=KEYS[i],b=KEYS[i+1],t=ease(Math.min(1,Math.max(0,(f-a)/(b-a))));
  return {p:toV(CAM[a][0]).lerp(toV(CAM[b][0]),t),l:toV(CAM[a][1]).lerp(toV(CAM[b][1]),t)};
}

const stage=document.getElementById('stage');
const canvas=document.getElementById('c');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=parseFloat(document.body.dataset.exposure||1.05);
const scene=new THREE.Scene();
const camera=new THREE.PerspectiveCamera(35,1,0.1,200);
scene.add(new THREE.HemisphereLight(0xcfe3ff,0x1a2c48,1.1));
const sun=new THREE.DirectionalLight(0xffffff,2.6);
sun.position.set(10,16,8);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);
Object.assign(sun.shadow.camera,{left:-16,right:16,top:16,bottom:-16,near:1,far:60});sun.shadow.bias=-0.0005;
scene.add(sun);
const inner=new THREE.PointLight(0xdfeaff,60,18,1.6);inner.position.set(0,2.9,0);scene.add(inner);const inner2=inner.clone();inner2.position.set(-4,2.9,0);scene.add(inner2);const inner3=inner.clone();inner3.position.set(4,2.9,0);scene.add(inner3);
const fillLight=new THREE.DirectionalLight(0x5AA5D9,0.9);fillLight.position.set(-12,6,-10);scene.add(fillLight);

let mixer,southWall;
const loading=document.getElementById('loading');
new GLTFLoader().load('./ehouse.glb',g=>{
  g.scene.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});
  const gr=g.scene.getObjectByName('Ground');if(gr)gr.visible=false;
  southWall=g.scene.getObjectByName('ANIM_Wall_South');
  const catcher=new THREE.Mesh(new THREE.PlaneGeometry(80,80),new THREE.ShadowMaterial({opacity:0.35}));
  catcher.rotation.x=-Math.PI/2;catcher.position.y=0.001;catcher.receiveShadow=true;scene.add(catcher);
  scene.add(g.scene);
  mixer=new THREE.AnimationMixer(g.scene);
  g.animations.forEach(c=>mixer.clipAction(c).play());
  mixer.setTime(0);
  loading.style.opacity=0;setTimeout(()=>loading.remove(),700);
},undefined,()=>{loading.textContent='COULD NOT LOAD MODEL'});

const panels=document.getElementById('panels'),dots=document.getElementById('dots');
const track=document.getElementById('track');
const maxScroll=()=>track.offsetHeight-innerHeight;
function scrollToFrame(f){scrollTo({top:(f-1)/299*maxScroll(),behavior:'smooth'})}
STAGES.forEach(s=>{
  panels.insertAdjacentHTML('beforeend','<section class="panel"><div class="eyebrow">'+s[2]+'</div><h2>'+s[3]+'</h2><p>'+s[4]+'</p><ul>'+s[5].map(t=>'<li>'+t+'</li>').join('')+'</ul></section>');
  const d=document.createElement('i');d.title=s[2];d.onclick=()=>scrollToFrame(s[0]);dots.appendChild(d);
});
const els=[...panels.children],dEls=[...dots.children];
const fillBar=document.getElementById('fill'),count=document.getElementById('count'),hint=document.getElementById('hint');

let target=0,cur=0;
const read=()=>{target=Math.min(1,Math.max(0,scrollY/maxScroll()))};
addEventListener('scroll',read,{passive:true});read();cur=target;
function resize(){const w=stage.clientWidth,h=stage.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.fov=w/h<0.8?55:35;const sh=parseFloat(document.body.dataset.shift||0);if(sh&&w/h>=0.8)camera.setViewOffset(w,h,-w*sh,0,w,h);else camera.clearViewOffset();camera.updateProjectionMatrix()}
addEventListener('resize',resize);resize();

let active=-1;
function frame(){
  cur+=(target-cur)*0.12;
  const f=1+cur*299;
  if(mixer)mixer.setTime((f-1)/24);
  if(southWall)southWall.visible=!(f>=140&&f<262);
  const c=camAt(f);if(camera.aspect<0.8)c.p.sub(c.l).multiplyScalar(1.4).add(c.l);camera.position.copy(c.p);camera.lookAt(c.l);
  const idx=STAGES.findIndex(s=>f>=s[0]&&f<s[1]);const a=idx<0?STAGES.length-1:idx;
  if(a!==active){active=a;els.forEach((e,i)=>e.classList.toggle('on',i===a));dEls.forEach((d,i)=>d.classList.toggle('done',i<=a));count.textContent=String(a+1).padStart(2,'0')+' / 08'}
  fillBar.style[document.body.dataset.vert?'height':'width']=(cur*100)+'%';hint.style.opacity=cur>0.02?0:1;
  renderer.render(scene,camera);requestAnimationFrame(frame);
}
frame();
