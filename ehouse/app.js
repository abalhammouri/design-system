import * as THREE from 'three';
import {mergeGeometries} from './vendor/BufferGeometryUtils.js';
import {RoomEnvironment} from './vendor/RoomEnvironment.js';

/* ------------------------------------------------------------------
   CSI e-house walkthrough.
   Units are metres. x runs along the building (entry door at -x, the
   left end as seen from the front), z across it (+z is the front wall),
   y is up. Interior: 18 m long, 6 m wide, 3.6 m clear height.
------------------------------------------------------------------- */
const F=0.65;               // finished floor height (on the skid)
const C=F+3.6;              // ceiling
const X0=-9,X1=9,Z0=-3,Z1=3,T=0.15;
const XE0=X0-T,XE1=X1+T,ZE0=Z0-T,ZE1=Z1+T;
const WT=C+0.12;            // top of walls
const DOOR={z0:-0.7,z1:1.1,h:2.4};

const stage=document.getElementById('stage');
const canvas=document.getElementById('c');
const isPhone=matchMedia('(max-width:700px)').matches;
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,isPhone?1.75:2));
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=0.95;
const scene=new THREE.Scene();
const pmrem=new THREE.PMREMGenerator(renderer);
scene.environment=pmrem.fromScene(new RoomEnvironment(),0.04).texture;
scene.environmentIntensity=0.55;
const camera=new THREE.PerspectiveCamera(40,1,0.05,300);

/* ---------------- materials ---------------- */
const MDEF={
 clad:{color:0xdfe4ea,roughness:.5,metalness:.35},
 cobalt:{color:0x284890,roughness:.45,metalness:.3},
 hgreen:{color:0x006341,roughness:.45,metalness:.3},
 hnavy:{color:0x13294B,roughness:.45,metalness:.3},
 horange:{color:0xE58117,roughness:.45,metalness:.25},
 pants:{color:0x2b3442,roughness:.85,metalness:0},
 shirt:{color:0x173E6A,roughness:.85,metalness:0},
 vest:{color:0xc8f02a,roughness:.7,metalness:0,emissive:0x2a3300,emissiveIntensity:.25},
 vestO:{color:0xff7a1a,roughness:.7,metalness:0,emissive:0x331400,emissiveIntensity:.25},
 refl:{color:0xe8ecf0,roughness:.25,metalness:.8},
 skin:{color:0xc68e6a,roughness:.7,metalness:0},
 skin2:{color:0x8d5a3b,roughness:.7,metalness:0},
 hat:{color:0xf5f6f2,roughness:.35,metalness:0},
 sky:{color:0x5AA5D9,roughness:.4,metalness:.2},
 steel:{color:0x2a313b,roughness:.5,metalness:.6},
 galv:{color:0xaab2bb,roughness:.35,metalness:.85},
 concrete:{color:0x5d6672,roughness:.95,metalness:0},
 lining:{color:0xe6eaee,roughness:.85,metalness:0},
 ceiling:{color:0xf0f2f4,roughness:.9,metalness:0},
 floor:{color:0x858c95,roughness:.28,metalness:.05},
 ansi:{color:0xbfc5c9,roughness:.42,metalness:.3},
 ansiDark:{color:0x9aa1a7,roughness:.5,metalness:.3},
 face:{color:0x2f353d,roughness:.5,metalness:.3},
 black:{color:0x14171b,roughness:.6,metalness:.1},
 rubber:{color:0x1b1e21,roughness:.95,metalness:0},
 yellow:{color:0xe3b100,roughness:.6,metalness:0},
 red:{color:0xb3202a,roughness:.4,metalness:.25},
 white:{color:0xf2f2ee,roughness:.6,metalness:0},
 copper:{color:0xb8733a,roughness:.35,metalness:1},
 batt:{color:0x30353b,roughness:.6,metalness:.05},
 green:{color:0x2f8f5b,roughness:.6,metalness:0},
 glass:{color:0xa8d0f0,roughness:.05,metalness:0,transparent:true,opacity:.14,depthWrite:false},
 darkglass:{color:0x0e1620,roughness:.1,metalness:.3},
 grating:{color:0x66707c,roughness:.6,metalness:.6},
 lamp:{color:0xffffff,emissive:0xf4f8ff,emissiveIntensity:0,roughness:.4},
 screen:{color:0x0b1a2a,emissive:0x5aa5d9,emissiveIntensity:.9,roughness:.3},
 screenG:{color:0x06140c,emissive:0x3ddc84,emissiveIntensity:.8,roughness:.3},
 ledG:{color:0x0a2a14,emissive:0x2bff7a,emissiveIntensity:1.6},
 ledR:{color:0x2a0a0a,emissive:0xff3b30,emissiveIntensity:1.6},
 ledA:{color:0x2a1a00,emissive:0xffb020,emissiveIntensity:1.6},
 exit:{color:0x1a0505,emissive:0xff2a2a,emissiveIntensity:1.4},
 beacon:{color:0x2a1a00,emissive:0xffb020,emissiveIntensity:2},
 walllamp:{color:0xffffff,emissive:0xfff4dc,emissiveIntensity:0}
};
const EMIS=new Set(['lamp','screen','screenG','ledG','ledR','ledA','exit','beacon','walllamp','glass']);
// page theme: data-tour="hunter" on <body> switches copy, accent and contact link
const THEME=document.body.dataset.tour||'csi';
const GLOW=new THREE.Color(THEME==='hunter'?0x1f9a62:0x3d8fd6);
const LAMPS=[];      // materials that follow the interior lights
let beaconMat=null;

/* ---------------- geometry builder ---------------- */
const PARTS={};
class Part{
 constructor(name,{interior=true,parent=scene}={}){this.name=name;this.interior=interior;this.geo={};this.obj=new THREE.Group();this.obj.name=name;this.mats=[];parent.add(this.obj);PARTS[name]=this}
 add(g,m){(this.geo[m]??=[]).push(g);return g}
 bb(x0,y0,z0,x1,y1,z1,m){const g=new THREE.BoxGeometry(Math.abs(x1-x0),Math.abs(y1-y0),Math.abs(z1-z0));g.translate((x0+x1)/2,(y0+y1)/2,(z0+z1)/2);return this.add(g,m)}
 cyl(r,h,x,y,z,m,axis='y',seg=18,rTop){const g=new THREE.CylinderGeometry(rTop??r,r,h,seg);if(axis==='x')g.rotateZ(Math.PI/2);if(axis==='z')g.rotateX(Math.PI/2);g.translate(x,y,z);return this.add(g,m)}
 torus(r,t,x,y,z,m,ry=0){const g=new THREE.TorusGeometry(r,t,8,24);if(ry)g.rotateY(ry);g.translate(x,y,z);return this.add(g,m)}
 // a sloped bar between two points (square section s)
 bar(a,b,s,m){const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b);const len=A.distanceTo(B);const g=new THREE.BoxGeometry(s,len,s);const q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),B.clone().sub(A).normalize());g.applyQuaternion(q);g.translate((A.x+B.x)/2,(A.y+B.y)/2,(A.z+B.z)/2);return this.add(g,m)}
 cap(a,b,r,m){const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b);const g=new THREE.CapsuleGeometry(r,Math.max(0.001,A.distanceTo(B)),4,12);g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),B.clone().sub(A).normalize()));g.translate((A.x+B.x)/2,(A.y+B.y)/2,(A.z+B.z)/2);return this.add(g,m)}
 raw(g,m){return this.add(g,m)}
 sph(r,x,y,z,m){const g=new THREE.SphereGeometry(r,14,10);g.translate(x,y,z);return this.add(g,m)}
 // run fn and apply matrix mt to every geometry it added
 at(mt,fn){const b={};for(const k in this.geo)b[k]=this.geo[k].length;fn();for(const k in this.geo)for(let i=b[k]||0;i<this.geo[k].length;i++)this.geo[k][i].applyMatrix4(mt)}
 build(){
  for(const [k,list] of Object.entries(this.geo)){
   const mat=new THREE.MeshStandardMaterial(MDEF[k]);mat.userData.key=k;mat.userData.env=1;
   if(k==='lamp'||k==='walllamp')LAMPS.push(mat);if(k==='beacon')beaconMat=mat;
   const mesh=new THREE.Mesh(mergeGeometries(list,false),mat);
   mesh.castShadow=k!=='glass'&&k!=='lamp';mesh.receiveShadow=k!=='glass';
   if(k==='glass')mesh.renderOrder=2;
   this.obj.add(mesh);this.mats.push(mat);
  }
  this.geo={};return this;
 }
 glow(v){for(const m of this.mats){if(EMIS.has(m.userData.key))continue;m.emissive.copy(GLOW);m.emissiveIntensity=v}}
}
// wall slab with rectangular holes. axis 'x': plane z=c spanning x a0..a1; axis 'z': plane x=c spanning z a0..a1
function slab(P,axis,c,t,a0,a1,y0,y1,holes,m){
 const r=[];let cur=a0;
 for(const [h0,h1,v0,v1] of [...holes].sort((p,q)=>p[0]-q[0])){
  if(h0>cur)r.push([cur,h0,y0,y1]);if(v0>y0)r.push([h0,h1,y0,v0]);if(v1<y1)r.push([h0,h1,v1,y1]);cur=h1;
 }
 if(cur<a1)r.push([cur,a1,y0,y1]);
 for(const [p0,p1,q0,q1] of r){if(axis==='x')P.bb(p0,q0,c-t/2,p1,q1,c+t/2,m);else P.bb(c-t/2,q0,p0,c+t/2,q1,p1,m)}
}
// canvas text sign. faces +z by default; ry rotates it.
function sign(parent,text,w,h,x,y,z,{ry=0,bg='#f4f4f0',fg='#173E6A',sub=null,stripe=null}={}){
 const cv=document.createElement('canvas');const S=256;cv.width=Math.round(S*w/h);cv.height=S;
 const c=cv.getContext('2d');c.fillStyle=bg;c.fillRect(0,0,cv.width,S);
 if(stripe){c.fillStyle=stripe;c.fillRect(0,0,cv.width,S*.16);c.fillRect(0,S*.84,cv.width,S*.16)}
 c.fillStyle=fg;c.textAlign='center';c.textBaseline='middle';
 c.font=`800 ${sub?S*.34:S*.44}px Inter,Arial,sans-serif`;c.fillText(text,cv.width/2,sub?S*.4:S*.52,cv.width*.92);
 if(sub){c.font=`600 ${S*.2}px Inter,Arial,sans-serif`;c.globalAlpha=.8;c.fillText(sub,cv.width/2,S*.72,cv.width*.92)}
 const tex=new THREE.CanvasTexture(cv);tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=4;
 const mat=new THREE.MeshStandardMaterial({map:tex,roughness:.6,metalness:0});mat.userData.key='sign';mat.userData.env=1;
 const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),mat);m.position.set(x,y,z);m.rotation.y=ry;parent.add(m);return mat;
}
const SIGNMATS=[];
const logoTex=new THREE.TextureLoader().load(new URL('./brand/hunter-logo.png',import.meta.url).href,t=>{t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;t.needsUpdate=true});
function logoPlate(parent,w,y,x,z,ry){
 const h=w/4.35,g=new THREE.Group();g.position.set(x,y,z);g.rotation.y=ry;parent.add(g);
 // layers sit 1.5 cm apart with polygon offset so they never z-fight at a distance (the sign used to flicker)
 const po=(m,u)=>Object.assign(m,{polygonOffset:true,polygonOffsetFactor:-u,polygonOffsetUnits:-4*u});
 const frame=new THREE.Mesh(new THREE.BoxGeometry(w+0.36,h+0.32,0.02),new THREE.MeshStandardMaterial({color:0x006341,roughness:.5}));frame.position.z=0.01;g.add(frame);
 const back=new THREE.Mesh(new THREE.PlaneGeometry(w+0.28,h+0.24),po(new THREE.MeshStandardMaterial({color:0xffffff,roughness:.6}),1));back.position.z=0.035;g.add(back);
 const lm=po(new THREE.MeshStandardMaterial({map:logoTex,transparent:true,depthWrite:false,roughness:.6}),2);lm.userData.key='sign';SIGNMATS.push(lm);
 const logo=new THREE.Mesh(new THREE.PlaneGeometry(w,h),lm);logo.position.z=0.05;logo.renderOrder=2;g.add(logo);
 for(const m of [frame,back,logo]){m.castShadow=false;m.receiveShadow=m!==logo}
}
const S_=(...a)=>SIGNMATS.push(sign(...a));

