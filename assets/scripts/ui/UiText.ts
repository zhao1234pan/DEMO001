import { _decorator, Component, Label } from "cc";
import { text } from "../config/ConfigTables";
const { ccclass, property } = _decorator;
/** 预制体里的文字是编辑器预览；正式显示始终读 I18 配置。 */
@ccclass("UiText")
export class UiText extends Component {
  @property key = "";
  refresh(): void { if (this.key) this.getComponent(Label)!.string = text(this.key); }
}
