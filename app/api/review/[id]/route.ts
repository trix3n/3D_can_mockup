import {head,BlobNotFoundError} from '@vercel/blob';
import {readManifest,noStore} from '../../../review-storage';
import {UUID,MAX_SHARE_BYTES} from '../../../review-lifecycle';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 if(!UUID.test(id))return Response.json({error:'Share project not found'},{status:404,headers:noStore});
 try{const m=await readManifest(id);if(!m)return Response.json({error:'Share project not found'},{status:404,headers:noStore});if(Date.now()>=m.expiresAt)return Response.json({error:'This share link has expired'},{status:410,headers:noStore});const blob=await head(m.files[0]);if(blob.size>MAX_SHARE_BYTES)throw new Error('Too large');return Response.json({url:blob.url,expiresAt:m.expiresAt,serverNow:Date.now()},{headers:noStore});}
 catch(e){return Response.json({error:e instanceof BlobNotFoundError?'Share project not found':'Share temporarily unavailable'},{status:e instanceof BlobNotFoundError?404:503,headers:noStore});}
}
