import {put} from '@vercel/blob';
import {randomUUID} from 'node:crypto';
import {validateScene} from '../../share-state';
export const runtime='nodejs';
const recent=new Map<string,{count:number;until:number}>();
export async function POST(request:Request){
 if(!process.env.BLOB_READ_WRITE_TOKEN)return Response.json({error:'Hosted sharing is not configured.'},{status:503});
 const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return Response.json({error:'Invalid origin.'},{status:403});
 const ip=request.headers.get('x-forwarded-for')?.split(',')[0]||'unknown',now=Date.now();
 for(const [key,v] of recent)if(v.until<now)recent.delete(key);
 const bucket=recent.get(ip)||{count:0,until:now+600000};if(bucket.count>=10)return Response.json({error:'Too many shares. Please try again later.'},{status:429});bucket.count++;recent.set(ip,bucket);
 try{
  const text=await request.text();if(new TextEncoder().encode(text).length>3800000)return Response.json({error:'This artwork is too large to share. Please use a smaller PNG.'},{status:413});
  const p=validateScene(JSON.parse(text));
  if(p.version!==1)return Response.json({error:'Multi-label shares must use /api/review.'},{status:400,headers:{'Cache-Control':'no-store'}});
  const scene={version:p.version,image:p.image,background:p.background,lightIntensity:p.lightIntensity,lightHardness:p.lightHardness,labelHeight:p.labelHeight,labelBottom:p.labelBottom,auto:p.auto,view:p.view};
  const id=randomUUID();await put(`previews/${id}.json`,JSON.stringify(scene),{access:'public',addRandomSuffix:false,allowOverwrite:false,contentType:'application/json',cacheControlMaxAge:31536000});
  return Response.json({id},{status:201,headers:{'Cache-Control':'no-store'}});
 }catch{return Response.json({error:'Could not save this preview. Please try again.'},{status:400});}
}
