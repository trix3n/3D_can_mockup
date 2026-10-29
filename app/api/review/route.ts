import {randomUUID} from 'node:crypto';
import {head,put} from '@vercel/blob';
import {signTicket,readTicket,readManifest,noStore} from '../../review-storage';
import {LIFETIME,MAX_SHARE_BYTES,payloadPath,manifestPath} from '../../review-lifecycle';
import {validateScene} from '../../share-state';
export const runtime='nodejs';
const recent=new Map<string,{count:number;until:number}>();
function check(request:Request){if(!process.env.BLOB_READ_WRITE_TOKEN)throw new Error('Storage unavailable');if(request.headers.get('origin')!==new URL(request.url).origin)throw new Error('Invalid origin');}
export async function POST(request:Request){
 try{check(request);const now=Date.now(),ip=request.headers.get('x-forwarded-for')?.split(',')[0]||'unknown';for(const [k,v]of recent)if(v.until<now)recent.delete(k);const b=recent.get(ip)||{count:0,until:now+600000};if(b.count>=10)return Response.json({error:'Too many shares'},{status:429,headers:noStore});b.count++;recent.set(ip,b);const id=randomUUID();return Response.json({id,ticket:signTicket(id)},{headers:noStore});}
 catch{return Response.json({error:'Could not create share'},{status:400,headers:noStore});}
}
export async function PUT(request:Request){
 try{check(request);if(Number(request.headers.get('content-length'))>1024)throw new Error('Invalid request');const text=await request.text();if(text.length>1024)throw new Error('Invalid request');const id=readTicket(JSON.parse(text).ticket);const existing=await readManifest(id);if(existing)return Response.json({id,expiresAt:existing.expiresAt},{headers:noStore});const blob=await head(payloadPath(id));if(blob.size>MAX_SHARE_BYTES)throw new Error('Too large');const response=await fetch(blob.url,{cache:'no-store'});if(!response.ok)throw new Error('Upload unavailable');const scene=validateScene(await response.json());if(scene.version!==2)throw new Error('Invalid version');const createdAt=Date.now();const manifest={version:2,id,createdAt,expiresAt:createdAt+LIFETIME,files:[payloadPath(id)]};try{await put(manifestPath(id),JSON.stringify(manifest),{access:'public',contentType:'application/json',addRandomSuffix:false,allowOverwrite:false,cacheControlMaxAge:60});}catch(e){if(!await readManifest(id))throw e;}return Response.json({id},{headers:noStore});}
 catch{return Response.json({error:'Could not finish share'},{status:400,headers:noStore});}
}
