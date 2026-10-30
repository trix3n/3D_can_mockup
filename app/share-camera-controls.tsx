'use client';
import {useEffect,useRef,ComponentRef} from 'react';
import {useFrame,useThree} from '@react-three/fiber';
import {OrbitControls} from '@react-three/drei';
import * as THREE from 'three';
import type {ViewState} from './share-state';
import {CameraPoint,frameShareCamera,constrainShareCamera,SHARE_MIN_DISTANCE} from './share-camera';

type Props={initialView?:ViewState;mode:'orbit'|'pan';reset:number};
export default function ShareCameraControls({initialView,mode,reset}:Props){
 const orbit=useRef<ComponentRef<typeof OrbitControls>>(null);
 const {camera,size}=useThree();const moved=useRef(false);
 const previous=useRef<CameraPoint|null>(null),previousTarget=useRef(new THREE.Vector3());
 const lastReset=useRef(reset);
 useEffect(()=>{
  const controls=orbit.current;if(!controls)return;
  if(lastReset.current!==reset){moved.current=false;lastReset.current=reset;}
  const frame=frameShareCamera(initialView,size.width,size.height,(camera as THREE.PerspectiveCamera).fov);
  controls.maxDistance=moved.current?Math.max(frame.maxDistance,camera.position.distanceTo(controls.target)):frame.maxDistance;
  // Browser chrome/viewport changes must not discard an inspection already in progress.
  if(!moved.current){
   controls.enableDamping=false;controls.update();camera.position.fromArray(frame.position);camera.up.set(0,1,0);controls.target.fromArray(frame.target);controls.update();controls.enableDamping=true;
   previous.current=camera.position.toArray() as CameraPoint;previousTarget.current.copy(controls.target);
  }
 },[camera,size.width,size.height,reset,initialView]);
 // Drei updates OrbitControls at priority -1. Resolve its proposed movement
 // before the light rig and rendering, including right-drag and touch pan.
 useFrame(()=>{
  const controls=orbit.current;if(!controls)return;
  const desired=camera.position.toArray() as CameraPoint;
  const safe=constrainShareCamera(previous.current??desired,desired);
  if(safe.some((n,i)=>Math.abs(n-desired[i])>1e-10)){
   if(controls.target.distanceToSquared(previousTarget.current)>1e-12)controls.target.add(new THREE.Vector3(...safe).sub(camera.position));
   camera.position.fromArray(safe);camera.lookAt(controls.target);camera.updateMatrixWorld();
  }
  previous.current=safe;previousTarget.current.copy(controls.target);
 },-.5);
 return <OrbitControls ref={orbit} makeDefault enablePan screenSpacePanning enableDamping dampingFactor={.09} panSpeed={.8} minDistance={SHARE_MIN_DISTANCE} minPolarAngle={.08} maxPolarAngle={Math.PI*.85} onStart={()=>{moved.current=true;}} mouseButtons={{LEFT:mode==='pan'?THREE.MOUSE.PAN:THREE.MOUSE.ROTATE,MIDDLE:THREE.MOUSE.DOLLY,RIGHT:THREE.MOUSE.PAN}} touches={{ONE:mode==='pan'?THREE.TOUCH.PAN:THREE.TOUCH.ROTATE,TWO:THREE.TOUCH.DOLLY_PAN}}/>;
}
