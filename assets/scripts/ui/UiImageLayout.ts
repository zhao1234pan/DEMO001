/** 只计算图片在固定槽位内的位置；不改父节点、热区或源图片。 */
export interface ImageContentRect { x:number; y:number; width:number; height:number; }
export interface ImagePlacement { x:number; y:number; width:number; height:number; }
export function fitUiImage(width:number,height:number,sourceWidth:number,sourceHeight:number,rect:ImageContentRect,mode:string,fill:number):ImagePlacement {
  if(width<=0||height<=0||sourceWidth<=0||sourceHeight<=0)return{x:0,y:0,width:0,height:0};
  const content=mode!=="canvas",w=content?rect.width:sourceWidth,h=content?rect.height:sourceHeight;
  const scale=Math.min(width*(content?fill:1)/w,height*(content?fill:1)/h);
  return {
    width:sourceWidth*scale,height:sourceHeight*scale,
    x:content?(sourceWidth/2-rect.x-rect.width/2)*scale:0,
    y:content?(mode==="feet"?(rect.y+rect.height-sourceHeight/2)*scale-height*fill/2:(rect.y+rect.height/2-sourceHeight/2)*scale):0,
  };
}
