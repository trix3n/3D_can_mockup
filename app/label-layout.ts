// All artwork coordinates are in millimetres, measured from the label's top left.
export const CAN = {diameter:52,height:134,zoneBottom:4,zoneTop:124,gap:4};
export const CIRCUMFERENCE = Math.PI * CAN.diameter;
export const LABEL_WIDTH = CIRCUMFERENCE - CAN.gap;
export const ZONE_HEIGHT = CAN.zoneTop - CAN.zoneBottom;
export type Placement = {height:number;bottom:number;width:number;artHeight:number;x:number;y:number};
export function fitArtwork(width:number,height:number,labelHeight=ZONE_HEIGHT):Placement {
 const scale=Math.min(LABEL_WIDTH/width,labelHeight/height);
 const w=width*scale,h=height*scale;
 return {height:labelHeight,bottom:CAN.zoneBottom,width:w,artHeight:h,x:(LABEL_WIDTH-w)/2,y:(labelHeight-h)/2};
}
export function constrainPlacement(p:Placement):Placement {
 const height=Math.max(10,Math.min(ZONE_HEIGHT,p.height));
 return {...p,height,bottom:Math.max(CAN.zoneBottom,Math.min(CAN.zoneTop-height,p.bottom)),width:Math.max(.1,p.width),artHeight:Math.max(.1,p.artHeight)};
}
export function paintLabel(source:CanvasImageSource,p:Placement):HTMLCanvasElement {
 const c=document.createElement('canvas');c.width=2048;c.height=Math.round(c.width*p.height/LABEL_WIDTH);
 const ctx=c.getContext('2d')!;const scale=c.width/LABEL_WIDTH;
 ctx.drawImage(source,p.x*scale,p.y*scale,p.width*scale,p.artHeight*scale);
 return c;
}

export type Corner = 'nw'|'ne'|'sw'|'se';
// Opposite corner stays fixed; project the pointer onto the original diagonal.
export function resizeFromCorner(p:Placement,corner:Corner,dx:number,dy:number):Placement {
 const sx=corner.endsWith('e')?1:-1,sy=corner.startsWith('s')?1:-1;
 const scale=Math.max(.01,Math.min(20,1+(sx*dx*p.width+sy*dy*p.artHeight)/(p.width*p.width+p.artHeight*p.artHeight)));
 const width=p.width*scale,artHeight=p.artHeight*scale;
 return {...p,width,artHeight,x:sx<0?p.x+p.width-width:p.x,y:sy<0?p.y+p.artHeight-artHeight:p.y};
}