/* ================= EXTERIOR SHELL ================= */
const shell=new Part('shell',{interior:false});
// concrete pad
shell.bb(-13,-0.3,-6,13,0,6,'concrete');
for(const z of [-3,3])shell.bb(-13,0,z-0.01,13,0.004,z+0.01,'steel');
// structural skid: two main beams + perimeter base frame
for(const s of [-1,1]){shell.bb(XE0-0.1,0,s*2.2,XE1+0.1,0.3,s*2.55,'steel');shell.bb(XE0-0.1,0.27,s*2.1,XE1+0.1,0.3,s*2.65,'steel')}
for(let x=-8;x<=8;x+=2)shell.bb(x-0.08,0.04,-2.3,x+0.08,0.26,2.3,'steel');
shell.bb(XE0-0.02,0.3,ZE0-0.02,XE1+0.02,0.62,ZE1+0.02,'hgreen');          // base channel, painted
shell.bb(XE0-0.03,0.62,ZE0-0.03,XE1+0.03,0.645,ZE1+0.03,'horange');           // accent stripe
// base lifting lugs
for(const x of [-7.6,-2.6,2.6,7.6])for(const s of [-1,1]){
 const z=s*(ZE1+0.02);shell.bb(x-0.16,0.34,z-0.03,x+0.16,0.6,z+0.03,'steel');shell.torus(0.065,0.022,x,0.47,z+s*0.05,'galv');
}
// exterior walls (ribbed insulated panels)
const FRONT_DOOR=[5.2,6.2,F,F+2.2];
slab(shell,'x',Z1+T/2,T,XE0,XE1,0.6,WT,[FRONT_DOOR],'clad');
slab(shell,'x',Z0-T/2,T,XE0,XE1,0.6,WT,[],'clad');
slab(shell,'z',X0-T/2,T,Z0,Z1,0.6,WT,[[DOOR.z0,DOOR.z1,F,F+DOOR.h]],'clad');
slab(shell,'z',X1+T/2,T,Z0,Z1,0.6,WT,[],'clad');
function ribs(axis,c,a0,a1,holes,out){
 for(let a=a0+0.15;a<a1-0.1;a+=0.3){
  const hit=holes.find(h=>a>h[0]-0.08&&a<h[1]+0.08);
  const segs=hit?[[0.66,hit[2]-0.02],[hit[3]+0.1,WT-0.05]]:[[0.66,WT-0.05]];
  for(const [y0,y1] of segs){if(y1-y0<0.1)continue;
   if(axis==='x')shell.bb(a-0.025,y0,c,a+0.025,y1,c+out*0.035,'clad');else shell.bb(c,y0,a-0.025,c+out*0.035,y1,a+0.025,'clad')}
 }
}
ribs('x',ZE1,XE0,XE1,[[FRONT_DOOR[0],FRONT_DOOR[1],F,F+2.2]],1);
ribs('x',ZE0,XE0,XE1,[],-1);
ribs('z',XE0,ZE0,ZE1,[[DOOR.z0,DOOR.z1,F,F+DOOR.h],[-2.95,-2.0,F+2.3,F+3.0]],-1);
ribs('z',XE1,ZE0,ZE1,[],1);
// front wall: intake/exhaust louvers, brand band, conduit entry boxes
for(const x of [-6.6,-0.4]){shell.bb(x-0.75,F+1.9,ZE1,x+0.75,F+2.7,ZE1+0.06,'hgreen');for(let i=0;i<6;i++)shell.bb(x-0.7,F+1.95+i*0.125,ZE1+0.06,x+0.7,F+2.02+i*0.125,ZE1+0.1,'face')}
for(const x of [-6.6,-0.4,3.4])shell.bb(x-0.35,0.66,ZE1,x+0.35,1.06,ZE1+0.12,'galv');
shell.bb(XE0,WT-0.42,ZE1+0.035,XE1,WT-0.34,ZE1+0.06,'horange');
shell.bb(XE0,WT-0.42,ZE0-0.06,XE1,WT-0.34,ZE0-0.035,'horange');
// roof + parapet
shell.bb(XE0-0.06,WT,ZE0-0.06,XE1+0.06,WT+0.16,ZE1+0.06,'clad');
for(const s of [-1,1]){shell.bb(XE0-0.08,WT+0.16,s*(ZE1+0.06)-0.04,XE1+0.08,WT+0.38,s*(ZE1+0.06)+0.04,'hgreen');shell.bb(s*(XE1+0.06)-0.04,WT+0.16,ZE0-0.08,s*(XE1+0.06)+0.04,WT+0.38,ZE1+0.08,'hgreen')}
// roof lifting lugs
for(const x of [-8.3,8.3])for(const z of [-2.7,2.7]){shell.cyl(0.07,0.18,x,WT+0.25,z,'steel');shell.torus(0.11,0.03,x,WT+0.45,z,'galv',Math.PI/2)}
// rooftop HVAC (two redundant packaged units)
for(const x of [-5.2,1.2]){
 shell.bb(x-1.1,WT+0.16,-1.0,x+1.1,WT+1.05,0.9,'clad');shell.bb(x-1.12,WT+1.05,-1.02,x+1.12,WT+1.1,0.92,'hgreen');
 for(const dx of [-0.5,0.5]){shell.cyl(0.36,0.04,x+dx,WT+1.12,-0.05,'face',`y`,24);shell.cyl(0.08,0.06,x+dx,WT+1.14,-0.05,'steel')}
 for(let i=0;i<7;i++)shell.bb(x-1.0+i*0.3,WT+0.3,0.9,x-0.85+i*0.3,WT+0.95,0.93,'face');
}
// battery room exhaust fan + plumbing vents
shell.cyl(0.32,0.08,7.6,WT+0.55,0,'galv','y',24,0.42);shell.cyl(0.25,0.4,7.6,WT+0.35,0,'galv');
for(const x of [-1.8,3.6])shell.cyl(0.09,0.5,x,WT+0.4,-2.4,'galv');
// arc-flash exhaust hood (from the MV switchgear plenum)
shell.bb(XE0-0.42,F+2.3,-2.95,XE0,F+2.98,-2.05,'galv');
for(let i=0;i<5;i++)shell.bb(XE0-0.44,F+2.36+i*0.12,-2.9,XE0-0.42,F+2.42+i*0.12,-2.1,'face');
// door frames
shell.bb(XE0-0.06,F-0.01,DOOR.z0-0.09,XE0+0.01,F+DOOR.h+0.09,DOOR.z0,'hgreen');
shell.bb(XE0-0.06,F-0.01,DOOR.z1,XE0+0.01,F+DOOR.h+0.09,DOOR.z1+0.09,'hgreen');
shell.bb(XE0-0.06,F+DOOR.h,DOOR.z0-0.09,XE0+0.01,F+DOOR.h+0.09,DOOR.z1+0.09,'hgreen');
shell.bb(XE0-0.08,F+DOOR.h+0.14,DOOR.z0-0.15,XE0+0.02,F+DOOR.h+0.22,DOOR.z1+0.15,'galv'); // rain drip
// front personnel door (second exit), closed
shell.bb(FRONT_DOOR[0]-0.08,F-0.01,ZE1-0.01,FRONT_DOOR[1]+0.08,F+2.28,ZE1+0.05,'hgreen');
shell.bb(FRONT_DOOR[0]+0.02,F,ZE1+0.0,FRONT_DOOR[1]-0.02,F+2.18,ZE1+0.06,'hgreen');
shell.bb(5.55,F+1.35,ZE1+0.06,5.85,F+1.85,ZE1+0.07,'darkglass');
shell.bb(6.0,F+1.0,ZE1+0.06,6.1,F+1.06,ZE1+0.13,'galv');
// entry landing, stairs, handrails (left end)
const LX=XE0-1.9;
shell.bb(LX,F-0.09,-1.05,XE0,F-0.02,1.45,'grating');
for(const [x,z] of [[LX+0.05,-1],[LX+0.05,1.4],[XE0-0.05,-1],[XE0-0.05,1.4]])shell.bb(x-0.04,0,z-0.04,x+0.04,F-0.09,z+0.04,'steel');
for(let i=1;i<=2;i++)shell.bb(LX-i*0.3,F-0.02-i*0.215-0.05,-1.0,LX-(i-1)*0.3,F-0.02-i*0.215,1.4,'grating');
for(const z of [-1.03,1.43]){
 shell.bar([LX-0.62,0,z],[LX,F-0.05,z],0.05,'steel');
 for(const x of [XE0-0.06,LX+0.9,LX+0.05])shell.bb(x-0.025,F-0.02,z-0.025,x+0.025,F+1.05,z+0.025,'horange');
 shell.bb(LX+0.02,F+1.02,z-0.025,XE0-0.03,F+1.07,z+0.025,'horange');shell.bb(LX+0.02,F+0.52,z-0.02,XE0-0.03,F+0.56,z+0.02,'horange');
 shell.bar([LX+0.05,F+1.05,z],[LX-0.62,0.3+0.9,z],0.045,'horange');shell.bb(LX-0.645,0.2,z-0.022,LX-0.6,1.2,z+0.022,'horange');
}
// front landing
const FZ=ZE1+1.5;
shell.bb(4.9,F-0.09,ZE1,6.5,F-0.02,FZ,'grating');
for(let i=1;i<=2;i++)shell.bb(4.9,F-0.02-i*0.215-0.05,FZ+(i-1)*0.3,6.5,F-0.02-i*0.215,FZ+i*0.3,'grating');
for(const x of [4.92,6.48]){for(const z of [ZE1+0.05,FZ-0.05])shell.bb(x-0.025,F-0.02,z-0.025,x+0.025,F+1.05,z+0.025,'horange');shell.bb(x-0.025,F+1.02,ZE1+0.03,x+0.025,F+1.07,FZ-0.03,'horange');shell.bar([x,F+1.05,FZ-0.05],[x,1.2,FZ+0.62],0.045,'horange');shell.bb(x-0.022,0.2,FZ+0.6,x+0.022,1.2,FZ+0.645,'horange')}
// wall lights + status beacon
for(const [x,z,ry] of [[XE0-0.1,0.2,0],[5.7,ZE1+0.1,1]]){
 if(ry){shell.bb(x-0.14,F+2.42,ZE1,x+0.14,F+2.54,ZE1+0.14,'face');shell.bb(x-0.12,F+2.41,ZE1+0.02,x+0.12,F+2.42,ZE1+0.13,'walllamp')}
 else{shell.bb(XE0-0.14,F+2.62,z-0.14,XE0,F+2.74,z+0.14,'face');shell.bb(XE0-0.13,F+2.61,z-0.12,XE0-0.02,F+2.62,z+0.12,'walllamp')}
}
shell.cyl(0.07,0.12,XE0+0.35,WT+0.44,2.75,'steel');shell.cyl(0.075,0.16,XE0+0.35,WT+0.58,2.75,'beacon');
shell.build();
logoPlate(shell.obj,2.2,F+3.3,XE0-0.04,0.2,-Math.PI/2);
logoPlate(shell.obj,3.4,F+2.35,2.6,ZE1+0.075,0);
S_(shell.obj,'DANGER',0.42,0.26,XE0-0.06,F+1.65,-1.05,{ry:-Math.PI/2,bg:'#ffffff',fg:'#111',sub:'HIGH VOLTAGE',stripe:'#d3202a'});

/* ---------------- entry doors (animated) ---------------- */
const leaves=[];
function leaf(hingeZ,dir){
 const pivot=new THREE.Group();pivot.position.set(XE0,F,hingeZ);scene.add(pivot);
 const P=new Part('door'+leaves.length,{interior:false,parent:pivot});
 const w=(DOOR.z1-DOOR.z0)/2-0.01,a=dir>0?0.005:-w-0.005,b=a+w;
 P.bb(0.0,0.01,a,0.06,DOOR.h-0.01,b,'hgreen');
 const m=(a+b)/2;
 P.bb(-0.005,1.25,m-0.2,0.065,1.95,m+0.2,'darkglass');
 P.bb(-0.005,0.05,a+0.04,0.065,0.3,b-0.04,'galv');                  // kick plate
 P.bb(0.06,0.98,a+0.08,0.11,1.04,b-0.08,'galv');                     // panic bar (inside)
 const hz=dir>0?b-0.1:a+0.1;P.bb(-0.07,0.95,hz-0.02,0,1.15,hz+0.02,'galv'); // pull (outside)
 P.build();leaves.push({pivot,dir});
}
leaf(DOOR.z0,1);leaf(DOOR.z1,-1);
function setDoors(a){for(const l of leaves)l.pivot.rotation.y=-l.dir*a}

