import * as THREE from 'three';
import {createLidSurface} from './lid-surface';
import {useMemo,useEffect} from 'react';

// Scene units: 1 unit = 100 mm. Overall envelope: Ø52 × 134 mm.
export const bodyProfile: [number,number][] = [
 [0,.028],[.15,.028],[.205,.022],[.228,.006],[.237,0],
 [.244,.004],[.251,.013],[.257,.028],[.26,.04],
 [.26,.055],[.26,1.24],[.2598,1.248],[.258,1.253],
 [.255,1.263],[.251,1.274],[.247,1.284],[.245,1.293],
 [.245,1.314],[.247,1.325],
];
const silver={color:'#e2e3e4',metalness:1,roughness:.26,envMapIntensity:1};
function lathe(points:[number,number][]){return new THREE.LatheGeometry(points.map(([r,y])=>new THREE.Vector2(r,y)),192);}
function tabGeometry(){
 const s=new THREE.Shape();
 s.moveTo(-.061,-.075);s.bezierCurveTo(-.085,-.055,-.082,.025,-.066,.085);s.bezierCurveTo(-.055,.134,.055,.134,.066,.085);s.bezierCurveTo(.082,.025,.085,-.055,.061,-.075);s.bezierCurveTo(.035,-.102,-.035,-.102,-.061,-.075);
 // Real through holes, not dark discs sitting on a flat lid.
 const finger=new THREE.Path();finger.moveTo(-.047,.038);finger.bezierCurveTo(-.054,.059,-.051,.092,-.034,.101);finger.bezierCurveTo(-.012,.117,.032,.112,.043,.094);finger.bezierCurveTo(.057,.073,.051,.052,.045,.038);finger.lineTo(-.047,.038);s.holes.push(finger);
 const rivetHole=new THREE.Path();rivetHole.absellipse(0,-.045,.044,.032,0,Math.PI*2,true,0);s.holes.push(rivetHole);
 const g=new THREE.ExtrudeGeometry(s,{depth:.003,steps:1,bevelEnabled:true,bevelSegments:8,bevelSize:.0035,bevelThickness:.0018,curveSegments:48});g.rotateX(-Math.PI/2);return g;
}
export function CanLid(){
 const parts=useMemo(()=>({
 lid:createLidSurface(),
 tab:tabGeometry(),
 bottom:lathe([[.205,.028],[.214,.016],[.224,.005],[.234,.006],[.24,.012],[.243,.02]]),
 }),[]);
 useEffect(()=>()=>Object.values(parts).forEach(g=>g.dispose()),[parts]);
 return <group>
 <mesh geometry={parts.lid} castShadow receiveShadow><meshPhysicalMaterial {...silver} roughness={.3} clearcoat={.08}/></mesh>
 <mesh geometry={parts.tab} position={[0,1.3125,0]} castShadow receiveShadow><meshPhysicalMaterial {...silver} roughness={.22} clearcoat={.12}/></mesh>
 <mesh position={[0,1.3145,-.028]} castShadow receiveShadow><cylinderGeometry args={[.011,.013,.008,64]}/><meshStandardMaterial {...silver} roughness={.25}/></mesh>
 <mesh position={[0,1.319,-.028]} rotation={[Math.PI/2,0,0]}><torusGeometry args={[.0087,.0009,12,64]}/><meshStandardMaterial {...silver}/></mesh>
 <mesh geometry={parts.bottom}><meshStandardMaterial {...silver}/></mesh>
 </group>;
}
