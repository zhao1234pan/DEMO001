// 由UiImageLayout.ts生成；编辑器、导表与运行时共用同一图片适配算法。
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fitUiImage = fitUiImage;
function fitUiImage(width, height, sourceWidth, sourceHeight, rect, mode, fill) {
    if (width <= 0 || height <= 0 || sourceWidth <= 0 || sourceHeight <= 0)
        return { x: 0, y: 0, width: 0, height: 0 };
    const content = mode !== "canvas", w = content ? rect.width : sourceWidth, h = content ? rect.height : sourceHeight;
    const scale = Math.min(width * (content ? fill : 1) / w, height * (content ? fill : 1) / h);
    return {
        width: sourceWidth * scale, height: sourceHeight * scale,
        x: content ? (sourceWidth / 2 - rect.x - rect.width / 2) * scale : 0,
        y: content ? (mode === "feet" ? (rect.y + rect.height - sourceHeight / 2) * scale - height * fill / 2 : (rect.y + rect.height / 2 - sourceHeight / 2) * scale) : 0,
    };
}