/* ================= INTERIOR ROOM ================= */
const room=new Part('room');
room.bb(X0,F-0.03,Z0,X1,F,Z1,'floor');
room.bb(X0,C,Z0,X1,C+0.03,Z1,'ceiling');
slab(room,'x',Z1-0.01,0.02,X0,X1,F,C,[[5.2,6.2,F,F+2.2]],'lining');
slab(room,'x',Z0+0.01,0.02,X0,X1,F,C,[],'lining');
slab(room,'z',X0+0.01,0.02,Z0,Z1,F,C,[[DOOR.z0,DOOR.z1,F,F+DOOR.h]],'lining');
slab(room,'z',X1-0.01,0.02,Z0,Z1,F,C,[],'lining');
// wall base trim + yellow egress markings at both doors
room.bb(X0,F,Z0+0.02,X1,F+0.1,Z0+0.03,'face');room.bb(X0,F,Z1-0.03,X1,F+0.1,Z1-0.02,'face');
room.bb(X0+0.05,F,-0.85,X0+1.2,F+0.004,-0.8,'yellow');room.bb(X0+0.05,F,1.2,X0+1.2,F+0.004,1.25,'yellow');
room.build();

/* ---------------- MV switchgear (left, near the entry) ---------------- */
const mv=new Part('mv');
for(let i=0;i<7;i++){
 const x0=-8.0+i*0.9,xc=x0+0.45;
 mv.bb(x0+0.01,F,-2.98,x0+0.89,F+2.4,-1.0,'ansiDark');
 mv.bb(x0+0.01,F,-1.02,x0+0.89,F+0.12,-0.99,'face');
 mv.bb(x0+0.04,F+1.5,-1.0,x0+0.86,F+2.33,-0.975,'ansi');
 mv.bb(xc-0.15,F+1.76,-0.975,xc+0.15,F+2.12,-0.955,'face');
 mv.bb(xc-0.1,F+1.97,-0.955,xc+0.1,F+2.07,-0.952,'screen');
 mv.bb(xc-0.1,F+1.83,-0.955,xc-0.07,F+1.86,-0.95,'ledG');mv.bb(xc-0.05,F+1.83,-0.955,xc-0.02,F+1.86,-0.95,'ledR');
 mv.bb(xc-0.16,F+2.2,-0.975,xc+0.16,F+2.26,-0.97,'white');
 mv.bb(x0+0.04,F+0.16,-1.0,x0+0.86,F+1.45,-0.975,'ansi');
 mv.bb(xc-0.17,F+0.92,-0.975,xc+0.17,F+1.14,-0.97,'darkglass');
 mv.bb(x0+0.74,F+0.55,-0.975,x0+0.78,F+0.92,-0.94,'galv');
 mv.bb(xc-0.08,F+0.3,-0.975,xc+0.08,F+0.38,-0.97,i===0?'ledR':'ledG');
 mv.bb(xc-0.12,F+1.3,-0.975,xc+0.12,F+1.38,-0.972,'yellow');
}
mv.bb(-8.0,F+2.42,-2.92,-1.7,F+2.82,-2.1,'ansiDark');     // arc plenum
mv.bb(X0,F+2.47,-2.85,-8.0,F+2.77,-2.15,'ansiDark');      // plenum duct to the exhaust hood
for(let x=-7.5;x<-1.7;x+=1.5)mv.bb(x-0.03,F+2.4,-2.95,x+0.03,F+2.84,-2.07,'face');
mv.bb(-8.0,F,-1.0,-1.7,F+0.012,0.0,'rubber');
mv.build();
S_(mv.obj,'MV SWITCHGEAR',1.7,0.26,-4.85,F+2.62,-2.09,{sub:'SWGR-1  ·  15 kV  ·  ARC-RESISTANT'});

/* ---------------- protection & control panels ---------------- */
const pc=new Part('pc');
for(let i=0;i<5;i++){
 const x0=-1.4+i*0.6,xc=x0+0.3;
 pc.bb(x0+0.01,F,-1.8,x0+0.59,F+2.3,-1.0,'ansiDark');
 pc.bb(x0+0.03,F+0.1,-1.0,x0+0.57,F+2.22,-0.985,'ansi');
 pc.bb(x0+0.01,F,-1.0,x0+0.59,F+0.1,-0.98,'face');
 if(i===1){ // operator HMI
  pc.bb(xc-0.22,F+1.35,-0.985,xc+0.22,F+1.7,-0.97,'face');pc.bb(xc-0.2,F+1.37,-0.97,xc+0.2,F+1.68,-0.967,'screen');
  for(let r=0;r<4;r++)pc.bb(xc-0.2+r*0.11,F+1.15,-0.985,xc-0.12+r*0.11,F+1.22,-0.975,r===0?'ledG':'face');
 }else if(i===3){ // SCADA / RTU behind a window
  pc.bb(xc-0.22,F+0.55,-0.985,xc+0.22,F+1.95,-0.982,'darkglass');
  for(let r=0;r<5;r++){pc.bb(xc-0.2,F+0.62+r*0.26,-0.98,xc+0.2,F+0.82+r*0.26,-0.975,'face');for(let k=0;k<6;k++)pc.bb(xc-0.17+k*0.05,F+0.76+r*0.26,-0.975,xc-0.15+k*0.05,F+0.78+r*0.26,-0.972,k%3?'ledG':'ledA')}
 }else{ // flush-mounted protective relays + test switches
  for(let r=0;r<3;r++)for(let k=0;k<2;k++){const rx=xc-0.13+k*0.26,ry=F+1.85-r*0.4;
   pc.bb(rx-0.1,ry-0.14,-0.985,rx+0.1,ry+0.14,-0.97,'face');pc.bb(rx-0.07,ry+0.02,-0.97,rx+0.07,ry+0.1,-0.967,'screen');
   pc.bb(rx-0.07,ry-0.08,-0.97,rx-0.05,ry-0.06,-0.966,'ledG');pc.bb(rx-0.03,ry-0.08,-0.97,rx-0.01,ry-0.06,-0.966,i===2&&r===1?'ledA':'ledG')}
  for(let k=0;k<8;k++)pc.bb(xc-0.22+k*0.056,F+0.45,-0.985,xc-0.18+k*0.056,F+0.55,-0.975,'white');
 }
 pc.bb(xc-0.12,F+2.08,-0.985,xc+0.12,F+2.14,-0.98,'white');
}
pc.build();
S_(pc.obj,'PROTECTION & CONTROL',1.5,0.2,0.1,F+2.45,-1.03,{sub:'RELAYS  ·  SCADA  ·  HMI'});

/* ---------------- dry-type transformer ---------------- */
const xf=new Part('xfmr');
xf.bb(2.0,F,-2.9,4.4,F+2.5,-1.2,'ansiDark');
for(const [a,b] of [[2.03,3.18],[3.22,4.37]]){
 xf.bb(a,F+0.08,-1.2,b,F+2.42,-1.18,'ansi');
 for(let i=0;i<8;i++){xf.bb(a+0.1,F+0.2+i*0.06,-1.18,b-0.1,F+0.23+i*0.06,-1.16,'face');xf.bb(a+0.1,F+1.95+i*0.05,-1.18,b-0.1,F+1.975+i*0.05,-1.16,'face')}
}
xf.bb(2.35,F+1.6,-1.18,2.65,F+1.85,-1.16,'face');xf.bb(2.39,F+1.7,-1.16,2.61,F+1.8,-1.155,'screenG');
xf.bb(2.0,F,-1.2,4.4,F+0.08,-1.17,'face');
for(let i=0;i<6;i++)xf.bb(2.0+i*0.48,F+0.004,-1.2,2.24+i*0.48,F+0.008,-0.45,'yellow'); // hatched keep-clear
xf.build();
S_(xf.obj,'DANGER',0.5,0.3,3.79,F+1.6,-1.155,{bg:'#ffffff',fg:'#111',sub:'HIGH VOLTAGE',stripe:'#d3202a'});
S_(xf.obj,'XFMR-1',0.62,0.18,2.6,F+2.25,-1.155,{sub:'DRY TYPE  ·  13.8 kV / 480 V'});

/* ---------------- battery room (far end) ---------------- */
const bt=new Part('batt');
const PX=6.46;
slab(bt,'z',PX,0.12,Z0,Z1,F,C,[[-0.25,0.75,F,F+2.2],[-2.7,-0.45,F+1.0,F+2.3],[0.95,2.7,F+1.0,F+2.3]],'lining');
for(const [a,b] of [[-2.7,-0.45],[0.95,2.7]]){
 bt.bb(PX-0.01,F+1.0,a,PX+0.01,F+2.3,b,'glass');
 bt.bb(PX-0.07,F+0.97,a-0.03,PX+0.07,F+1.03,b+0.03,'hgreen');bt.bb(PX-0.07,F+2.27,a-0.03,PX+0.07,F+2.33,b+0.03,'hgreen');
 bt.bb(PX-0.07,F+1.0,a-0.03,PX+0.07,F+2.3,a+0.01,'hgreen');bt.bb(PX-0.07,F+1.0,b-0.01,PX+0.07,F+2.3,b+0.03,'hgreen');
 bt.bb(PX-0.05,F+1.0,(a+b)/2-0.02,PX+0.05,F+2.3,(a+b)/2+0.02,'hgreen');
}
slab(bt,'z',PX-0.07,0.05,-0.24,0.74,F,F+2.18,[[0.0,0.5,F+1.1,F+1.9]],'hgreen'); // door with vision panel
bt.bb(PX-0.07,F+1.1,0.0,PX-0.06,F+1.9,0.5,'glass');
bt.bb(PX-0.13,F+0.98,0.55,PX-0.1,F+1.04,0.7,'galv');
// racks + VRLA blocks along the far wall
for(let t=0;t<3;t++){const y=F+0.22+t*0.58;
 bt.bb(8.1,y-0.04,-2.7,8.85,y,2.7,'steel');
 for(let k=0;k<17;k++){const z=-2.55+k*0.3;
  bt.bb(8.18,y,z-0.13,8.75,y+0.34,z+0.13,'batt');
  bt.bb(8.18,y+0.34,z-0.13,8.75,y+0.37,z+0.13,'black');
  bt.cyl(0.022,0.04,8.28,y+0.39,z-0.07,'ledR','y',8);bt.cyl(0.022,0.04,8.28,y+0.39,z+0.07,'black','y',8);
  if(k<16)bt.bb(8.26,y+0.4,z+0.06,8.3,y+0.41,z+0.24,'copper');
 }
}
for(const z of [-2.72,0,2.72])bt.bb(8.08,F,z-0.04,8.16,F+1.6,z+0.04,'steel');
bt.bb(6.6,F,-2.95,8.98,F+0.004,2.95,'yellow'); // acid-resistant floor coating edge
bt.bb(6.6,F+0.004,-2.9,8.93,F+0.006,2.9,'floor');
// eyewash, exhaust grille, H2 detector, battery monitor
bt.bb(PX+0.07,F+0.9,2.2,PX+0.3,F+1.05,2.55,'yellow');bt.cyl(0.03,0.9,PX+0.12,F+0.45,2.38,'galv');
bt.bb(8.95,C-0.85,-2.4,8.99,C-0.25,-1.8,'galv');bt.cyl(0.24,0.02,8.94,C-0.55,-2.1,'face','x',24);
bt.bb(8.95,C-0.3,1.0,8.99,C-0.15,1.2,'white');bt.bb(8.94,C-0.26,1.05,8.95,C-0.24,1.08,'ledG');
bt.bb(PX+0.07,F+1.4,-2.4,PX+0.15,F+1.8,-1.9,'ansi');bt.bb(PX+0.15,F+1.6,-2.3,PX+0.152,F+1.72,-2.0,'screenG');
bt.build();
S_(bt.obj,'BATTERY ROOM',1.0,0.22,PX-0.075,F+2.42,0.25,{ry:-Math.PI/2,bg:'#ffffff',fg:'#111',sub:'NO SPARKS  ·  NO OPEN FLAMES'});
S_(bt.obj,'EYEWASH',0.3,0.2,PX+0.07,F+1.35,2.38,{ry:Math.PI/2,bg:'#2f8f5b',fg:'#ffffff'});

