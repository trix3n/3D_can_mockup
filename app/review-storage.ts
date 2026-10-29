import {head,BlobNotFoundError} from '@vercel/blob';
import {createHmac,timingSafeEqual} from 'node:crypto';
import {manifestPath,validateManifest,UUID} from './review-lifecycle';
export function signTicket(id:string,issuedAt=Date.now()){
 const data=`${id}.${issuedAt}`;return `${data}.${createHmac('sha256',process.env.BLOB_READ_WRITE_TOKEN!).update(data).digest('hex')}`;
}
export function readTicket(ticket:string){
 if(typeof ticket!=='string'||ticket.length>200)throw new Error('Invalid ticket');
 const [id,time,signature]=ticket.split('.');const issuedAt=Number(time);
 if(!UUID.test(id)||!Number.isSafeInteger(issuedAt)||Date.now()<issuedAt||Date.now()-issuedAt>600000)throw new Error('Expired ticket');
 const expected=signTicket(id,issuedAt).split('.')[2];
 if(!signature||signature.length!==expected.length||!timingSafeEqual(Buffer.from(signature),Buffer.from(expected)))throw new Error('Invalid ticket');
 return id;
}
export async function readManifest(id:string){
 try{const blob=await head(manifestPath(id));if(blob.size>4096)throw new Error('Invalid manifest');const response=await fetch(blob.url,{cache:'no-store'});if(!response.ok)throw new Error('Manifest unavailable');return validateManifest(await response.json(),id);}
 catch(e){if(e instanceof BlobNotFoundError)return null;throw e;}
}
export const noStore={'Cache-Control':'no-store, max-age=0'};
