/** 图鉴只滚动书页内部；偏移始终夹在合法范围，拖动结束不会转为卡片点击。 */
export class CollectionScrollState {
  offset = 0;
  maximum = 0;
  private origin: { y: number; offset: number } | null = null;
  private dragging = false;
  resize(contentHeight: number, viewportHeight: number): void {
    this.maximum = Math.max(0, contentHeight - viewportHeight);
    this.set(this.offset);
  }
  set(value: number): void { if (Number.isFinite(value)) this.offset = Math.max(0, Math.min(this.maximum, value)); }
  begin(y: number): void { this.origin = { y, offset: this.offset }; this.dragging = false; }
  move(y: number, tolerance: number): boolean {
    if (!this.origin) return false;
    const delta = this.origin.y - y;
    if (Math.abs(delta) > tolerance) this.dragging = true;
    if (this.dragging) this.set(this.origin.offset + delta);
    return this.dragging;
  }
  end(): void { this.origin = null; this.dragging = false; }
}