/* ---------------- UPS + DC system (right, far end) ---------------- */
const up=new Part('ups');
up.bb(3.4,F,1.4,4.2,F+2.0,2.3,'face');up.bb(3.42,F+0.05,1.385,4.18,F+1.97,1.4,'black');
up.bb(3.6,F+1.45,1.375,4.0,F+1.72,1.385,'screen');
for(let k=0;k<4;k++)up.bb(3.62+k*0.1,F+1.3,1.377,3.68+k*0.1,F+1.34,1.383,k<3?'ledG':'ledA');
up.bb(3.42,F+1.88,1.38,4.18,F+1.92,1.386,'sky');
for(let r=0;r<10;r++)up.bb(3.5,F+0.15+r*0.07,1.378,4.1,F+0.18+r*0.07,1.385,'face');
up.bb(4.21,F,1.4,4.99,F+2.0,2.3,'ansiDark');up.bb(4.23,F+0.05,1.385,4.97,F+1.97,1.4,'ansi');
up.bb(4.45,F+1.45,1.375,4.75,F+1.65,1.385,'face');up.bb(4.48,F+1.5,1.372,4.72,F+1.62,1.375,'screenG');
for(let k=0;k<3;k++){up.bb(4.35+k*0.2,F+0.9,1.37,4.47+k*0.2,F+1.15,1.385,'face');up.bb(4.39+k*0.2,F+0.98,1.36,4.43+k*0.2,F+1.08,1.37,'black')}
up.bb(3.4,F,1.4,5.0,F+0.04,1.38,'face');
up.build();
S_(up.obj,'UPS  /  DC',1.1,0.2,4.2,F+2.18,1.395,{ry:Math.PI,sub:'UPS-1  ·  125 VDC CHARGER'});

/* ---------------- VFD lineup ---------------- */
const vf=new Part('vfd');
for(let i=0;i<4;i++){
 const x0=-0.4+i*0.9,xc=x0+0.45;
 vf.bb(x0+0.01,F,1.4,x0+0.89,F+2.3,2.1,'ansiDark');
 vf.bb(x0+0.04,F+0.1,1.385,x0+0.86,F+2.25,1.4,'ansi');
 vf.bb(x0+0.01,F,1.38,x0+0.89,F+0.1,1.4,'face');
 vf.bb(xc-0.09,F+1.42,1.37,xc+0.09,F+1.72,1.385,'face');vf.bb(xc-0.07,F+1.6,1.367,xc+0.07,F+1.69,1.37,'screen');
 for(let k=0;k<3;k++)vf.bb(xc-0.06+k*0.045,F+1.47,1.367,xc-0.035+k*0.045,F+1.5,1.37,k===0?'ledG':'face');
 for(const dx of [-0.2,0.2]){vf.cyl(0.13,0.02,xc+dx,F+1.98,1.383,'face','z',24);vf.cyl(0.04,0.025,xc+dx,F+1.98,1.38,'steel','z',12)}
 for(let r=0;r<7;r++)vf.bb(xc-0.3,F+0.22+r*0.06,1.378,xc+0.3,F+0.245+r*0.06,1.385,'face');
 vf.bb(x0+0.78,F+0.9,1.36,x0+0.81,F+1.25,1.385,'galv');
 vf.bb(xc-0.12,F+1.2,1.38,xc+0.12,F+1.3,1.385,'yellow');
}
vf.build();
S_(vf.obj,'VFD LINEUP',1.4,0.2,1.4,F+2.45,1.395,{ry:Math.PI,sub:'VFD-101 … VFD-104  ·  480 V'});

/* ---------------- MCC ---------------- */
const mc=new Part('mcc');
const BH=[0.3,0.3,0.45,0.3,0.45];
for(let i=0;i<6;i++){
 const x0=-4.2+i*0.6;
 mc.bb(x0+0.01,F,1.4,x0+0.59,F+2.3,1.95,'ansiDark');
 mc.bb(x0+0.02,F+1.98,1.385,x0+0.58,F+2.26,1.4,'ansi');
 mc.bb(x0+0.45,F+0.12,1.385,x0+0.58,F+1.95,1.4,'ansi');
 mc.bb(x0+0.01,F,1.38,x0+0.59,F+0.1,1.4,'face');
 let y=F+0.12;
 BH.forEach((h,k)=>{
  mc.bb(x0+0.02,y+0.01,1.385,x0+0.43,y+h-0.01,1.4,'ansi');
  const yc=y+h-0.12;
  mc.bb(x0+0.06,yc-0.03,1.36,x0+0.17,yc+0.03,1.385,'black');
  mc.cyl(0.017,0.02,x0+0.3,yc,1.378,(i+k)%4===0?'ledR':'ledG','z',10);
  mc.cyl(0.017,0.02,x0+0.36,yc,1.378,'ledA','z',10);
  mc.bb(x0+0.24,y+0.05,1.38,x0+0.4,y+0.09,1.385,'white');
  y+=h;
 });
}
mc.bb(-4.2,F,1.4,-0.6,F+0.012,0.5,'rubber');
mc.build();
S_(mc.obj,'MCC-1',1.2,0.2,-2.4,F+2.45,1.395,{ry:Math.PI,sub:'MOTOR CONTROL CENTER  ·  480 V'});

/* ---------------- LV switchgear (right, near the entry) ---------------- */
const lv=new Part('lv');
for(let i=0;i<4;i++){
 const x0=-8.0+i*0.9,xc=x0+0.45;
 lv.bb(x0+0.01,F,1.4,x0+0.89,F+2.3,2.9,'ansiDark');
 lv.bb(x0+0.01,F,1.38,x0+0.89,F+0.1,1.4,'face');
 const rows=i===0?[[F+1.55,F+2.25,'meter'],[F+0.12,F+1.5,'main']]:[[F+1.6,F+2.25],[F+0.88,F+1.55],[F+0.12,F+0.83]];
 for(const [y0,y1,kind] of rows){
  lv.bb(x0+0.04,y0,1.385,x0+0.86,y1,1.4,'ansi');
  if(kind==='meter'){
   lv.bb(xc-0.16,y0+0.3,1.375,xc+0.16,y0+0.55,1.385,'face');lv.bb(xc-0.13,y0+0.34,1.372,xc+0.13,y0+0.51,1.375,'screen');
   for(let k=0;k<3;k++)lv.bb(xc-0.2+k*0.16,y0+0.1,1.375,xc-0.1+k*0.16,y0+0.2,1.385,'face');
  }else{
   const h=Math.min(0.42,y1-y0-0.2),yc=(y0+y1)/2;
   lv.bb(xc-0.26,yc-h/2,1.37,xc+0.26,yc+h/2,1.385,'face');
   lv.bb(xc-0.08,yc+h/2-0.12,1.365,xc+0.08,yc+h/2-0.05,1.37,'screenG');
   lv.bb(xc-0.2,yc-0.05,1.36,xc-0.12,yc+0.05,1.37,'black');
   lv.bb(xc+0.12,yc-h/2+0.05,1.365,xc+0.2,yc-h/2+0.1,1.37,kind==='main'?'ledR':'ledG');
   lv.bb(xc-0.04,y0+0.03,1.37,xc+0.04,y0+0.08,1.385,'galv');
  }
 }
}
lv.bb(-8.0,F,0.4,-4.4,F+0.012,1.4,'rubber');
lv.build();
S_(lv.obj,'LV SWITCHGEAR',1.4,0.2,-6.2,F+2.45,1.395,{ry:Math.PI,sub:'SWGR-2  ·  480 V  ·  4000 A'});

/* ---------------- building systems: trays, bus duct, lights, HVAC, fire ---------------- */
const sy=new Part('sys');
function tray(xa,xb,zc,w,y){
 for(const s of [-1,1])sy.bb(xa,y,zc+s*w/2-0.015,xb,y+0.1,zc+s*w/2+0.015,'galv');
 for(let x=xa+0.1;x<xb;x+=0.3)sy.bb(x-0.015,y,zc-w/2,x+0.015,y+0.02,zc+w/2,'galv');
 for(let x=xa+0.4;x<xb;x+=1.5)for(const s of [-1,1])sy.cyl(0.008,C-y,x,(y+C)/2,zc+s*(w/2+0.03),'steel','y',6);
 // a few cable bundles in the tray
 for(let k=0;k<5;k++)sy.cyl(0.025,xb-xa-0.2,(xa+xb)/2,y+0.045,zc-w/2+0.1+k*(w-0.2)/4,k%2?'black':'face','x',8);
}
tray(-8.6,6.2,-1.45,0.6,C-0.62);
tray(-8.6,5.0,1.75,0.5,C-0.85);
// bus duct: transformer -> across the aisle -> LV switchgear
sy.bb(3.0,F+2.5,-1.95,3.4,C-0.15,-1.65,'ansiDark');
sy.bb(3.0,C-0.45,-1.95,3.4,C-0.15,2.35,'ansiDark');
sy.bb(-6.85,C-0.45,2.05,3.4,C-0.15,2.35,'ansiDark');
sy.bb(-6.85,F+2.3,2.05,-6.45,C-0.15,2.35,'ansiDark');
for(let x=-5.6;x<3;x+=1.6)sy.bb(x-0.04,C-0.48,2.02,x+0.04,C-0.12,2.38,'ansi');
for(let z=-1.2;z<2;z+=1.4)sy.bb(2.97,C-0.48,z-0.04,3.43,C-0.12,z+0.04,'ansi');
// LED fixtures
for(const z of [-0.35,0.75])for(const x of [-7.6,-5.0,-2.4,0.2,2.8,5.3]){
 sy.bb(x-0.62,C-0.07,z-0.14,x+0.62,C,z+0.14,'galv');sy.bb(x-0.6,C-0.08,z-0.12,x+0.6,C-0.07,z+0.12,'lamp');
}
sy.bb(7.1,C-0.07,-0.15,8.3,C,0.15,'galv');sy.bb(7.12,C-0.08,-0.13,8.28,C-0.07,0.13,'lamp');
// emergency lights + exit signs
sy.bb(X0+0.02,F+2.58,-0.05,X0+0.1,F+2.78,0.45,'exit');
sy.bb(5.5,F+2.38,Z1-0.1,5.9,F+2.56,Z1-0.02,'exit');
for(const [x,z,ax] of [[X0+0.05,1.6,'x'],[5.7,Z1-0.06,'z']]){
 if(ax==='x'){sy.bb(X0+0.02,F+2.6,1.4,X0+0.14,F+2.75,1.8,'white');sy.cyl(0.04,0.06,X0+0.15,F+2.62,1.48,'lamp','x',10);sy.cyl(0.04,0.06,X0+0.15,F+2.62,1.72,'lamp','x',10)}
}
// HVAC supply diffusers / return grilles
for(const x of [-5.2,1.2]){sy.bb(x-0.32,C-0.03,-0.12,x+0.32,C,0.52,'galv');for(let k=0;k<4;k++)sy.bb(x-0.26+k*0.002,C-0.035,-0.06+k*0.14,x+0.26,C-0.03,-0.02+k*0.14,'face')}
for(const x of [-3.4,3.6])sy.bb(x-0.3,C-0.03,-0.1,x+0.3,C,0.5,'face');
sy.bb(-1.0,F+1.4,Z0+0.03,-0.88,F+1.55,Z0+0.06,'white'); // thermostat (hidden behind P&C, fine)
// smoke detection + clean-agent nozzles + pipe
for(const x of [-6.3,-3.7,-1.1,1.5,4.1])sy.cyl(0.07,0.04,x,C-0.02,0.2,'white','y',16);
for(const x of [-6.3,-1.1,4.1]){sy.cyl(0.03,0.08,x+1.3,C-0.06,0.2,'galv','y',10);sy.cyl(0.012,0.08,x+1.3,C-0.04,0.2,'galv','y',6)}
sy.cyl(0.02,14.0,-1.6,C-0.03,0.2,'red','x',8);
// clean-agent cylinders (corner by the entry), FACP, pull station, extinguisher
for(const z of [-2.75,-2.38]){sy.cyl(0.16,1.3,-8.6,F+0.65,z,'red','y',20);sy.cyl(0.05,0.14,-8.6,F+1.37,z,'galv');sy.cyl(0.035,0.04,-8.52,F+1.4,z,'white','x',10)}
sy.bb(-8.85,F+0.95,-2.95,-8.35,F+1.0,-2.2,'steel');
sy.cyl(0.02,C-F-1.45,-8.6,(F+1.45+C)/2,-2.56,'red');
sy.bb(X0+0.02,F+1.3,-1.9,X0+0.14,F+1.95,-1.4,'red');sy.bb(X0+0.14,F+1.65,-1.82,X0+0.145,F+1.82,-1.48,'screen');
sy.bb(X0+0.14,F+1.4,-1.8,X0+0.145,F+1.44,-1.76,'ledG');sy.bb(X0+0.14,F+1.4,-1.72,X0+0.145,F+1.44,-1.68,'ledA');
sy.bb(X0+0.02,F+1.15,-1.05,X0+0.09,F+1.3,-0.95,'red');
sy.bb(X0+0.02,F+2.2,-1.75,X0+0.08,F+2.3,-1.55,'white');sy.bb(X0+0.08,F+2.22,-1.7,X0+0.09,F+2.28,-1.6,'lamp');
sy.cyl(0.08,0.45,-8.6,F+0.65,2.85,'red','y',16);sy.cyl(0.03,0.1,-8.6,F+0.92,2.85,'black');
sy.build();
S_(sy.obj,'FIRE ALARM',0.5,0.12,X0+0.03,F+2.05,-1.65,{ry:Math.PI/2,bg:'#b3202a',fg:'#fff'});

