import {test,expect} from '@playwright/test';

for(const viewport of [{width:1440,height:900},{width:390,height:844}]){
 test(`Share stays full-viewport through zoom, pan and resize at ${viewport.width}x${viewport.height}`,async({page})=>{
  await page.setViewportSize(viewport);const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  // Observe actual rendered camera uniforms without adding a diagnostic API to the app.
  await page.addInitScript(()=>{
   for(const Context of [WebGLRenderingContext,WebGL2RenderingContext]){
    const names=new WeakMap<WebGLUniformLocation,string>(),get=Context.prototype.getUniformLocation,set=Context.prototype.uniform3f,setArray=Context.prototype.uniform3fv,setMatrix=Context.prototype.uniformMatrix4fv;
    Context.prototype.getUniformLocation=function(program,name){const location=get.call(this,program,name);if(location){names.set(location,name);((window as any).__uniformNames??=[]).push(name);}return location;};
    Context.prototype.uniform3f=function(location,x,y,z){if(location&&names.get(location)==='cameraPosition')(window as any).__renderedCamera=[x,y,z];return set.call(this,location,x,y,z);};
    Context.prototype.uniform3fv=function(location,value,...rest:any[]){if(location&&names.get(location)==='cameraPosition')(window as any).__renderedCamera=Array.from(value).slice(0,3);return setArray.call(this,location,value,...rest);};
    Context.prototype.uniformMatrix4fv=function(location,transpose,value,...rest:any[]){if(location&&names.get(location)==='viewMatrix'){const v=Array.from(value);(window as any).__renderedCamera=[-(v[0]*v[12]+v[1]*v[13]+v[2]*v[14]),-(v[4]*v[12]+v[5]*v[13]+v[6]*v[14]),-(v[8]*v[12]+v[9]*v[13]+v[10]*v[14])];}return setMatrix.call(this,location,transpose,value,...rest);};
   }
  });
  const image=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=400;c.height=300;const x=c.getContext('2d')!;x.fillStyle='#c8dc72';x.fillRect(0,0,400,300);x.fillStyle='#243e2b';x.font='bold 34px sans-serif';x.fillText('DETAIL REVIEW',40,150);return c.toDataURL('image/png');});
  const scene={version:2,image:null,variants:['A','B','C'].map(id=>({id,image})),activeVariant:'A',background:'gradient',lightIntensity:100,lightHardness:55,labelHeight:120,labelBottom:4,auto:false,view:{position:[.6,.3,1],target:[.5,.2,.5],rotation:.4}};
  await page.route('**/api/review/fullscreen',route=>route.fulfill({json:{url:'http://127.0.0.1:3100/fullscreen-fixture.json',expiresAt:Date.now()+432000000,serverNow:Date.now()}}));
  await page.route('**/fullscreen-fixture.json',route=>route.fulfill({json:scene}));
  await page.goto('/share?review=fullscreen');await expect(page.locator('.loading')).toHaveCount(0,{timeout:60000});
  const canvas=page.locator('canvas');await canvas.evaluate(e=>e.dataset.identity='same-canvas');
  async function fullViewport(){const r=(await canvas.boundingBox())!,size=page.viewportSize()!;expect(r.x).toBeCloseTo(0,0);expect(r.y).toBeCloseTo(0,0);expect(r.width).toBeCloseTo(size.width,0);expect(r.height).toBeCloseTo(size.height,0);expect(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight&&document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
  const camera=()=>page.evaluate(()=>(window as any).__renderedCamera as number[]|undefined);
  await expect.poll(camera,{timeout:20000,message:'main camera position must be observable in shader uniforms'}).toBeDefined().catch(async error=>{console.log(await page.evaluate(()=>({names:[...new Set((window as any).__uniformNames)],camera:(window as any).__renderedCamera})));throw error;});const initial=(await camera())!;expect(Math.hypot(...initial)).toBeGreaterThan(3);
  await fullViewport();const background=await page.locator('.shared-preview').getAttribute('style');
  if(viewport.width<600){
   const touch=await page.context().newCDPSession(page),cx=viewport.width/2,cy=viewport.height/2;
   await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x:cx-10,y:cy},{id:2,x:cx+10,y:cy}]});
   for(let i=1;i<=8;i++)await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{id:1,x:cx-10-i*20,y:cy},{id:2,x:cx+10+i*20,y:cy}]});
   await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await touch.detach();
  }else{await page.mouse.move(viewport.width/2,viewport.height/2);await page.mouse.wheel(0,-120);await canvas.evaluate(element=>{for(let i=0;i<55;i++)element.dispatchEvent(new WheelEvent('wheel',{deltaY:-120,bubbles:true,cancelable:true}));});}
  await expect.poll(async()=>Math.hypot(...((await camera())??initial)),{timeout:20000}).toBeLessThan(Math.hypot(...initial)*.6);
  async function outsideModel(){const p=(await camera())!;expect(Math.abs(p[0])>=.38-1e-4||Math.abs(p[1])>=.79-1e-4||Math.abs(p[2])>=.38-1e-4).toBe(true);}
  await outsideModel();await fullViewport();await page.screenshot({path:`work/share-fullscreen-zoom-${viewport.width}.png`});const zoomed=(await camera())!;
  await page.getByRole('button',{name:'Variant B',exact:true}).click();await expect(page.getByRole('button',{name:'Variant B',exact:true})).toHaveAttribute('aria-pressed','true');
  const switched=(await camera())!;switched.forEach((n,i)=>expect(n).toBeCloseTo(zoomed[i],3));expect(await page.locator('.shared-preview').getAttribute('style')).toBe(background);await fullViewport();
  await page.getByRole('button',{name:'Pan',exact:true}).click();await page.mouse.move(viewport.width/2,viewport.height/2);await page.mouse.down();await page.mouse.move(viewport.width/2-200,viewport.height/2+100,{steps:8});await page.mouse.up();await outsideModel();await fullViewport();
  const resized=viewport.width<600?{width:390,height:690}:{width:900,height:620};await page.setViewportSize(resized);await expect.poll(async()=>(await canvas.boundingBox())!.height).toBe(resized.height);await fullViewport();await outsideModel();
  await page.getByRole('button',{name:'Reset view',exact:true}).click();await expect.poll(async()=>Math.hypot(...((await camera())??[0,0,0])),{timeout:20000}).toBeGreaterThan(3);
  expect(await canvas.getAttribute('data-identity')).toBe('same-canvas');
  await page.screenshot({path:`work/share-fullscreen-${viewport.width}.png`});
  await page.setViewportSize({width:844,height:390});await expect.poll(async()=>(await canvas.boundingBox())!.height).toBe(390);await fullViewport();await outsideModel();expect(errors).toEqual([]);
 });
}
