export type ViewState={position:[number,number,number];target:[number,number,number];rotation:number};
export type SharedScene={version:1;image:string|null;background:string;lightIntensity:number;lightHardness:number;labelHeight:number;labelBottom:number;auto:boolean;view?:ViewState};
export function validateScene(s:unknown):SharedScene {
 const p=s as SharedScene;const finite=(v:unknown,min:number,max:number)=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max;
 if(!p||p.version!==1||!(p.image===null||typeof p.image==='string'&&/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(p.image)&&p.image.length<20000000)||!(/^#[0-9a-fA-F]{6}$/.test(p.background)||p.background==='gradient')||!finite(p.lightIntensity,25,200)||!finite(p.lightHardness,0,100)||!finite(p.labelHeight,10,120)||!finite(p.labelBottom,4,124-p.labelHeight)||typeof p.auto!=='boolean')throw new Error('This preview link is invalid or incomplete.');
 if(p.view){for(const v of [p.view.position,p.view.target])if(!Array.isArray(v)||v.length!==3||!v.every(n=>finite(n,-100,100)))throw new Error('Invalid camera settings.');if(!finite(p.view.rotation,-1e9,1e9))throw new Error('Invalid rotation.');const d=Math.hypot(...p.view.position.map((n,i)=>n-p.view!.target[i]));if(d<.1||d>30)throw new Error('Invalid camera distance.');}
 return p;
}
export async function encodeShare(scene:SharedScene):Promise<string>{
 validateScene(scene);if(typeof CompressionStream==='undefined')throw new Error('Sharing requires a current version of Chrome, Edge, Firefox or Safari.');
 const bytes=new Uint8Array(await new Response(new Blob([JSON.stringify(scene)]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer());
 let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
 const encoded=btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
 if(encoded.length>1800000)throw new Error('This artwork is too large for a self-contained link. Use a smaller PNG for sharing.');return encoded;
}
export async function decodeShare(encoded:string):Promise<SharedScene>{
 if(!encoded||encoded.length>1800000||!/^[A-Za-z0-9_-]+$/.test(encoded))throw new Error('This preview link is invalid or incomplete.');
 const bytes=Uint8Array.from(atob(encoded.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));const reader=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip')).getReader();const chunks:Uint8Array[]=[];let size=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>11000000)throw new Error('This preview exceeds the size limit.');chunks.push(value);}}finally{await reader.cancel();}
 const all=new Uint8Array(size);let offset=0;for(const c of chunks){all.set(c,offset);offset+=c.length;}return validateScene(JSON.parse(new TextDecoder().decode(all)));
}
