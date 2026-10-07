import { _decorator, Component, Mask, Sprite, SpriteFrame } from 'cc';
import { EDITOR } from 'cc/env';
const { ccclass, property, executeInEditMode } = _decorator;
/** 头像裁切使用导入PNG模板，独立立绘完整保留，不改变角色源图。 */
@ccclass('UiMask') @executeInEditMode
export class UiMask extends Component {
  @property maskKey = '';
  @property({type:SpriteFrame,editorOnly:true}) previewFrame:SpriteFrame|null=null;
  onEnable():void {const mask=this.getComponent(Mask)!;mask.type=Mask.Type.SPRITE_STENCIL;if(EDITOR&&this.previewFrame)this.getComponent(Sprite)!.spriteFrame=this.previewFrame;}
}
