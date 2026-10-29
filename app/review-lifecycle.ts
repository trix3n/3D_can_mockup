export const LIFETIME=120*60*60*1000;
export const MARKER_LIFETIME=7*24*60*60*1000;
export const MAX_SHARE_BYTES=22000000;
export const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
export const payloadPath=(id:string)=>`review-v2/payloads/${id}.json`;
export const manifestPath=(id:string)=>`review-v2/manifests/${id}.json`;
export type Manifest={version:2;id:string;createdAt:number;expiresAt:number;files:string[]};
export function validateManifest(value:unknown,id:string):Manifest{
 const m=value as Manifest;
 if(!UUID.test(id)||!m||m.version!==2||m.id!==id||!Number.isSafeInteger(m.createdAt)||m.createdAt<0||m.expiresAt!==m.createdAt+LIFETIME||!Array.isArray(m.files)||m.files.length!==1||m.files[0]!==payloadPath(id))throw new Error('Invalid manifest');
 return m;
}
export async function cleanupProject(m:Manifest,now:number,remove:(path:string)=>Promise<unknown>){
 validateManifest(m,m.id);
 if(now<m.expiresAt)return false;
 // Keep the tiny manifest and exact paths until every payload deletion succeeds.
 for(const path of m.files)await remove(path);
 if(now>=m.expiresAt+MARKER_LIFETIME)await remove(manifestPath(m.id));
 return true;
}
