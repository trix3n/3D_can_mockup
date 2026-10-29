'use client';
import {Canvas,useFrame,useThree} from '@react-three/fiber';
import {OrbitControls,ContactShadows} from '@react-three/drei';
import * as THREE from 'three';
import {ViewState} from './share-state';
import StudioLighting from './studio-lighting';
import {CAN,CIRCUMFERENCE} from './label-layout';
import {bodyProfile,CanLid} from './can-geometry';
import {useEffect,useMemo,useRef,useState,MutableRefObject,ComponentRef} from 'react';
type Props={initialView?:ViewState;viewState?:MutableRefObject<ViewState|undefined>;lightIntensity:number;lightHardness:number;cameraMode:'orbit'|'pan';resetCamera:number;background:string;image:string|null;auto:boolean;labelHeight:number;labelBottom:number;capture:MutableRefObject<null|((d:number,q:string)=>Promise<Blob>)>;onReady:()=>void;recording:boolean};
function makeTexture(){const c=document.createElement('canvas');c.width=1024;c.height=768;const x=c.getContext('2d')!;x.fillStyle='#d9ed5b';x.fillRect(0,0,1024,768);x.fillStyle='#213e2b';x.textAlign='center';x.font='bold 110px Georgia';x.fillText('zest',768,230);x.font='19px sans-serif';x.fillText('A LITTLE MORE ALIVE.',768,280);x.font='bold 30px sans-serif';x.fillText('YUZU & LIME',768,555);x.font='17px sans-serif';x.fillText('SPARKLING BOTANICAL WATER',768,590);x.fillText('250 ml   /   NATURALLY BRIGHT',768,655);for(let i=0;i<7;i++){x.strokeStyle='#3c603e';x.lineWidth=2;x.beginPath();x.ellipse(768,420,95-i*10,65-i*7,-.4,0,Math.PI*2);x.stroke();}return c;}
function Can({p,turn}:{p:Props;turn:React.MutableRefObject<{active:boolean;start:number;duration:number}>}){const group=useRef<THREE.Group>(null);const [texture,setTexture]=useState<THREE.Texture|null>(null);const body=useMemo(()=>new THREE.LatheGeometry(bodyProfile.map(([r,y])=>new THREE.Vector2(r,y)),128),[]);
 useEffect(()=>{let cancelled=false;let tex:THREE.Texture;async function load(){let c:HTMLCanvasElement;if(p.image){const im=await new Promise<HTMLImageElement>((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=reject;i.src=p.image!;});c=document.createElement('canvas');c.width=2048;c.height=Math.round(2048*p.labelHeight/(CIRCUMFERENCE-CAN.gap));const ctx=c.getContext('2d')!;ctx.drawImage(im,0,0,c.width,c.height);}else c=makeTexture();tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=8;if(!cancelled)setTexture(tex);else tex.dispose();}load().catch(()=>{});return()=>{cancelled=true;};},[p.image,p.labelHeight]);
 useEffect(()=>()=>texture?.dispose(),[texture]);
 useEffect(()=>()=>body.dispose(),[body]);
 useFrame((_,delta)=>{if(!group.current)return;if(turn.current.active)group.current.rotation.y=(performance.now()-turn.current.start)/1000/turn.current.duration*Math.PI*2+Math.PI*.06;else if(p.auto&&!p.recording)group.current.rotation.y+=delta*.22;if(p.viewState?.current)p.viewState.current.rotation=group.current.rotation.y;});
 const metal={color:'#e3e6e8',metalness:1,roughness:.28,envMapIntensity:1.15};return <group ref={group} position={[0,-.67,0]} rotation={[0,p.initialView?.rotation??Math.PI*.06,0]}><mesh geometry={body} castShadow><meshPhysicalMaterial {...metal} clearcoat={.12}/></mesh>{texture&&<mesh position={[0,(p.labelBottom+p.labelHeight/2)/100,0]}><cylinderGeometry args={[.26015,.26015,p.labelHeight/100,192,1,true,Math.PI+Math.PI*CAN.gap/CIRCUMFERENCE,Math.PI*2*(1-CAN.gap/CIRCUMFERENCE)]}/><meshPhysicalMaterial map={texture} metalness={0} roughness={.42} clearcoat={.32} clearcoatRoughness={.27} envMapIntensity={.65} polygonOffset polygonOffsetFactor={-2} polygonOffsetUnits={-2} transparent/></mesh>}<CanLid/></group>}

