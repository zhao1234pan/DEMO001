import { _decorator, Component, Node, Sprite, SpriteFrame, UITransform } from "cc";
import { EDITOR } from "cc/env";
import { fitUiImage, ImageContentRect } from "./UiImageLayout";
const {ccclass,property,executeInEditMode,requireComponent}=_decorator;
/** 编辑器使用原生切片，运行时按ArtFrame表绑定同一资源。 */
@ccclass("UiImage") @executeInEditMode @requireComponent(Sprite)
export class UiImage extends Component {
 @property frameKey="";
 @property({type:Node}) image:Node|null=null;
 @property fitMode="canvas";
 @property fill=1;
 @property contentX=0;
 @property contentY=0;
 @property contentWidth=256;
 @property contentHeight=256;
 @property({type:SpriteFrame,editorOnly:true}) previewFrame:SpriteFrame|null=null;
 onEnable():void {if(EDITOR)this.refreshPreview();}
 update():void {if(EDITOR)this.refreshPreview();}
 get sprite():Sprite {return(this.image??this.node).getComponent(Sprite)!;}
 place(frame:SpriteFrame,rect:ImageContentRect):void {
  const slot=this.getComponent(UITransform)!;
  // 旧Prefab未迁移时保持原来的画布适配，避免移动图像父节点。
  if(!this.image)return;
  const p=fitUiImage(slot.width,slot.height,frame.rect.width,frame.rect.height,rect,this.fitMode,this.fill);
  this.image.getComponent(UITransform)!.setContentSize(p.width,p.height);
  this.image.setPosition(p.x+(.5-slot.anchorX)*slot.width,p.y+(.5-slot.anchorY)*slot.height,0);
 }
 private refreshPreview():void {if(!this.previewFrame)return;const s=this.sprite;s.type=Sprite.Type.SIMPLE;s.sizeMode=Sprite.SizeMode.CUSTOM;s.trim=false;if(s.spriteFrame!==this.previewFrame)s.spriteFrame=this.previewFrame;this.place(this.previewFrame,{x:this.contentX,y:this.contentY,width:this.contentWidth,height:this.contentHeight});}
}
