import { _decorator, Color, Component } from "cc";
const {ccclass,property}=_decorator;
/** 路线缩略图的固定美术参数，随预制体编辑；路径和塔位来自CSV。 */
@ccclass("UiRoute")
export class UiRoute extends Component {
 @property lineWidth=0;
 @property(Color) lineColor=new Color();
 @property(Color) spotColor=new Color();
}