function Capture({p,turn}:{p:Props;turn:React.MutableRefObject<{active:boolean;start:number;duration:number}>}) {
 const {gl,scene,camera}=useThree();
 useEffect(()=>{
  p.onReady();
  p.capture.current=async(duration,quality)=>{
   if(typeof MediaRecorder==='undefined')throw new Error('Your browser does not support video recording. Please use Chrome or Firefox.');
   const mime=['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'].find(t=>MediaRecorder.isTypeSupported(t));
   if(!mime)throw new Error('Your browser does not support WebM recording.');
   const canvas=document.createElement('canvas');canvas.width=+quality;canvas.height=+quality;
   const ctx=canvas.getContext('2d')!;
   const stream=canvas.captureStream(30),chunks:Blob[]=[];
   const recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:quality==='1080'?10000000:5000000});
   return new Promise<Blob>((resolve,reject)=>{
    let raf=0,timer:ReturnType<typeof setTimeout>;
    const finish=()=>{cancelAnimationFrame(raf);clearTimeout(timer);stream.getTracks().forEach(t=>t.stop());turn.current.active=false;};
    recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
    recorder.onerror=()=>{finish();reject(new Error('Could not record video. Please try Chrome or Edge.'));};
    recorder.onstop=()=>{finish();const blob=new Blob(chunks,{type:mime});if(blob.size)resolve(blob);else reject(new Error('The recording is empty. Please try again.'));};
    turn.current={active:true,start:performance.now(),duration};
    function draw(){
     try {
      gl.render(scene,camera);
      const gradient=ctx.createRadialGradient(canvas.width/2,canvas.height*.34,0,canvas.width/2,canvas.height*.34,canvas.width*.8);
      gradient.addColorStop(0,'#f4f5ef');gradient.addColorStop(1,'#cdd5ca');
      ctx.fillStyle=p.background==='gradient'?gradient:p.background;ctx.fillRect(0,0,canvas.width,canvas.height);
      const source=gl.domElement,scale=Math.min(canvas.width/source.width,canvas.height/source.height);
      ctx.drawImage(source,(canvas.width-source.width*scale)/2,(canvas.height-source.height*scale)/2,source.width*scale,source.height*scale);
      raf=requestAnimationFrame(draw);
     }catch{if(recorder.state==='recording')recorder.stop();finish();reject(new Error('Could not capture the 3D scene. Please try again.'));}
    }
    try {recorder.start(200);draw();timer=setTimeout(()=>{cancelAnimationFrame(raf);if(recorder.state==='recording')recorder.stop();},duration*1000);}
    catch{finish();reject(new Error('Could not start recording.'));}
   });
  };
  return()=>{p.capture.current=null;};
 },[gl,scene,camera,p.capture,p.onReady,p.background]);
 return null;
}
function CameraControls({p}:{p:Props}) {
 const orbit=useRef<ComponentRef<typeof OrbitControls>>(null);const {camera}=useThree();
 useEffect(()=>{if(!orbit.current)return;const controls=orbit.current;controls.enableDamping=false;controls.update();camera.position.fromArray(p.initialView?.position??[1.6,.85,4.3]);camera.up.set(0,1,0);controls.target.fromArray(p.initialView?.target??[0,0,0]);controls.update();controls.enableDamping=true;},[p.resetCamera,camera]);
 useFrame(()=>{if(p.viewState&&orbit.current)p.viewState.current={position:camera.position.toArray() as [number,number,number],target:orbit.current.target.toArray() as [number,number,number],rotation:p.viewState.current?.rotation??Math.PI*.06};});
 return <OrbitControls ref={orbit} makeDefault enablePan screenSpacePanning enableDamping dampingFactor={.09} panSpeed={.8} minDistance={1.1} maxDistance={8} minPolarAngle={.08} maxPolarAngle={Math.PI*.85} enabled={!p.recording} mouseButtons={{LEFT:p.cameraMode==='pan'?THREE.MOUSE.PAN:THREE.MOUSE.ROTATE,MIDDLE:THREE.MOUSE.DOLLY,RIGHT:THREE.MOUSE.PAN}} touches={{ONE:p.cameraMode==='pan'?THREE.TOUCH.PAN:THREE.TOUCH.ROTATE,TWO:THREE.TOUCH.DOLLY_PAN}}/>;
}
export default function Scene(p:Props){
 const turn=useRef({active:false,start:0,duration:6});
 return <Canvas className="scene-canvas" shadows={{type:THREE.PCFShadowMap}} dpr={p.recording?1:[1,2]} camera={{position:[1.6,.85,4.3],fov:30}} gl={{antialias:true,alpha:true,preserveDrawingBuffer:true,toneMapping:THREE.ACESFilmicToneMapping,toneMappingExposure:1.12}}>
 <StudioLighting intensity={p.lightIntensity} hardness={p.lightHardness}/>
 <Can p={p} turn={turn}/>
 <ContactShadows frames={1} position={[0,-.675,0]} opacity={.35} scale={5} blur={2.8} far={2}/>
 <CameraControls p={p}/><Capture p={p} turn={turn}/>
 </Canvas>;
}
