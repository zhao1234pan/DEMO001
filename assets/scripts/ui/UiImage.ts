import { _decorator, Component, Rect, Size, Sprite, SpriteFrame, Texture2D, Vec2 } from "cc";
import { EDITOR } from "cc/env";
const { ccclass, property, executeInEditMode, requireComponent } = _decorator;

/** 图集预览数据由配置导表检查；运行时动态角色由 UiPrefabs.bindImage 绑定。 */
@ccclass("UiImage")
@executeInEditMode
@requireComponent(Sprite)
export class UiImage extends Component {
  @property frameKey = "";
  // 预览引用不可随 resources 进入主包；运行时由资源表从 battle_art 绑定。
  @property({ type: Texture2D, editorOnly: true }) previewTexture: Texture2D | null = null;
  @property({ type: Rect, editorOnly: true }) previewRect = new Rect();
  private previewFrame: SpriteFrame | null = null;
  private signature = "";
  onEnable(): void { if (EDITOR) this.refreshPreview(); }
  update(): void { if (EDITOR) this.refreshPreview(); }
  onDestroy(): void { this.previewFrame?.destroy(); }
  private refreshPreview(): void {
    const texture = this.previewTexture, r = this.previewRect;
    if (!texture || r.width <= 0 || r.height <= 0) return;
    const signature = `${texture.uuid}/${r.x}/${r.y}/${r.width}/${r.height}`;
    if (signature === this.signature) return;
    this.signature = signature;
    this.previewFrame?.destroy();
    const frame = new SpriteFrame();
    frame.reset({ texture, rect: r, originalSize: new Size(r.width, r.height), offset: new Vec2(), isRotate: false, isFlipUv: false }, true);
    frame.packable = false;
    this.previewFrame = frame;
    this.getComponent(Sprite)!.spriteFrame = frame;
  }
}
