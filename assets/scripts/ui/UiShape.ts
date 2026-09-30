import { _decorator, Color, Component, Graphics, UITransform } from "cc";
const { ccclass, property, executeInEditMode, requireComponent } = _decorator;

/** 预制体的可编辑矢量外观；尺寸来自本节点，编辑器与运行时采用同一绘制。 */
@ccclass("UiShape")
@executeInEditMode
@requireComponent(Graphics)
export class UiShape extends Component {
  @property({ tooltip: "rect / ellipse / path；路径点使用节点局部坐标" }) kind = "rect";
  @property(Color) fill = new Color(255, 255, 255, 255);
  @property(Color) stroke = new Color(0, 0, 0, 0);
  @property radius = 0;
  @property lineWidth = 0;
  @property({ multiline: true }) points = "";
  private signature = "";

  onEnable(): void { this.redraw(); }
  update(): void {
    const t = this.getComponent(UITransform)!;
    const signature = [t.width, t.height, this.kind, this.radius, this.lineWidth, this.fill.toHEX("#rrggbbaa"), this.stroke.toHEX("#rrggbbaa"), this.points].join("/");
    if (signature !== this.signature) { this.signature = signature; this.redraw(); }
  }
  redraw(): void {
    const g = this.getComponent(Graphics)!;
    const t = this.getComponent(UITransform)!;
    if (!g || !t) return;
    g.clear(); g.fillColor = this.fill; g.strokeColor = this.stroke; g.lineWidth = this.lineWidth;
    g.lineCap = Graphics.LineCap.ROUND; g.lineJoin = Graphics.LineJoin.ROUND;
    if (this.kind === "ellipse") g.ellipse(0, 0, t.width / 2, t.height / 2);
    else if (this.kind === "path") {
      const points: Array<Array<number | string>> = JSON.parse(this.points || "[]");
      points.forEach((point, i) => {
        if (point[0] === "move") g.moveTo(Number(point[1]), Number(point[2]));
        else if (point[0] === "bezier") g.bezierCurveTo(Number(point[1]), Number(point[2]), Number(point[3]), Number(point[4]), Number(point[5]), Number(point[6]));
        else if (point[0] === "close") g.close();
        else if (i) g.lineTo(Number(point[0]), Number(point[1]));
        else g.moveTo(Number(point[0]), Number(point[1]));
      });
    } else if (this.radius > 0) g.roundRect(-t.width / 2, -t.height / 2, t.width, t.height, Math.min(this.radius, t.width / 2, t.height / 2));
    else g.rect(-t.width / 2, -t.height / 2, t.width, t.height);
    if (this.fill.a > 0) g.fill();
    if (this.lineWidth > 0 && this.stroke.a > 0) g.stroke();
  }
}