/* ---------------- CSI inspection crew + testing specialist ---------------- */
const csiTex=new THREE.TextureLoader().load(new URL('./brand/CSI-Engineering-Logo-Blue.webp',import.meta.url).href,t=>{t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;t.needsUpdate=true});
const csiLogoMat=new THREE.MeshStandardMaterial({map:csiTex,transparent:true,roughness:.85,alphaTest:.05,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});
// worker(P, x, z, facing, {pose, kneel, vest, hat, skin, glove, logo})  facing: radians, 0 = looking toward +z
function worker(P,x,z,face,o={}){
 const m=new THREE.Matrix4().makeRotationY(face).setPosition(x,F,z);
 const k=o.kneel,hp=k?0.55:0.93,vest=o.vest||'vest',skin=o.skin||'skin',hat=o.hat||'hat',glove=o.glove||skin;
 P.at(m,()=>{
  const boot=(sx,y,z0,z1)=>{P.bb(sx*0.045,y,z0,sx*0.165,y+0.11,z1,'black');P.cap([sx*0.105,y+0.06,z1-0.02],[sx*0.105,y+0.06,z1-0.01],0.058,'black')};
  if(k){ // kneeling on the left knee, right foot forward
   P.cap([0.1,hp,0],[0.1,0.52,0.4],0.072,'pants');P.cap([0.1,0.52,0.4],[0.1,0.12,0.42],0.062,'pants');boot(1,0,0.33,0.6);
   P.cap([-0.1,hp,0],[-0.1,0.08,0.06],0.072,'pants');P.cap([-0.1,0.08,0.06],[-0.1,0.08,-0.36],0.062,'pants');P.bb(-0.165,0,-0.5,-0.045,0.12,-0.32,'black');
   P.sph(0.07,-0.1,0.07,0.07,'black'); // knee pad
  }else{
   for(const sx of [-1,1]){P.cap([sx*0.1,hp,0],[sx*0.1,0.5,0.015],0.07,'pants');P.cap([sx*0.1,0.5,0.015],[sx*0.1,0.13,0],0.06,'pants');boot(sx,0,-0.07,0.17)}
  }
  // pelvis, belt, torso, vest with reflective bands
  {const g=new THREE.CylinderGeometry(0.17,0.16,0.18,16);g.scale(1,1,0.68);g.translate(0,hp+0.02,0);P.raw(g,'pants')}
  {const g=new THREE.CylinderGeometry(0.172,0.172,0.045,16);g.scale(1,1,0.69);g.translate(0,hp+0.11,0);P.raw(g,'black')}
  {const g=new THREE.CylinderGeometry(0.2,0.168,0.46,18);g.scale(1,1,0.62);g.translate(0,hp+0.35,0);P.raw(g,'shirt')}
  {const g=new THREE.CylinderGeometry(0.212,0.18,0.4,18,1,true);g.scale(1,1,0.64);g.translate(0,hp+0.34,0);P.raw(g,vest)}
  for(const dy of [0.24,0.42]){const r=0.18+(0.212-0.18)*((dy-0.14)/0.4);const g=new THREE.CylinderGeometry(r+0.003,r+0.003,0.035,18,1,true);g.scale(1,1,0.645);g.translate(0,hp+dy,0);P.raw(g,'refl')}
  for(const sx of [-1,1])P.sph(0.072,sx*0.2,hp+0.54,0,'shirt');
  // neck, head, ears, safety glasses, hard hat
  P.cyl(0.048,0.09,0,hp+0.62,0,skin);
  {const g=new THREE.SphereGeometry(0.102,16,12);g.scale(0.95,1.14,1.02);g.translate(0,hp+0.74,0.01);P.raw(g,skin)}
  for(const sx of [-1,1])P.sph(0.022,sx*0.098,hp+0.74,0,skin);
  P.bb(-0.075,hp+0.75,0.088,0.075,hp+0.782,0.106,'darkglass');P.bb(-0.008,hp+0.705,0.095,0.008,hp+0.745,0.118,skin);
  {const g=new THREE.SphereGeometry(0.128,18,10,0,Math.PI*2,0,Math.PI/2);g.scale(1,0.86,1.08);g.translate(0,hp+0.79,0.005);P.raw(g,hat)}
  {const g=new THREE.CylinderGeometry(0.15,0.15,0.012,20);g.scale(1,1,1.12);g.translate(0,hp+0.79,0.035);P.raw(g,hat)}
  P.bb(-0.018,hp+0.79,-0.12,0.018,hp+0.905,0.13,hat);
  // arms
  const sh=hp+0.52,arm=(sx,e,h)=>{P.cap([sx*0.21,sh,0],e,0.047,'shirt');P.cap(e,h,0.04,'shirt');P.sph(0.042,...h,glove)};
  if(o.pose==='tablet'){
   arm(-1,[-0.25,sh-0.27,0.08],[-0.1,sh-0.25,0.33]);arm(1,[0.25,sh-0.26,0.06],[0.07,sh-0.17,0.36]);
   const g=new THREE.BoxGeometry(0.27,0.016,0.19);g.rotateX(-0.75);g.translate(-0.03,sh-0.22,0.38);P.raw(g,'black');
   const g2=new THREE.BoxGeometry(0.245,0.002,0.165);g2.rotateX(-0.75);g2.translate(-0.03,sh-0.212,0.386);P.raw(g2,'screen');
  }else if(o.pose==='probe'){
   arm(-1,[-0.22,sh-0.2,0.24],[-0.11,sh-0.12,0.5]);arm(1,[0.23,sh-0.22,0.24],[0.13,sh-0.16,0.52]);
   P.bb(-0.13,sh-0.14,0.52,-0.09,sh-0.1,0.58,'red');P.bb(0.11,sh-0.18,0.54,0.15,sh-0.14,0.6,'black');
  }else if(o.pose==='light'){ // checking the base with a flashlight
   arm(1,[0.22,sh-0.25,0.16],[0.14,sh-0.32,0.44]);arm(-1,[-0.22,sh-0.3,0.12],[-0.12,hp+0.02,0.36]);
   P.cyl(0.022,0.16,0.14,sh-0.33,0.52,'black','z',10);P.cyl(0.026,0.012,0.14,sh-0.33,0.605,'lamp','z',10);
  }else{arm(-1,[-0.25,sh-0.28,0.02],[-0.24,sh-0.55,0.05]);arm(1,[0.25,sh-0.28,0.02],[0.24,sh-0.55,0.05])}
 });
 if(o.logo){ // CSI logo printed on the vest: wrapped onto the vest's curved surface, inside the yellow panel
  const g=new THREE.Group();g.applyMatrix4(m);P.obj.add(g);
  // vest = open cylinder, radius 0.18 (bottom, hp+0.14) to 0.212 (top, hp+0.54), squashed to 0.64 in depth
  const rAt=y=>0.18+0.032*((y-hp-0.14)/0.4);
  const wrap=(w,h,yc,a0,side)=>{ // w,h in metres, yc centre height, a0 centre angle (rad), side +1 front / -1 back
   const geo=new THREE.PlaneGeometry(w,h,24,4),pos=geo.attributes.position;
   for(let i=0;i<pos.count;i++){
    const u=pos.getX(i),v=pos.getY(i),y=yc+v,r=rAt(y)+0.004,th=a0+side*u/r;
    pos.setXYZ(i,r*Math.sin(th),y,side*0.64*r*Math.cos(th));
   }
   geo.computeVertexNormals();
   const mesh=new THREE.Mesh(geo,csiLogoMat);
   g.add(mesh);
  };
  wrap(0.17,0.084,hp+0.335,0,-1);       // back, centred between the two reflective bands
  wrap(0.075,0.037,hp+0.49,-0.55,1);    // front left chest, above the upper band
 }
}
const crew=new Part('crew');
// open breaker cubicle on MV section 3 (x -6.2 .. -5.3)
{const x0=-6.2,xc=x0+0.45;
 crew.bb(x0+0.04,F+0.16,-0.974,x0+0.86,F+1.45,-0.966,'black');
 crew.bb(xc-0.27,F+0.32,-0.966,xc+0.27,F+1.05,-0.95,'face');crew.bb(xc-0.2,F+0.62,-0.95,xc+0.2,F+0.86,-0.944,'ansiDark');
 for(const dx of [-0.16,0,0.16])crew.cyl(0.03,0.12,xc+dx,F+1.2,-0.93,'copper','z',10);
 crew.bb(x0-0.8,F+0.16,-0.95,x0+0.02,F+1.45,-0.925,'ansi');                       // door swung fully open, flat against the next section
 crew.bb(x0-0.56,F+0.92,-0.925,x0-0.22,F+1.14,-0.915,'darkglass');
 // test cart + insulation resistance test set, leads into the cubicle
 const cx=-5.25,cz=-0.42;
 crew.bb(cx-0.3,F+0.12,cz-0.2,cx+0.3,F+0.16,cz+0.2,'steel');crew.bb(cx-0.3,F+0.55,cz-0.2,cx+0.3,F+0.59,cz+0.2,'steel');
 for(const [dx,dz] of [[-0.28,-0.18],[0.28,-0.18],[-0.28,0.18],[0.28,0.18]]){crew.bb(cx+dx-0.015,F+0.08,cz+dz-0.015,cx+dx+0.015,F+0.59,cz+dz+0.015,'steel');crew.cyl(0.04,0.03,cx+dx,F+0.04,cz+dz,'black','x',12)}
 crew.bb(cx-0.22,F+0.59,cz-0.15,cx+0.22,F+0.82,cz+0.15,'yellow');crew.bb(cx-0.18,F+0.82,cz-0.12,cx+0.06,F+0.823,cz+0.06,'black');
 crew.bb(cx-0.15,F+0.823,cz-0.1,cx+0.03,F+0.826,cz+0.03,'screenG');
 crew.bar([cx-0.1,F+0.8,cz-0.15],[xc-0.16,F+1.2,-0.9],0.012,'red');crew.bar([cx-0.02,F+0.8,cz-0.15],[xc,F+1.2,-0.9],0.012,'black');crew.bar([cx+0.06,F+0.8,cz-0.15],[xc+0.16,F+1.2,-0.9],0.012,'green');
 // barricade: stanchions + yellow/black chain
 const bz=-0.05,xa=-7.0,xb=-4.35;
 for(const x of [xa,(xa+xb)/2,xb]){crew.cyl(0.14,0.03,x,F+0.015,bz,'black','y',16);crew.cyl(0.025,0.95,x,F+0.49,bz,'yellow','y',10);crew.cyl(0.035,0.05,x,F+0.98,bz,'black','y',10)}
 for(let i=0;i<14;i++){const t0=i/14,t1=(i+1)/14;crew.bar([xa+(xb-xa)*t0,F+0.94-Math.sin(Math.PI*((t0*2)%1))*0.06,bz],[xa+(xb-xa)*t1,F+0.94-Math.sin(Math.PI*((t1*2)%1))*0.06,bz],0.025,i%2?'black':'yellow')}
 // testing specialist (orange vest, rated gloves) kneels at the cubicle; CSI QA/QC engineer witnesses with a tablet
 worker(crew,-5.95,-0.4,Math.PI,{kneel:1,pose:'probe',vest:'vestO',hat:'yellow',skin:'skin2',glove:'black'});
 worker(crew,-4.7,-0.32,Math.atan2(-1.05,-0.6),{pose:'tablet',logo:1});
}
crew.build();
S_(crew.obj,'DANGER',0.5,0.26,(-7.0-4.35)/2,F+0.75,-0.03,{bg:'#ffffff',fg:'#111',sub:'TESTING IN PROGRESS',stripe:'#d3202a'});
// receiving inspection outside, from the first frame: one CSI inspector with a tablet, one checking the base
const crewOut=new Part('crewOut',{interior:false});
worker(crewOut,-3.4,ZE1+1.7,Math.PI+0.25,{pose:'tablet',logo:1});
worker(crewOut,-7.55,ZE1+0.62,Math.PI,{kneel:1,pose:'light',logo:1});
crewOut.build();
crewOut.obj.position.y=-F; // standing on the pad, not the floor

