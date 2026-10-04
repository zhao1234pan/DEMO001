import { _decorator, Component, Sprite, SpriteFrame } from "cc";
import { EDITOR } from "cc/env";
const {ccclass,property,executeInEditMode,requireComponent}=_decorator;
/** 编辑器使用原生切片，运行时按ArtFrame表绑定同一资源。 */
@ccclass("UiImage") @executeInEditMode @requireComponent(Sprite)
export class UiImage extends Component {
 @property frameKey="";
 @property({type:SpriteFrame,editorOnly:true}) previewFrame:SpriteFrame|null=null;
 onEnable():void {if(EDITOR)this.refreshPreview();}
 update():void {if(EDITOR)this.refreshPreview();}
 private refreshPreview():void {const s=this.getComponent(Sprite)!;if(this.previewFrame&&s.spriteFrame!==this.previewFrame)s.spriteFrame=this.previewFrame;}
}
