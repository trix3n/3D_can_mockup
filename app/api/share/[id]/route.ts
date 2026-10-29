import {head,BlobNotFoundError} from '@vercel/blob';
import {validateScene} from '../../../share-state';
export const runtime='nodejs';
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
 const {id}=await params;if(!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(id))return Response.json({error:'Preview not found.'},{status:404});
 if(!process.env.BLOB_READ_WRITE_TOKEN)return Response.json({error:'Preview storage unavailable.'},{status:503});
 try{
  const path=`previews/${id}.json`,blob=await head(path);
  if(!blob)return Response.json({error:'Preview not found.'},{status:404});
  if(blob.size>22000000)throw new Error('Unavailable');
  if(blob.size>3800000)return Response.redirect(blob.url,307);
  const response=await fetch(blob.url);if(!response.ok)throw new Error('Unavailable');
  return Response.json(validateScene(await response.json()),{headers:{'Cache-Control':'public, max-age=31536000, immutable'}});
 }catch(e){if(e instanceof BlobNotFoundError)return Response.json({error:'Preview not found.'},{status:404});return Response.json({error:'Could not load this preview.'},{status:503});}
}