/* ---------------- lights ---------------- */
const hemi=new THREE.HemisphereLight(0xcfe3ff,0x1a2c48,0.75);scene.add(hemi);
const sun=new THREE.DirectionalLight(0xffffff,2.4);
sun.position.set(-10,22,18);sun.castShadow=true;sun.shadow.mapSize.set(isPhone?1024:2048,isPhone?1024:2048);
Object.assign(sun.shadow.camera,{left:-16,right:16,top:12,bottom:-12,near:1,far:70});sun.shadow.bias=-0.0006;sun.shadow.normalBias=0.02;
scene.add(sun);
const fillLight=new THREE.DirectionalLight(0x5AA5D9,0.7);fillLight.position.set(14,8,-12);scene.add(fillLight);
const inLights=[[-6.3,0.2],[-2.2,0.2],[1.9,0.2],[5.2,0.2],[7.7,0]].map(([x,z])=>{const l=new THREE.PointLight(0xeaf2ff,0,13,1.4);l.position.set(x,C-0.35,z);scene.add(l);return l});
const doorGlow=new THREE.PointLight(0xdfeaff,0,9,1.6);doorGlow.position.set(X0+0.6,F+1.6,0.2);scene.add(doorGlow);
const extLamps=[new THREE.PointLight(0xfff1d6,0,6,1.8),new THREE.PointLight(0xfff1d6,0,6,1.8)];
extLamps[0].position.set(XE0-0.5,F+2.4,0.2);extLamps[1].position.set(5.7,F+2.2,ZE1+0.5);extLamps.forEach(l=>scene.add(l));
const shadowCatcher=new THREE.Mesh(new THREE.PlaneGeometry(140,140),new THREE.ShadowMaterial({opacity:0.32}));
shadowCatcher.rotation.x=-Math.PI/2;shadowCatcher.position.y=-0.299;shadowCatcher.receiveShadow=true;scene.add(shadowCatcher);

/* ================= STORY ================= */
// camera keyframes: u = scroll units, p = camera, t = look target, s = hold here, o = 1 outside / 0 inside
const K=[
 {u:0,  p:[0,2.3,22],      t:[0,2.2,0],     s:1,o:1},
 {u:6,  p:[-1.6,2.3,21],   t:[-0.5,2.2,0],  s:1,o:1},
 {u:12, p:[-15,2.6,17],    t:[-6,2.0,0],    s:0,o:1},
 {u:18, p:[-22,2.4,5],     t:[-9,2.1,0.2],  s:1,o:1},
 {u:23, p:[-21,2.35,2],    t:[-9,2.1,0.2],  s:1,o:1},
 {u:30, p:[-14.5,2.3,0.2], t:[-9,2.05,0.2], s:1,o:1},
 {u:36, p:[-10.7,2.3,0.2], t:[-6,2.15,0.2], s:0,o:.4},
 {u:41, p:[-8.3,2.25,0.2], t:[3,1.9,0.2],   s:1,o:0},
 {u:45, p:[-7.9,2.25,0.25],t:[3,1.9,0.12],  s:1,o:0},
 {u:47.5,p:[-5.6,2.3,1.2], t:[0,1.85,0.1],  s:0,o:0},
 {u:50, p:[-2.7,2.25,1.2], t:[-6.4,1.7,-1.6],s:1,o:0},
 {u:55, p:[-3.1,2.25,1.15],t:[-6.8,1.7,-1.6],s:1,o:0},
 {u:60, p:[-1.7,2.2,1.2], t:[0.4,1.6,-1.4], s:1,o:0},
 {u:65, p:[-1.3,2.2,1.15],t:[0.8,1.6,-1.4], s:1,o:0},
 {u:70, p:[1.4,2.2,1.2],  t:[3.4,1.6,-1.6], s:1,o:0},
 {u:75, p:[1.8,2.2,1.15], t:[3.7,1.6,-1.6], s:1,o:0},
 {u:80, p:[4.8,2.15,-0.55],t:[8.3,1.45,-1.3],s:1,o:0},
 {u:85, p:[5.2,2.15,-0.6],t:[8.3,1.45,-1.0], s:1,o:0},
 {u:90, p:[6.0,2.15,-0.7], t:[3.9,1.4,1.9], s:1,o:0},
 {u:95, p:[5.7,2.15,-0.75],t:[3.6,1.4,1.9], s:1,o:0},
 {u:100,p:[3.4,2.15,-0.7], t:[1.2,1.5,1.9], s:1,o:0},
 {u:105,p:[3.0,2.15,-0.75],t:[0.8,1.5,1.9], s:1,o:0},
 {u:110,p:[-0.2,2.15,-0.7],t:[-2.4,1.5,1.9],s:1,o:0},
 {u:115,p:[-0.6,2.15,-0.75],t:[-2.8,1.5,1.9],s:1,o:0},
 {u:120,p:[-3.6,2.15,-0.7],t:[-6.3,1.5,2.0],s:1,o:0},
 {u:125,p:[-4.0,2.15,-0.75],t:[-6.7,1.5,2.0],s:1,o:0},
 {u:130,p:[-2.4,2.0,0.25], t:[-8.5,3.0,0.0],s:1,o:0},
 {u:135,p:[-3.1,2.0,0.25], t:[-8.8,3.1,0.0],s:1,o:0},
 {u:140,p:[-8.75,2.5,1.2],  t:[-5.6,0.9,-0.6], s:1,o:0},
 {u:146,p:[-8.55,2.45,1.1], t:[-5.4,0.9,-0.6], s:1,o:0},
 {u:150.5,p:[-8.5,2.2,0.25], t:[-12,2.15,0.2], s:0,o:0},
 {u:153,p:[-9.05,2.25,0.2], t:[-13,2.15,0.2], s:1,o:0},
 {u:155,p:[-9.1,2.25,0.2],  t:[-13,2.15,0.2], s:1,o:0},
 {u:169,p:[-14.5,2.6,2.6],  t:[-9,2.1,0.2],   s:1,o:1},
 {u:173,p:[-15.5,2.9,3.2],  t:[-8,2.0,0.2],   s:0,o:1},
 {u:178,p:[-17,3.6,3],      t:[-6,2.0,0],    s:0,o:1},
 {u:183,p:[-19,10,19],      t:[-4.5,1.6,0],  s:1,o:1},
 {u:187,p:[-16,10.5,21],    t:[-4.5,1.6,0],  s:1,o:1},
 {u:194,p:[13,4.6,21],      t:[-1.2,2.0,0],  s:1,o:1},
 {u:201,p:[15.5,4.3,19],    t:[-1.2,2.0,0],  s:1,o:1}
];
const U=K[K.length-1].u;
const HUNTER_COPY={
 0:{eb:'Hunter e-house',h:'Power, built in. Proven on site.',p:'A Hunter e-house is a prefabricated, climate-controlled power building: switchgear, MCCs, drives, UPS and building systems, designed, built and factory-tested by Hunter, then verified on site by independent QA/QC.',
    why:'<b>For your project:</b> one modular building, built in parallel with your site work, with every test witnessed before it is energized.'},
 1:{eb:'01 · The building',p:'Hunter\'s structural skid, insulated wall panels and rated lifting points let the whole room travel by truck and set by crane onto a pad or piers.',
    why:'<b>On arrival:</b> CSI\'s receiving inspection checks transport damage, nameplates, anchorage, leveling and grounding.'},
 2:{why:'<b>Built for the people inside:</b> working space, egress and arc-flash labelling are designed in by Hunter and verified on site (NFPA 70E).'},
 15:{cta:'Request a quote'}
};

