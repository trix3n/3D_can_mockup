'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import {useFrame,useThree} from '@react-three/fiber';
import {Environment,Lightformer} from '@react-three/drei';
import * as THREE from 'three';

export function lightingSettings(intensity:number,hardness:number) {
 const strength=THREE.MathUtils.clamp(intensity,25,200)/100;
 const softness=1-THREE.MathUtils.clamp(hardness,0,100)/100;
 return {strength,spread:.12+softness*2.8,cardWidth:.45+softness*2.5,shadowRadius:1+softness*5};
}
export const KEY_POSITION=new THREE.Vector3(-3,1.3,4);
export function updateStudioFrame(camera:THREE.Camera,rig:THREE.Group,scene:THREE.Scene,strength:number,orientation=new THREE.Quaternion(),rotation=new THREE.Euler()) {
 camera.getWorldQuaternion(orientation);
 rig.quaternion.copy(orientation);
 // Three's PMREM shader negates Euler components. Encode the inverse camera
 // transform explicitly so combined yaw/pitch cannot make the reflections drift.
 orientation.invert();rotation.setFromQuaternion(orientation);
 rotation.set(-rotation.x,-rotation.y,-rotation.z,rotation.order);
 scene.environmentRotation.copy(rotation);
 scene.environmentIntensity=strength;
}
export default function StudioLighting({intensity,hardness}:{intensity:number;hardness:number}) {
 const rig=useRef<THREE.Group>(null);const {scene,camera}=useThree();
 const orientation=useMemo(()=>new THREE.Quaternion(),[]),rotation=useMemo(()=>new THREE.Euler(),[]);
 const settings=lightingSettings(intensity,hardness);
 const [reflectionHardness,setReflectionHardness]=useState(hardness);
 // Rebuild the static studio map only after the size slider settles, not every frame.
 useEffect(()=>{const timer=setTimeout(()=>setReflectionHardness(hardness),150);return()=>clearTimeout(timer);},[hardness]);
 useFrame(()=>{
  if(rig.current)updateStudioFrame(camera,rig.current,scene,settings.strength,orientation,rotation);
 });
 useEffect(()=>()=>{scene.environmentRotation.set(0,0,0);scene.environmentIntensity=1;},[scene]);
 const reflection=lightingSettings(100,reflectionHardness);
 const samples=useMemo(()=>[-1,0,1].flatMap(x=>[-1,0,1].filter(y=>x!==0||y!==0).map(y=>[x,y])),[]);
 return <>
 <ambientLight intensity={.05*settings.strength}/>
 <group ref={rig}>
 <directionalLight castShadow position={KEY_POSITION.toArray()} intensity={2.3*settings.strength} color="#fffaf4" shadow-mapSize={[2048,2048]} shadow-camera-left={-.85} shadow-camera-right={.85} shadow-camera-top={1.1} shadow-camera-bottom={-1.1} shadow-camera-near={.1} shadow-camera-far={9} shadow-bias={-.00005} shadow-normalBias={.0007} shadow-radius={settings.shadowRadius}/>
 {samples.map(([x,y],i)=><directionalLight key={i} position={[-3+x*settings.spread*.5,1.3+y*settings.spread*.7,4]} intensity={2.3/8*settings.strength} color="#fffaf4"/>)}
 <directionalLight position={[3,.8,2]} intensity={.35*settings.strength} color="#f4f7ff"/>
 </group>
 <Environment key={reflectionHardness} resolution={256}>
 <color attach="background" args={['#656a72']}/>
 <Lightformer intensity={5.5} position={[-2.6,.8,3.5]} rotation={[-.22,2.5,0]} scale={[reflection.cardWidth,4,1]}/>
 <Lightformer intensity={.8} position={[3,1,2]} rotation={[0,-Math.PI*3/4,0]} scale={[.7,4,1]}/>
 <Lightformer intensity={1.2} position={[-3,0,1]} rotation={[0,Math.PI/2,0]} scale={[1.5,4,1]}/>
 <Lightformer intensity={1} position={[0,2,-4]} scale={[4,3,1]}/>
 <Lightformer intensity={1.8} position={[0,4,0]} rotation={[Math.PI/2,0,.3]} scale={[3,2,1]}/>
 </Environment>
 </>;
}
