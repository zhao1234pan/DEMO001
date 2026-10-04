import { _decorator, Component, Node, Sprite, SpriteFrame, UITransform } from "cc";
import { EDITOR } from "cc/env";
const { ccclass, property, executeInEditMode } = _decorator;
/** 图片只控制外观，父节点继续保留原有布局与命中范围。 */
@ccclass("UiSkin")
@executeInEditMode
export class UiSkin extends Component {
  @property key = "";
  @property padding = 0;
  @property(Node) image: Node | null = null;
  @property({type:SpriteFrame,editorOnly:true}) previewFrame: SpriteFrame | null = null;
  private signature = "";
  onEnable(): void { if(EDITOR && this.previewFrame && this.image) this.image.getComponent(Sprite)!.spriteFrame=this.previewFrame; this.sync(); }
  update(): void { this.sync(); }
  sync(): void {
    if(!this.image)return;
    const t=this.node.getComponent(UITransform)!; const signature=t.width+"/"+t.height+"/"+this.padding;
    if(signature===this.signature)return;this.signature=signature;
    this.image.getComponent(UITransform)!.setContentSize(t.width+this.padding*2,t.height+this.padding*2);
  }
}