const STAGES=[
 {u:[0,9],eb:'Hunter Buildings e-house · CSI QA/QC',h:'Built in the factory. Verified on site.',
  p:'A prefabricated power building that receives, protects and distributes power for your site. Hunter Buildings builds and factory-tests it. CSI inspects, witnesses and verifies it on site until it is safe to energize.',
  why:'<b>For your project:</b> independent QA/QC. CSI verifies the work and the tests; it does not test its own work.',chips:['MV & LV switchgear','MCCs & drives','UPS & batteries','Building systems'],
  spots:[['CSI receiving inspection',[-3.4,1.95,ZE1+1.7]]],room:'Outside'},
 {u:[9,25],eb:'01 · Receiving inspection',h:'Built like a building. Moved like equipment.',
  p:'A welded steel skid, insulated wall panels and rated lifting points let the whole room travel by truck and set by crane onto a pad or piers.',
  why:'<b>What CSI verifies:</b> transport damage, nameplates against approved drawings, enclosure integrity, anchorage, leveling and grounding.',chips:['Set-in-place','Anchorage','Grounding','IEEE 80 / 142'],
  spots:[['CSI inspector',[-7.55,1.25,ZE1+0.62]],['Base lifting lug',[-7.6,0.47,ZE1+0.08]],['Arc exhaust hood',[XE0-0.25,F+2.65,-2.5]],['Rooftop HVAC',[-5.2,WT+1.1,0]]],room:'Outside'},
 {u:[25,46],eb:'02 · Step inside',h:'Lights on. Walk in.',
  p:'Outward-swinging double doors with panic hardware, a second exit at the far end and a clear working aisle running the full length of the room.',
  why:'<b>What CSI verifies:</b> working space, egress, equipment and arc-flash labels, PPE and lockout/tagout provisions (NFPA 70E).',chips:['2.4 m working aisle','Two exits','Panic hardware','Emergency lighting'],
  spots:[['Panic-hardware doors',[XE0-0.4,F+1.3,-0.5]],['Second exit',[5.7,F+1.3,2.95]]],room:'Entry'},
 {u:[46,56],eb:'03 · Left · Medium-voltage switchgear',h:'Where utility power comes in.',glow:'mv',
  p:'Arc-resistant metal-clad switchgear receives the incoming feed and protects every circuit downstream. If a fault happens, the arc energy is ducted up and out of the building, away from the aisle.',
  why:'<b>What CSI verifies:</b> visual and mechanical inspection, torque, insulation and contact resistance, breaker timing and over-potential tests (IEEE C37.20.2, ANSI/NETA ATS).',chips:['Arc-resistant','Vacuum breakers','Plenum to exterior','15 kV class'],
  spots:[['Arc-resistant plenum',[-6.9,F+2.65,-2.1]],['Protective relay',[-4.85,F+1.95,-0.95]],['Vacuum breaker',[-3.95,F+0.85,-0.96]],['Insulating safety mat',[-4.1,F+0.02,-0.5]]],room:'MV switchgear'},
 {u:[56,66],eb:'04 · Left · Protection & control',h:'The brain of the building.',glow:'pc',
  p:'Protective relays, SCADA and an operator HMI watch every breaker and report status to your control room, so problems are seen before they become outages.',
  why:'<b>What CSI verifies:</b> relay settings, secondary injection, trip circuit and interlock checks, metering and SCADA signals (IEEE C37.90).',chips:['Protective relays','SCADA / RTU','Operator HMI','Remote monitoring'],
  spots:[['Operator HMI',[-0.5,F+1.52,-0.96]],['Protective relays',[0.7,F+1.85,-0.96]],['SCADA / RTU',[0.7+0.6,F+1.2,-0.96]]],room:'Protection & control'},
 {u:[66,76],eb:'05 · Left · Transformer',h:'Stepped down right where it is used.',glow:'xfmr',
  p:'A dry-type transformer converts medium voltage to the 480 V your motors and building loads run on. No oil to contain, and it feeds the low-voltage gear by an overhead bus duct.',
  why:'<b>What CSI verifies:</b> turns ratio, winding resistance, insulation resistance and polarization index, temperature monitoring and cooling fans (IEEE C57.12.91).',chips:['Dry-type','Temperature monitored','Bus duct to LV'],
  spots:[['Dry-type transformer',[3.8,F+1.1,-1.15]],['Bus duct to LV gear',[3.2,F+2.95,-1.6]],['Temperature monitor',[2.5,F+1.75,-1.15]]],room:'Transformer'},
 {u:[76,86],eb:'06 · Far end · Battery room',h:'Power that holds when the grid does not.',glow:'batt',
  p:'Stationary batteries sit in their own room behind a fire-rated partition, with dedicated exhaust, hydrogen detection and an eyewash station.',
  why:'<b>What CSI verifies:</b> battery float voltage and capacity, ventilation and alarms (IEEE 450, IEEE 1188).',chips:['Fire-rated separation','Exhaust & H₂ detection','Eyewash','Battery monitoring'],
  spots:[['VRLA battery racks',[8.15,F+1.5,-0.9]],['Exhaust fan',[8.95,C-0.55,-2.1]],['Fire-rated partition',[PX,F+2.6,-1.6]],['Battery monitor',[PX+0.1,F+1.6,-2.15]]],room:'Battery room'},
 {u:[86,96],eb:'07 · Right · UPS & DC system',h:'Protection never loses power.',glow:'ups',
  p:'The UPS and a 125 VDC charger keep relays, breaker controls and communications running through an outage, so the building can protect itself and report what happened.',
  why:'<b>What CSI verifies:</b> charger and inverter checks, transfer on loss of input, alarms and battery ventilation.',chips:['UPS','125 VDC charger','DC distribution'],
  spots:[['UPS',[3.8,F+1.6,1.37]],['Battery charger',[4.6,F+1.55,1.37]]],room:'UPS & DC'},
 {u:[96,106],eb:'08 · Right · Variable frequency drives',h:'Motors that start soft and run lean.',glow:'vfd',
  p:'Drives match motor speed to what the process actually needs, cutting energy use and the mechanical stress of across-the-line starts.',
  why:'<b>What CSI verifies:</b> visual inspection, parameter verification, functional run and harmonic limits (IEEE 519).',chips:['VFDs','Harmonic mitigation','Keypad control'],
  spots:[['Drive keypad',[1.45,F+1.57,1.36]],['Cooling fans',[0.75,F+1.98,1.36]]],room:'Drives'},
 {u:[106,116],eb:'09 · Right · Motor control center',h:'Every motor in one organized lineup.',glow:'mcc',
  p:'Each motor feeder lives in a plug-in bucket with its own starter, protection and pilot lights. Buckets swap quickly, so maintenance windows stay short.',
  why:'<b>What CSI verifies:</b> torque, insulation resistance, breaker trip testing and operation checks (UL 845, ANSI/NETA ATS).',chips:['Plug-in buckets','Starters & overloads','Pilot lights'],
  spots:[['Plug-in buckets',[-3.0,F+0.9,1.36]],['Pilot lights',[-1.6,F+1.9,1.36]],['Horizontal bus',[-2.4,F+2.12,1.36]]],room:'MCC'},
 {u:[116,126],eb:'10 · Right · Low-voltage switchgear',h:'480 V, distributed and protected.',glow:'lv',
  p:'Low-voltage switchgear takes power from the transformer by bus duct and feeds the MCC, the drives and the building panels, with metering on every main.',
  why:'<b>What CSI verifies:</b> torque, insulation resistance, breaker trip testing and operation (IEEE C37.20.1, UL 891).',chips:['Draw-out breakers','Power metering','Bus duct entry'],
  spots:[['Draw-out breakers',[-6.65,F+1.2,1.36]],['Power metering',[-7.55,F+2.0,1.36]],['Bus duct entry',[-6.65,C-0.6,2.2]]],room:'LV switchgear'},
 {u:[126,137],eb:'11 · Overhead · Building systems',h:'The building protects the equipment.',glow:'sys',
  p:'Redundant HVAC holds temperature and humidity, cable tray keeps every run organized overhead, and smoke detection is tied to a clean-agent system that will not harm the electronics.',
  why:'<b>What CSI verifies, where requested:</b> functional checks of HVAC, fire detection and suppression, gas detection and lighting (NFPA 72).',chips:['Redundant HVAC','Cable tray','Clean-agent suppression','Fire alarm'],
  spots:[['Cable tray',[-5.2,C-0.55,-1.45]],['LED lighting',[-5.0,C-0.1,0.75]],['Clean-agent cylinders',[-8.6,F+1.0,-2.55]],['Fire alarm panel',[X0+0.1,F+1.62,-1.65]],['HVAC supply',[-5.2,C-0.05,0.2]]],room:'Building systems'},
 {u:[137,149],eb:'12 · Site inspection & testing',h:'Tested by specialists. Witnessed by CSI.',
  p:'Specialist technicians run the acceptance tests with calibrated instruments. CSI\'s QA/QC engineer witnesses each one, checks the result against the manufacturer data, the project specification and ANSI/NETA ATS, and accepts or rejects it.',
  why:'<b>Independent by design:</b> every activity has a hold or witness point, and nothing moves to the next stage until it is released.',chips:['Hold & witness points','NIST-traceable calibration','NFPA 70E safety','ANSI/NETA ATS'],
  spots:[['CSI QA/QC engineer',[-4.7,F+1.78,-0.32]],['Testing specialist',[-5.95,F+1.4,-0.38]],['Insulation resistance test set',[-5.25,F+0.9,-0.42]],['Barricaded test area',[-6.4,F+0.98,-0.05]]],room:'Testing'},
 {u:[149,170],eb:'13 · Records & evidence',h:'Every check leaves a record.',docs:1,
  p:'Each inspection, torque value, witnessed test and photo is captured in CSI\'s digital QC system as the work happens, traceable to the equipment tag, the instrument and the person who signed it.',
  why:'<b>For your QA team and auditors:</b> evidence you can trace line by line, not a binder assembled at the end.',chips:['Digital ITP','QC checklists','Photo evidence','Signed test reports'],room:'Records'},
 {u:[170,187],eb:'14 · Energization',h:'Energized in stages. Verified under load.',
  p:'With every hold point released and the permit to energize signed, the e-house is energized in stages: phase rotation, voltage and load readings and a thermographic scan under load, then integrated tests with the plant control system.',
  why:'<b>Lower risk:</b> nothing is energized until the inspection, the tests and the punch list say it is ready.',chips:['Permit to energize','ANSI/NETA ECS','Thermography','Integrated tests'],room:'Outside'},
 {u:[187,202],eb:'15 · Handover',h:'Verified. Energized. Handed over.',
  p:'The signed ITP and checklists, test reports, calibration certificates, closed NCRs and as-built drawings are compiled into one handover package for the owner.',
  chips:['Signed ITP','Test reports','Closed NCRs','As-builts'],cta:'Walk through your project with an engineer',room:'Outside'}
];

if(THEME==='hunter'){
 STAGES.forEach((st,i)=>{Object.assign(st,HUNTER_COPY[i]||{});if(st.why)st.why=st.why.replace('<b>What CSI verifies','<b>Verified on site by CSI')});
}
/* ---------------- UI ---------------- */
const panels=document.getElementById('panels'),dots=document.getElementById('dots'),track=document.getElementById('track');
const spotsEl=document.getElementById('spots'),planEl=document.getElementById('plan'),planLbl=document.getElementById('planLbl');
track.style.height=(U*9+100)+'vh';
const maxScroll=()=>track.offsetHeight-innerHeight;
const uToScroll=u=>u/U*maxScroll();
STAGES.forEach((s,i)=>{
 panels.insertAdjacentHTML('beforeend',`<section class="panel"><div class="eyebrow">${s.eb}</div><h2>${s.h}</h2><p>${s.p}</p>${s.why?`<p class="why">${s.why}</p>`:''}<ul>${s.chips.map(t=>`<li>${t}</li>`).join('')}</ul>${s.cta?`<a class="go" href="#contact">${s.cta}</a>`:''}</section>`);
 const d=document.createElement('i');d.title=s.eb;d.onclick=()=>scrollTo({top:uToScroll(s.u[0]+0.5),behavior:'smooth'});dots.appendChild(d);
 s.spotEls=(s.spots||[]).map(([label,pos])=>{const e=document.createElement('div');e.className='spot';e.innerHTML=`<i></i><span>${label}</span>`;spotsEl.appendChild(e);return {e,v:new THREE.Vector3(...pos)}});
});
const els=[...panels.children],dEls=[...dots.children];
const fillBar=document.getElementById('fill'),count=document.getElementById('count'),hint=document.getElementById('hint');

// floor plan
const svg=document.getElementById('planSvg'),NS='http://www.w3.org/2000/svg';
const el=(t,a)=>{const e=document.createElementNS(NS,t);for(const k in a)e.setAttribute(k,a[k]);svg.appendChild(e);return e};
el('rect',{x:XE0,y:ZE0,width:XE1-XE0,height:ZE1-ZE0,fill:'rgba(10,26,48,.6)',stroke:'#9fb8d4','stroke-width':.12,rx:.1});
el('line',{x1:PX,y1:Z0,x2:PX,y2:Z1,stroke:'#9fb8d4','stroke-width':.1,'stroke-dasharray':'.3 .2'});
el('line',{x1:XE0,y1:DOOR.z0,x2:XE0,y2:DOOR.z1,stroke:'#5AA5D9','stroke-width':.3});
el('line',{x1:FRONT_DOOR[0],y1:ZE1,x2:FRONT_DOOR[1],y2:ZE1,stroke:'#5AA5D9','stroke-width':.3});
const FOOT={mv:[-8,-3,-1.7,-1],pc:[-1.4,-1.8,1.6,-1],xfmr:[2,-2.9,4.4,-1.2],batt:[8.1,-2.7,8.85,2.7],ups:[3.4,1.4,5,2.3],vfd:[-0.4,1.4,3.2,2.1],mcc:[-4.2,1.4,-0.6,1.95],lv:[-8,1.4,-4.4,2.9],sys:[-8.8,-2.95,-8.4,-2.2]};
const planRects={};for(const [k,[a,b,c,d]] of Object.entries(FOOT))planRects[k]=el('rect',{class:'eq',x:a,y:b,width:c-a,height:d-b,rx:.08});
const cone=el('path',{fill:'rgba(90,165,217,.35)'});const me=el('circle',{r:.32,fill:'#fff',stroke:'#5AA5D9','stroke-width':.15});

