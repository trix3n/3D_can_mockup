import {list,del} from '@vercel/blob';
import {timingSafeEqual} from 'node:crypto';
import {readManifest,noStore} from '../../../review-storage';
import {cleanupProject,UUID} from '../../../review-lifecycle';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const maxDuration=60;
export async function GET(request:Request){
 const secret=process.env.CRON_SECRET,auth=request.headers.get('authorization')||'',expected=`Bearer ${secret}`;
 if(!secret||Buffer.byteLength(auth)!==Buffer.byteLength(expected)||!timingSafeEqual(Buffer.from(auth),Buffer.from(expected)))return Response.json({error:'Unauthorized'},{status:401,headers:noStore});
 // Never allow a Preview or development deployment to delete shared Blob files.
 if(process.env.VERCEL_ENV!=='production')return Response.json({error:'Cleanup is disabled outside production'},{status:403,headers:noStore});
 let cleaned=0,failed=0,cursor:string|undefined;const now=Date.now();
 try{
 do{const page=await list({prefix:'review-v2/manifests/',cursor,limit:100});for(const blob of page.blobs){const id=blob.pathname.slice('review-v2/manifests/'.length).replace(/\.json$/,'');if(!UUID.test(id)||blob.pathname!==`review-v2/manifests/${id}.json`)continue;try{const m=await readManifest(id);if(m&&await cleanupProject(m,now,del))cleaned++;}catch{failed++;}}cursor=page.hasMore?page.cursor:undefined;}while(cursor);
 // Tickets expire in ten minutes. An unfinalized upload older than 24h cannot be finalized.
 cursor=undefined;do{const page=await list({prefix:'review-v2/payloads/',cursor,limit:100});for(const blob of page.blobs){if(now-new Date(blob.uploadedAt).getTime()<86400000)continue;const id=blob.pathname.slice('review-v2/payloads/'.length).replace(/\.json$/,'');if(!UUID.test(id)||blob.pathname!==`review-v2/payloads/${id}.json`)continue;try{if(!await readManifest(id))await del(blob.pathname);}catch{failed++;}}cursor=page.hasMore?page.cursor:undefined;}while(cursor);
 return Response.json({cleaned,failed},{status:failed?500:200,headers:noStore});
 }catch{return Response.json({error:'Cleanup incomplete',cleaned,failed},{status:500,headers:noStore});}
}
