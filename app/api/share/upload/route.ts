import {readTicket} from '../../../review-storage';
import {payloadPath} from '../../../review-lifecycle';
import {handleUpload,HandleUploadBody} from '@vercel/blob/client';
export const runtime='nodejs';
const recent=new Map<string,{count:number;until:number}>();
export async function POST(request:Request){
 if(!process.env.BLOB_READ_WRITE_TOKEN)return Response.json({error:'Preview storage is temporarily unavailable.'},{status:503});
 try{
  const body=await request.json() as HandleUploadBody;
  const result=await handleUpload({request,body,onBeforeGenerateToken:async (pathname,clientPayload)=>{
   const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)throw new Error('Invalid origin.');
   const review=pathname.startsWith('review-v2/');if(review&&pathname!==payloadPath(readTicket(clientPayload!)))throw new Error('Invalid upload');
   if(!review&&!/^previews\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.json$/.test(pathname))throw new Error('Invalid preview path.');
   const now=Date.now(),ip=request.headers.get('x-forwarded-for')?.split(',')[0]||'unknown';for(const [k,v] of recent)if(v.until<now)recent.delete(k);
   const bucket=recent.get(ip)||{count:0,until:now+600000};if(bucket.count>=10)throw new Error('Too many shares. Please try again later.');bucket.count++;recent.set(ip,bucket);
   return {allowedContentTypes:['application/json'],maximumSizeInBytes:22000000,addRandomSuffix:false,allowOverwrite:false,validUntil:Date.now()+600000,cacheControlMaxAge:review?60:31536000};
  },onUploadCompleted:async()=>{}});
  return Response.json(result,{headers:{'Cache-Control':'no-store'}});
 }catch{return Response.json({error:'Could not authorize preview upload. Please try again later.'},{status:400});}
}