/* ---------------- records screen (QC + documentation) ---------------- */
const darkEl=document.getElementById('dark'),docsEl=document.getElementById('docs'),monEl=docsEl.querySelector('.laptop'),crumbEl=document.getElementById('crumb');
const views=[...docsEl.querySelectorAll('.view')],tabs=[...docsEl.querySelectorAll('.nav a')];
const DOCS={
 reg:[['ITP-PDC01-001','Inspection & test plan','QA/QC','Approved'],['MS-PDC01-004','Method statements & test procedures','Testing','Approved'],['QC-PDC01-002','Receiving, set-in-place & grounding','QA/QC','Complete'],['QC-PDC01-014','Terminations, torque & labeling','Electrical','Complete'],['CAL-PDC01-001','Instrument calibration register','Testing','Verified'],['ATS-PDC01-SWGR1','MV switchgear acceptance tests','Testing','Witnessed'],['PTE-PDC01','Permit to energize','Hold point','Pending']],
 qc:[['Visual and mechanical inspection','ITP item 3 · no transport damage'],['Bolted bus torque verified','75 ft·lb spec · 75 ft·lb recorded'],['Insulation resistance witnessed','18,400 MΩ · 5 kV DC, 1 min'],['Contact resistance witnessed','38 µΩ · limit 60 µΩ'],['Arc-flash and equipment labels','NFPA 70E · IEEE 1584'],['Photo evidence attached','3 photos']],
 fat:[['Insulation resistance, MV bus (5 kV DC, 1 min)','≥ 5,000 MΩ','18,400 MΩ'],['Over-potential (AC withstand), 1 min','27 kV','No breakdown'],['Contact resistance, breaker 52-1','≤ 60 µΩ','38 µΩ'],['Breaker timing, open / close','Manufacturer data','Within limits'],['Relay 50/51 secondary injection','600 A ± 5%','603 A'],['Trip circuit and interlocks','Functional','Operated']],
 sign:[['Testing specialist','Tested by · NETA-certified technician'],['CSI QA/QC engineer','Witnessed, reviewed and accepted'],['Consultant','Hold point released']]
};
const tagCls={Approved:'ok',Complete:'ok',Witnessed:'ok',Verified:'ok',Pending:'wait',Scheduled:'wait','In progress':'wait'};
views[0].innerHTML='<table><thead><tr><th>Record</th><th>Document</th><th class="hide-s">Discipline</th><th>Status</th></tr></thead><tbody>'+DOCS.reg.map(r=>`<tr><td class="mono">${r[0]}</td><td>${r[1]}</td><td class="hide-s">${r[2]}</td><td><em class="${tagCls[r[3]]}">${r[3]}</em></td></tr>`).join('')+'</tbody></table>';
views[1].innerHTML='<div class="vh"><b>QC-PDC01-014</b> · MV switchgear SWGR-1 · ITP checklist item 3</div><div class="qc"><ul>'+DOCS.qc.map(r=>`<li><i></i><span>${r[0]}<small>${r[1]}</small></span></li>`).join('')+'</ul><div class="ph">'+['50','60','110'].map(n=>`<figure><img src="${new URL(`./evidence/e-${n}.webp`,import.meta.url)}" alt=""><figcaption>IMG_${n}4 · geotagged</figcaption></figure>`).join('')+'</div></div>';
views[2].innerHTML='<div class="vh"><b>ATS-PDC01-SWGR1</b> · acceptance test, witnessed by CSI · sample values</div><table><thead><tr><th>Test</th><th class="hide-s">Required</th><th>Measured</th><th>Result</th></tr></thead><tbody>'+DOCS.fat.map(r=>`<tr><td>${r[0]}</td><td class="hide-s mono">${r[1]}</td><td class="mono">${r[2]}</td><td><em class="ok">Pass</em></td></tr>`).join('')+'</tbody></table><p class="inst">Instruments: insulation tester and relay test set, NIST-traceable calibration certificates attached.</p>';
views[3].innerHTML='<div class="vh"><b>ATS-PDC01-SWGR1</b> · sign-off</div><div class="sig">'+DOCS.sign.map(r=>`<div class="sg"><i></i><div><b>${r[0]}</b><small>${r[1]}</small></div><span class="mono">signed</span></div>`).join('')+'</div><div class="stamp">Hold point released<small>0 open NCRs · ready for permit to energize</small></div>';
const rows=views.map(v=>[...v.querySelectorAll('tbody tr, .qc li, figure, .sg, .stamp')]);
tabs.forEach((t,i)=>t.onclick=()=>scrollTo({top:uToScroll(154+12.5*(i+0.15)/4),behavior:'smooth'}));
let docTab=-1;
function docsStep(q){
 const t=Math.min(3,Math.floor(q*4)),local=q*4-t;
 if(t!==docTab){docTab=t;views.forEach((v,i)=>v.classList.toggle('on',i===t));tabs.forEach((x,i)=>x.classList.toggle('on',i===t));crumbEl.textContent=tabs[t].textContent}
 const list=rows[t],n=Math.ceil(clamp(local/0.45)*list.length);
 list.forEach((r,i)=>r.classList.toggle('in',i<n));
 docsEl.querySelector('.prog i').style.width=(q*100)+'%';
}

/* ---------------- interpolation ---------------- */
const V=a=>new THREE.Vector3(...a);
const curP=new THREE.CatmullRomCurve3(K.map(k=>V(k.p)),false,'centripetal');
const curT=new THREE.CatmullRomCurve3(K.map(k=>V(k.t)),false,'centripetal');
const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));
const smooth=t=>t*t*(3-2*t),easeIn=t=>1-Math.cos(t*Math.PI/2),easeOut=t=>Math.sin(t*Math.PI/2);
const ramp=(u,a,b)=>smooth(clamp((u-a)/(b-a)));
function camAt(u){
 let i=0;while(i<K.length-2&&u>K[i+1].u)i++;
 const a=K[i],b=K[i+1];let t=clamp((u-a.u)/(b.u-a.u));
 t=a.s&&b.s?smooth(t):a.s?easeIn(t):b.s?easeOut(t):t;
 const g=(i+t)/(K.length-1);
 return {p:curP.getPoint(g),l:curT.getPoint(g),o:a.o+(b.o-a.o)*t};
}

/* ---------------- render loop ---------------- */
let target=0,cur=0;
const qs=new URLSearchParams(location.search);
const read=()=>{target=clamp(scrollY/Math.max(1,maxScroll()))};
addEventListener('scroll',read,{passive:true});
if(qs.has('u')){scrollTo(0,uToScroll(+qs.get('u')));}
else if(qs.has('stop')){const n=clamp(+qs.get('stop')||0,0,STAGES.length-1);scrollTo(0,uToScroll(STAGES[n].u[0]+(n?2.5:0)));}
if(qs.has('poster'))document.body.classList.add('poster');
if(qs.has('embed'))document.body.classList.add('embed');
const CONTACT=THEME==='hunter'?'https://www.hunterbuildings.com/hunter-buildings-quote/':'https://www.csicx.com/en/contact-us';
document.querySelectorAll('a[href="#contact"]').forEach(a=>{a.href=CONTACT;a.target='_top';a.rel='noopener'});
read();cur=target;
let W=1,H=1,portrait=false;
let split=false;
function resize(){W=canvas.clientWidth||stage.clientWidth;H=canvas.clientHeight||stage.clientHeight;renderer.setSize(W,H,false);camera.aspect=W/H;portrait=camera.aspect<0.8;split=W<stage.clientWidth*0.9||H<stage.clientHeight*0.9}
addEventListener('resize',resize);resize();

const tmp=new THREE.Vector3(),fwd=new THREE.Vector3();
let active=-1;
const allParts=Object.values(PARTS);
document.getElementById('loading').style.opacity=0;setTimeout(()=>document.getElementById('loading').remove(),700);

function frame(now){
 cur+=(target-cur)*(qs.has('u')?1:0.09);
 const u=cur*U;
 // camera
 const c=camAt(u);
 const fovOut=portrait?52:38,fovIn=portrait?72:60;
 camera.fov=fovIn+(fovOut-fovIn)*c.o;
 { // keep the long building in frame on narrow views when outside
  const hf=2*Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov)/2)*camera.aspect);
  const k=1+(Math.max(1,Math.tan(THREE.MathUtils.degToRad(29))/Math.tan(hf/2))-1)*c.o;
  c.p.sub(c.l).multiplyScalar(k).add(c.l);
 }
 if(split||qs.has('poster'))camera.clearViewOffset();
 else if(portrait)camera.setViewOffset(W,H,0,H*0.17,W,H);
 else camera.setViewOffset(W,H,-W*0.1,0,W,H);
 camera.updateProjectionMatrix();
 camera.position.copy(c.p);camera.lookAt(c.l);

 // doors, interior lights, beacon
 const open=ramp(u,26,34)*(1-ramp(u,175,180));
 setDoors(open*THREE.MathUtils.degToRad(100));
 const lit=clamp(0.08+ramp(u,27,36)*0.92);
 inLights.forEach(l=>l.intensity=lit*9);
 doorGlow.intensity=open*lit*8;
 const dusk=0.35+0.65*ramp(u,179,194);
 extLamps.forEach(l=>l.intensity=dusk*4);
 for(const m of LAMPS)m.emissiveIntensity=m.userData.key==='walllamp'?dusk*2.2:lit*1.3;
 for(const p of allParts){if(!p.interior)continue;for(const m of p.mats)m.envMapIntensity=0.2+0.45*lit}
 for(const m of SIGNMATS)m.envMapIntensity=0.3+0.4*lit;
 if(beaconMat){const g=ramp(u,189,192);beaconMat.emissive.setRGB(1-g*0.83,0.69+g*0.31*0.85,0.12+g*0.35);beaconMat.emissiveIntensity=2+Math.sin(now/300)*0.6}

 // stage
 let a=STAGES.findIndex(s=>u>=s.u[0]&&u<s.u[1]);if(a<0)a=STAGES.length-1;
 if(a!==active){active=a;els.forEach((e,i)=>e.classList.toggle('on',i===a));dEls.forEach((d,i)=>d.classList.toggle('done',i<=a));count.textContent=String(a+1).padStart(2,'0')+' / '+STAGES.length;planLbl.textContent=STAGES[a].room;
  for(const k in planRects)planRects[k].classList.toggle('on',STAGES[a].glow===k)}
 const S=STAGES[a];
 if(REC)els.forEach((e,i)=>{const st=STAGES[i],v=clamp(Math.min(i===0?9:(u-st.u[0])/1.6,i===STAGES.length-1?9:(st.u[1]-u)/1.6));e.style.opacity=v;e.style.visibility=v>0?'visible':'hidden'});
 const inStage=clamp(Math.min((u-S.u[0])/2.5,(S.u[1]-u)/2.5));
 const pulse=0.5+0.5*Math.sin(now/520);
 for(const p of allParts)p.glow(p.name===S.glow?inStage*(0.14+0.12*pulse):0);

 // hotspots
 camera.getWorldDirection(fwd);
 STAGES.forEach((s,i)=>s.spotEls.forEach(sp=>{
  let vis=0;
  if(i===a){
   tmp.copy(sp.v).sub(camera.position);const ahead=tmp.dot(fwd)>0.3;
   tmp.copy(sp.v).project(camera);
   const x=(tmp.x*0.5+0.5)*W,y=(-tmp.y*0.5+0.5)*H;
   const onScreen=ahead&&x>8&&x<W-8&&y>70&&y<(portrait?H*0.55:H-60);
   if(onScreen){vis=inStage;sp.e.style.transform=`translate(${x}px,${y}px)`;sp.e.classList.toggle('flip',x>W*0.56)}
  }
  sp.e.style.opacity=vis;
 }));

 // floor plan
 const inside=1-c.o;
 planEl.style.opacity=inside>0.5&&!S.docs?1:0;
 if(inside>0.2){
  const x=camera.position.x,z=camera.position.z;me.setAttribute('cx',x);me.setAttribute('cy',z);
  const ang=Math.atan2(fwd.z,fwd.x),sp=0.5,r=3.2;
  cone.setAttribute('d',`M${x} ${z} L${x+r*Math.cos(ang-sp)} ${z+r*Math.sin(ang-sp)} L${x+r*Math.cos(ang+sp)} ${z+r*Math.sin(ang+sp)} Z`);
 }

 // records screen: wall goes dark, the monitor powers on, the record steps through
 const dark=ramp(u,150.8,152.9)*(1-ramp(u,168,169.6));
 darkEl.style.opacity=dark;document.body.classList.toggle('dark-on',dark>0.45);
 const on=ramp(u,152.6,154.2)*(1-ramp(u,166.8,168.2));
 docsEl.style.opacity=on;docsEl.style.pointerEvents=on>0.5?'auto':'none';
 monEl.style.transform=`translateY(${(1-on)*28}px) scale(${0.95+0.05*on})`;
 if(on>0)docsStep(clamp((u-154)/12.5));
 fillBar.style.width=(cur*100)+'%';hint.style.opacity=cur>0.01?0:1;
 renderer.render(scene,camera);
 if(qs.has('u')&&++stillFrames>3){window.__ready=true;return}
 if(REC)return;
 requestAnimationFrame(frame);
}
let stillFrames=0;
// recording mode (?rec): the page renders only when asked, one frame per call
const REC=qs.has('rec');
if(REC){document.body.classList.add('rec');window.__renderAt=u=>{target=cur=clamp(u/U);frame(u*120)};window.__U=U;window.__ready=true}
requestAnimationFrame(frame);
addEventListener('keydown',e=>{
 if(!['ArrowDown','ArrowRight','ArrowUp','ArrowLeft','PageDown','PageUp'].includes(e.key))return;
 const n=clamp(active+(/Down|Right/.test(e.key)?1:-1),0,STAGES.length-1);
 e.preventDefault();scrollTo({top:uToScroll(STAGES[n].u[0]+0.5),behavior:'smooth'});
});
