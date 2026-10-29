import * as THREE from 'three';

// One indexed, continuous sheet: stamped deck -> countersink -> rolled double seam.
// No floating wire contours, stacked disks or overlapping coplanar faces.
const deckContour = new THREE.CatmullRomCurve3([
 [-.102,-.137],[-.112,-.089],[-.092,.035],[-.065,.139],
 [0,.16],[.065,.139],[.092,.035],[.112,-.089],[.102,-.137],[0,-.168],
].map(([x,z])=>new THREE.Vector3(x,0,z)),true,'centripetal').getPoints(96);
const openingContour = new THREE.CatmullRomCurve3([
 [-.065,-.088],[-.083,-.108],[-.073,-.14],[-.035,-.155],
 [.035,-.155],[.073,-.14],[.083,-.108],[.065,-.088],[0,-.104],
].map(([x,z])=>new THREE.Vector3(x,0,z)),true,'centripetal').getPoints(64);
function distance(x:number,z:number,points:THREE.Vector3[]) {
 let min=Infinity,inside=false;
 for(let i=0,j=points.length-1;i<points.length;j=i++) {
  const a=points[j],b=points[i],dx=b.x-a.x,dz=b.z-a.z;
  const t=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz||1)));
  min=Math.min(min,(x-a.x-t*dx)**2+(z-a.z-t*dz)**2);
  if((a.z>z)!==(b.z>z)&&x<(b.x-a.x)*(z-a.z)/(b.z-a.z)+a.x)inside=!inside;
 }
 return Math.sqrt(min)*(inside?-1:1);
}
const profile=[
 [0,1.306],[.18,1.306],[.198,1.3064],[.208,1.308],
 [.216,1.310],[.221,1.308],[.225,1.311],[.229,1.321],
 [.234,1.332],[.24,1.338],[.246,1.3398],[.249,1.34],
];
function radialHeight(r:number) {
 let i=1;while(i<profile.length-1&&profile[i][0]<r)i++;
 const [r0,y0]=profile[i-1],[r1,y1]=profile[i];const t=(r-r0)/(r1-r0);
 return y0+(y1-y0)*THREE.MathUtils.smoothstep(t,0,1);
}
export function stampedHeight(x:number,z:number) {
 const r=Math.hypot(x,z);let y=radialHeight(r);
 if(r<.195) {
  const d=distance(x,z,deckContour),s=distance(x,z,openingContour);
  // Drawn aluminium: shallow raised panel, pressed groove, rounded inner bead.
  y+=.0015*(1-THREE.MathUtils.smoothstep(d,-.004,.001));
  y-=.0012*Math.exp(-((d/.0018)**2));
  y+=.0011*Math.exp(-(((d+.0035)/.0028)**2));
  // Scored, unopened pour panel with a soft recessed edge.
  y-=.0009*Math.exp(-((s/.0014)**2));
  y+=.0006*Math.exp(-(((s+.003)/.002)**2));
 }
 return y;
}
export function createLidSurface(segments=256,rings=240) {
 const vertices:number[]=[0,stampedHeight(0,0),0],uvs:number[]=[.5,.5],indices:number[]=[];
 const radii:Array<[number,number|null]>=Array.from({length:rings},(_,i)=>[(i+1)*.249/rings,null]);
 // Fold back beneath the seam to meet the body's neck at r=24.7 mm.
 radii.push([.2515,1.3395],[.2534,1.338],[.254,1.335],[.2536,1.332],[.252,1.329],[.249,1.327],[.247,1.324]);
 for(const [r,y] of radii)for(let a=0;a<segments;a++) {
  const theta=a/segments*Math.PI*2,x=Math.sin(theta)*r,z=Math.cos(theta)*r;
  vertices.push(x,y??stampedHeight(x,z),z);uvs.push(x/.508+.5,z/.508+.5);
 }
 for(let a=0;a<segments;a++)indices.push(0,1+a,1+(a+1)%segments);
 for(let ring=1;ring<radii.length;ring++)for(let a=0;a<segments;a++) {
  const prev=1+(ring-1)*segments,next=1+ring*segments,b=(a+1)%segments;
  indices.push(prev+a,next+a,next+b,prev+a,next+b,prev+b);
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));g.setIndex(indices);g.computeVertexNormals();g.computeBoundingBox();return g;
}
