import {CAN} from './label-layout';
import type {ViewState} from './share-state';
export type CameraPoint=[number,number,number];
// The can is centered at the origin; scene units are 100 mm.
// Include near-plane clearance as well as the complete shoulder/lid envelope.
export const SHARE_CAMERA_BOUNDS:CameraPoint=[CAN.diameter/200+.12,CAN.height/200+.12,CAN.diameter/200+.12];
export const SHARE_MIN_DISTANCE=.45;
export function insideCanClearance(point:CameraPoint){return point.every((n,i)=>Math.abs(n)<SHARE_CAMERA_BOUNDS[i]);}
export function constrainShareCamera(previous:CameraPoint,desired:CameraPoint):CameraPoint{
 const result=[...desired] as CameraPoint;
 if(insideCanClearance(previous)){
  if(!insideCanClearance(result))return result;
  let axis=0;for(let i=1;i<3;i++)if(SHARE_CAMERA_BOUNDS[i]-Math.abs(result[i])<SHARE_CAMERA_BOUNDS[axis]-Math.abs(result[axis]))axis=i;
  result[axis]=(result[axis]<0?-1:1)*(SHARE_CAMERA_BOUNDS[axis]+.0001);return result;
 }
 // Sweep the entire movement, not only its endpoint: a large pan cannot tunnel
 // from one side of the can to the other between rendered frames.
 let entry=0,exit=1;
 for(let i=0;i<3;i++){
  const delta=desired[i]-previous[i],bound=SHARE_CAMERA_BOUNDS[i];
  if(Math.abs(delta)<1e-12){if(Math.abs(previous[i])>=bound)return result;continue;}
  const a=(-bound-previous[i])/delta,b=(bound-previous[i])/delta;
  entry=Math.max(entry,Math.min(a,b));exit=Math.min(exit,Math.max(a,b));
  if(entry>exit)return result;
 }
 if(exit<0||entry>1||exit<=entry)return result;
 const distance=Math.hypot(...desired.map((n,i)=>n-previous[i]));
 const t=Math.max(0,entry-.0001/Math.max(distance,.0001));
 return previous.map((n,i)=>n+(desired[i]-n)*t) as CameraPoint;
}
export function frameShareCamera(view:ViewState|undefined,width:number,height:number,fov=30){
 const aspect=Math.max(.1,width/Math.max(1,height));
 const landscape=height<=500&&width>=681;
 const top=width<=900&&!landscape?208:132,bottom=width<=1000&&!landscape?208:116;
 const verticalFraction=Math.max(.15,Math.min(.82,(height-2*Math.max(top,bottom))/height));
 const halfFov=Math.atan(Math.tan(fov*Math.PI/360)*Math.min(verticalFraction,aspect*.82));
 const radius=Math.hypot(CAN.diameter/200,CAN.height/200)+.02;
 const fit=radius/Math.sin(halfFov),maxDistance=Math.max(8,fit*1.5);
 let direction=(view?view.position.map((n,i)=>n-view.target[i]):[1.6,.85,4.3]) as CameraPoint;
 let length=Math.hypot(...direction);if(!Number.isFinite(length)||length<.1){direction=[1.6,.85,4.3];length=Math.hypot(...direction);}
 const distance=Math.min(maxDistance,Math.max(fit,length));
 return {position:direction.map(n=>n/length*distance) as CameraPoint,target:[0,0,0] as CameraPoint,maxDistance};
}
