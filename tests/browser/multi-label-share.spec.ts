import {test,expect,BrowserContext} from '@playwright/test';

// Exercise the real Studio, Blob client multipart protocol and fresh Viewer.
// Only network storage is replaced; no real Blob credentials or writes are used.
test('Share includes three distinct labels and exposes usable read-only Viewer controls',async({page,browser})=>{
 const id='12345678-1234-4234-8234-123456789abc';
 const path=`review-v2/payloads/${id}.json`,payloadUrl='https://mock.public.blob.vercel-storage.com/'+path;
 let uploaded:Buffer|undefined,finalized=false,parts=new Map<number,Buffer>(),legacyWrites=0;
 async function mockStorage(context:BrowserContext){
  await context.route('**/api/share',async route=>{legacyWrites++;await route.fulfill({status:500,json:{error:'v1 writer must not be used'}});});
  await context.route('**/api/review',async route=>{
   if(route.request().method()==='POST')return route.fulfill({json:{id,ticket:'test-ticket'}});
   expect(route.request().method()).toBe('PUT');expect(uploaded).toBeDefined();
   const snapshot=JSON.parse(uploaded!.toString());expect(snapshot.version).toBe(2);expect(snapshot.variants.map(v=>v.id)).toEqual(['A','B','C']);
   finalized=true;return route.fulfill({json:{id}});
  });
  await context.route('**/api/share/upload',route=>route.fulfill({json:{type:'blob.generate-client-token',clientToken:'vercel_blob_rw_test_fixture'}}));
  await context.route('https://vercel.com/api/blob/**',async route=>{
   const request=route.request(),action=request.headers()['x-mpu-action'];
   if(request.method()==='OPTIONS')return route.fulfill({status:204,headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'*','Access-Control-Allow-Methods':'POST, OPTIONS'}});
   const headers={'Access-Control-Allow-Origin':'*'};
   if(action==='create')return route.fulfill({headers,json:{key:path,uploadId:'test-upload'}});
   if(action==='upload'){const number=Number(request.headers()['x-mpu-part-number']);const body=request.postDataBuffer()??Buffer.from(await page.evaluate(n=>(window as any).__uploadParts[n],number),'base64');parts.set(number,body);return route.fulfill({headers,json:{etag:'test-etag'}});}
   expect(action).toBe('complete');uploaded=Buffer.concat([...parts.entries()].sort(([a],[b])=>a-b).map(([,part])=>part));
   return route.fulfill({headers,json:{url:payloadUrl,pathname:path,contentType:'application/json',contentDisposition:'inline'}});
  });
  await context.route(`**/api/review/${id}`,route=>route.fulfill({json:{url:payloadUrl,expiresAt:Date.now()+432000000,serverNow:Date.now()}}));
  await context.route(payloadUrl,route=>route.fulfill({contentType:'application/json',body:uploaded!}));
 }
 await page.addInitScript(()=>{
  (window as any).__uploadParts={};const originalFetch=window.fetch;
  window.fetch=async(input,init)=>{const headers=new Headers(init?.headers);if(String(input).startsWith('https://vercel.com/api/blob')&&headers.get('x-mpu-action')==='upload'&&init?.body){const buffer=await new Response(init.body).arrayBuffer();let binary='';for(const byte of new Uint8Array(buffer))binary+=String.fromCharCode(byte);(window as any).__uploadParts[Number(headers.get('x-mpu-part-number'))]=btoa(binary);return originalFetch(input,{...init,body:buffer});}return originalFetch(input,init);};
  const open=XMLHttpRequest.prototype.open,header=XMLHttpRequest.prototype.setRequestHeader,send=XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open=function(...args:any[]){(this as any).__url=args[1];return open.apply(this,args as any);};
  XMLHttpRequest.prototype.setRequestHeader=function(name,value){if(name.toLowerCase()==='x-mpu-action')(this as any).__action=value;if(name.toLowerCase()==='x-mpu-part-number')(this as any).__part=Number(value);return header.call(this,name,value);};
  XMLHttpRequest.prototype.send=function(body){if((this as any).__action==='upload'&&body instanceof Blob){const xhr=this;body.arrayBuffer().then(buffer=>{const bytes=new Uint8Array(buffer);let binary='';for(const byte of bytes)binary+=String.fromCharCode(byte);(window as any).__uploadParts[(xhr as any).__part]=btoa(binary);send.call(xhr,body);});return;}return send.call(this,body);};
 });
 await mockStorage(page.context());await page.goto('/');
 await expect(page.getByRole('button',{name:'Share preview',exact:true})).toBeEnabled({timeout:60000});
 const artworks=await page.evaluate(()=>{const canvas=document.createElement('canvas');canvas.width=200;canvas.height=150;const ctx=canvas.getContext('2d')!;return ['#ff0000','#0000ff','#00ff00'].map(color=>{ctx.fillStyle=color;ctx.fillRect(0,0,200,150);return canvas.toDataURL('image/png');});});
 for(const [n,id]of ['A','B','C'].entries()){
  await page.locator('aside .variant-tabs').getByRole('button',{name:`Variant ${id}`}).click();
  await page.locator('input[type=file]').setInputFiles({name:`${id}.png`,mimeType:'image/png',buffer:Buffer.from(artworks[n].split(',')[1],'base64')});
  await page.getByRole('button',{name:'Apply to 3D mockup'}).click();await expect(page.getByRole('dialog',{name:'Arrange your label'})).toHaveCount(0);
 }
 await page.getByRole('button',{name:'Share preview',exact:true}).click();
 const link=page.getByRole('textbox',{name:'Public preview link'});await expect(link).toBeVisible({timeout:30000});
 expect(finalized).toBe(true);expect(legacyWrites).toBe(0);
 const snapshot=JSON.parse(uploaded!.toString());expect(snapshot.version).toBe(2);expect(snapshot.activeVariant).toBe('C');expect(new Set(snapshot.variants.map(v=>v.image)).size).toBe(3);
 expect(snapshot.image).toBeNull();expect(snapshot).not.toHaveProperty('source');
 const viewerContext=await browser.newContext({viewport:{width:1000,height:700}});await mockStorage(viewerContext);const viewer=await viewerContext.newPage();
 await viewer.goto(await link.inputValue());const tabs=viewer.getByRole('group',{name:'Label variants'});
 await expect(tabs.getByRole('button')).toHaveCount(3);
 const rect=await tabs.boundingBox();expect(rect!.x).toBeGreaterThanOrEqual(0);expect(rect!.y).toBeGreaterThanOrEqual(65);expect(rect!.height).toBeLessThan(100);expect(rect!.x+rect!.width).toBeLessThanOrEqual(1000);
 await expect(viewer.locator('input[type=file]')).toHaveCount(0);await expect(viewer.getByRole('button',{name:'Edit label layout'})).toHaveCount(0);
 await viewer.locator('canvas').waitFor();await viewer.locator('canvas').evaluate(e=>e.dataset.testIdentity='original');
 const background=await viewer.locator('.shared-preview').getAttribute('style');
 for(const id of ['A','B','C']){await tabs.getByRole('button',{name:`Variant ${id}`}).click();await expect(tabs.getByRole('button',{name:`Variant ${id}`})).toHaveAttribute('aria-pressed','true');expect(await viewer.locator('canvas').getAttribute('data-test-identity')).toBe('original');expect(await viewer.locator('.shared-preview').getAttribute('style')).toBe(background);}
 await viewer.setViewportSize({width:390,height:844});const mobile=await tabs.boundingBox();expect(mobile!.x).toBeGreaterThanOrEqual(0);expect(mobile!.x+mobile!.width).toBeLessThanOrEqual(390);expect(mobile!.height).toBeLessThan(100);await tabs.getByRole('button',{name:'Variant A'}).click();
 // Legacy v1 uses its single image and has no variant selector.
 await viewerContext.route('**/api/share/legacy',route=>route.fulfill({json:{...snapshot,version:1,image:snapshot.variants[0].image,variants:undefined,activeVariant:undefined}}));
 await viewer.goto(new URL('/share?id=legacy',await link.inputValue()).href);await expect(viewer.getByRole('button',{name:'Orbit',exact:true})).toBeVisible();await expect(viewer.getByRole('group',{name:'Label variants'})).toHaveCount(0);
 await viewerContext.close();
});
