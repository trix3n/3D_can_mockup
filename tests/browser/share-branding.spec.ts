import {test,expect} from '@playwright/test';

for(const viewport of [{width:1440,height:900},{width:1024,height:768},{width:900,height:900},{width:390,height:844},{width:320,height:568},{width:844,height:390}]){
 test(`Share overlays remain usable above the full-viewport canvas at ${viewport.width}x${viewport.height}`,async({page})=>{
  await page.setViewportSize(viewport);
  const image=await page.evaluate(()=>{const canvas=document.createElement('canvas');canvas.width=200;canvas.height=150;const ctx=canvas.getContext('2d')!;ctx.fillStyle='#cadb70';ctx.fillRect(0,0,200,150);return canvas.toDataURL('image/png');});
  const scene={version:2,image:null,variants:['A','B','C'].map(id=>({id,image})),activeVariant:'A',background:'#ffffff',lightIntensity:100,lightHardness:55,labelHeight:120,labelBottom:4,auto:false};
  await page.route('**/api/review/branding',route=>route.fulfill({json:{url:'http://127.0.0.1:3100/branding-fixture.json',expiresAt:Date.now()+120000,serverNow:Date.now()}}));
  await page.route('**/branding-fixture.json',route=>route.fulfill({json:scene}));
  await page.goto('/share?review=branding');
  const headline=page.locator('.share-headline');await expect(headline.locator('span')).toHaveText(['Small can.','Big ideas.']);
  const signature=page.locator('.share-signature');await expect(signature).toBeVisible();
  await expect(signature.locator('span').first()).toHaveText('3D CAN MOCKUP');await expect(signature.locator('strong')).toHaveText('LONGRAY');await expect(signature.locator('span').last()).toHaveText('STUDIO');
  await expect(page.locator('.loading')).toHaveCount(0,{timeout:60000});
  const mark=(await signature.boundingBox())!,canvas=(await page.locator('canvas').boundingBox())!,nav=(await page.getByRole('group',{name:'Preview navigation'}).boundingBox())!,tabs=(await page.getByRole('group',{name:'Label variants'}).boundingBox())!;
  expect(mark.x).toBeGreaterThanOrEqual(0);expect(mark.x+mark.width).toBeLessThanOrEqual(viewport.width);expect(mark.y+mark.height).toBeLessThanOrEqual(viewport.height);
  expect(viewport.width-mark.x-mark.width).toBeLessThanOrEqual(30);expect(viewport.height-mark.y-mark.height).toBeLessThanOrEqual(20);
  const overlaps=(a:typeof mark,b:typeof mark)=>a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;
  const title=(await headline.boundingBox())!;expect(title.x).toBeGreaterThanOrEqual(0);expect(title.y).toBeGreaterThanOrEqual(65);expect(title.x+title.width).toBeLessThanOrEqual(viewport.width);expect(await headline.evaluate(e=>e.scrollWidth<=e.clientWidth+1)).toBe(true);expect(overlaps(title,tabs)).toBe(false);expect(overlaps(title,nav)).toBe(false);
  expect(overlaps(mark,nav)).toBe(false);expect(overlaps(mark,tabs)).toBe(false);
  expect(canvas.x).toBeCloseTo(0,0);expect(canvas.y).toBeCloseTo(0,0);expect(canvas.width).toBeCloseTo(viewport.width,0);expect(canvas.height).toBeCloseTo(viewport.height,0);expect(nav.x+nav.width/2).toBeCloseTo(viewport.width/2,0);expect(tabs.x+tabs.width/2).toBeCloseTo(viewport.width/2,0);
  const appearance=await signature.evaluate(e=>{const style=getComputedStyle(e);return {background:style.backgroundColor,border:style.borderWidth,pointerEvents:style.pointerEvents};});
  expect(appearance.background).toBe('rgba(0, 0, 0, 0)');expect(appearance.border).toBe('0px');expect(appearance.pointerEvents).toBe('none');
  await page.getByRole('button',{name:'Variant B',exact:true}).click();await expect(page.getByRole('button',{name:'Variant B',exact:true})).toHaveAttribute('aria-pressed','true');
  await page.screenshot({path:`work/share-branding-${viewport.width}x${viewport.height}.png`});
  await page.goto('/');await expect(page.locator('.share-signature')).toHaveCount(0);await expect(page.locator('.share-headline')).toHaveCount(0);
 });
}
