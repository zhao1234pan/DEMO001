import { Color, Layers, Node, Sprite, UITransform } from "cc";
import { UiPrefabs } from "./UiPrefabs";
/** 复用PNG精灵池。只更新变换和颜色，不生成纹理、不使用矢量绘制组件。 */
export class PngSurface {
  private readonly pool: Sprite[] = [];
  private cursor = 0;
  private segments: number[][] = [];
  private point: number[] | null = null;
  strokeColor = new Color();
  lineWidth = 1;
  constructor(private readonly root: Node, private readonly assets: UiPrefabs, private readonly flipY = true) {}
  clear(): void { this.cursor = 0; this.segments.length = 0; this.point = null; }
  end(): void { for(let i=this.cursor;i<this.pool.length;i++)this.pool[i].node.active=false; }
  image(key:string,x:number,y:number,width:number,height:number,color=Color.WHITE,angle=0): void {
    if(width<=0 || height<=0)return;
    let s=this.pool[this.cursor++];
    if(!s){const n=new Node("PngVisual");n.layer=Layers.Enum.UI_2D;this.root.addChild(n);n.addComponent(UITransform);s=n.addComponent(Sprite);s.sizeMode=Sprite.SizeMode.CUSTOM;this.pool.push(s);}
    this.assets.bindSkin(s,key);s.color=color;s.node.active=true;s.node.setPosition(x,y);s.node.setScale(1,this.flipY?-1:1);s.node.angle=angle;s.node.getComponent(UITransform)!.setContentSize(width,height);
  }
  heightFor(key:string,width:number):number {const row=this.assets.skin(key);return width*Number(row.height)/Number(row.width);}
  disc(x:number,y:number,r:number,color:Color):void {this.image("disc",x,y,r*2,r*2,color);}
  ring(x:number,y:number,r:number,color:Color,width:number):void {
    const key=r>60&&width<=1?"range_ring":r<=8?"shot_ring":"ring";this.image(key,x,y,(r+width/2)*2,(r+width/2)*2,color);
  }
  box(x:number,y:number,w:number,h:number,r:number,color:Color):void {this.image(this.assets.rounded(r),x+w/2,y+h/2,w,h,color);}
  outline(x:number,y:number,w:number,h:number,r:number,color:Color):void {
    const key="outline_"+r+"_2",pad=this.assets.skin(key).padding;
    this.image(key,x+w/2,y+h/2,w+Number(pad)*2,h+Number(pad)*2,color);
  }
  line(x:number,y:number,bx:number,by:number,color:Color,width:number,round=false):void {
    const dx=bx-x,dy=by-y;this.image("round_0",(x+bx)/2,(y+by)/2,Math.hypot(dx,dy),width,color,Math.atan2(dy,dx)*180/Math.PI);
    if(round){this.disc(x,y,width/2,color);this.disc(bx,by,width/2,color);}
  }
  moveTo(x:number,y:number):void {this.point=[x,y];}
  lineTo(x:number,y:number):void {if(this.point)this.segments.push([...this.point,x,y]);this.point=[x,y];}
  stroke():void {for(const [x,y,bx,by]of this.segments)this.line(x,y,bx,by,this.strokeColor,this.lineWidth);this.segments.length=0;this.point=null;}
}
