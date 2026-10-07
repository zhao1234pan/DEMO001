import { _decorator, Component, Node, Sprite, SpriteFrame, UITransform } from "cc";
import { EDITOR } from "cc/env";
const { ccclass, property, executeInEditMode } = _decorator;
/** 父节点保留布局与命中范围，PNG按配置适配；角部与固定图标始终等比。 */
@ccclass("UiSkin") @executeInEditMode
export class UiSkin extends Component {
  @property key = "";
  @property padding = 0;
  @property resizeMode = "stretch";
  @property(Node) image: Node | null = null;
  @property({type:SpriteFrame,editorOnly:true}) previewFrame: SpriteFrame | null = null;
  private signature = "";
  onEnable(): void { if(EDITOR && this.previewFrame && this.image) this.image.getComponent(Sprite)!.spriteFrame=this.previewFrame; this.sync(); }
  update(): void { this.sync(); }
  sync(): void {
    if(!this.image)return;
    const t=this.node.getComponent(UITransform)!,frame=this.image.getComponent(Sprite)!.spriteFrame;
    if(!frame)return;
    const w=t.width+this.padding*2,h=t.height+this.padding*2;
    const signature=[w,h,this.resizeMode,frame.uuid,frame.rect.width,frame.rect.height,frame.insetLeft,frame.insetRight,frame.insetTop,frame.insetBottom].join("/");
    if(signature===this.signature)return;this.signature=signature;
    if(w<=0||h<=0){this.image.setScale(1,1,1);this.image.getComponent(UITransform)!.setContentSize(Math.max(0,w),Math.max(0,h));return;}
    let scale=1,iw=w,ih=h;
    if(this.resizeMode==="contain"||this.resizeMode==="cover"){
      scale=(this.resizeMode==="contain"?Math.min:Math.max)(w/frame.rect.width,h/frame.rect.height);iw=frame.rect.width;ih=frame.rect.height;
    }else if(this.resizeMode==="height"){
      // 只拉伸横向中心；高度带来的缩放作用于完整图片，避免圆角压扁。
      scale=h/frame.rect.height;iw=w/scale;ih=frame.rect.height;
      const sides=frame.insetLeft+frame.insetRight;if(sides>iw){scale=w/sides;iw=w/scale;ih=h/scale;}
    }else{
      const sx=frame.insetLeft+frame.insetRight,sy=frame.insetTop+frame.insetBottom;
      scale=Math.min(1,w/frame.rect.width,h/frame.rect.height,sx>0?w/sx:1,sy>0?h/sy:1);iw=w/scale;ih=h/scale;
    }
    this.image.setScale(scale,scale,1);this.image.getComponent(UITransform)!.setContentSize(iw,ih);
  }
}
