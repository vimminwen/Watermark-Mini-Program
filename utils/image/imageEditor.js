/** 对画布区域打马赛克 */
export const applyMosaicAt = (ctx, cx, cy, radius, blockSize = 12, logicalSize = null) => {
	const r = Math.max(8, radius);
	const x = Math.floor(cx - r);
	const y = Math.floor(cy - r);
	const w = Math.ceil(r * 2);
	const h = Math.ceil(r * 2);
	const canvasW = logicalSize?.width ?? ctx.canvas.width;
	const canvasH = logicalSize?.height ?? ctx.canvas.height;

	const sx = Math.max(0, x);
	const sy = Math.max(0, y);
	const sw = Math.min(w, canvasW - sx);
	const sh = Math.min(h, canvasH - sy);
	if (sw <= 0 || sh <= 0) return;

	let imageData;
	try {
		imageData = ctx.getImageData(sx, sy, sw, sh);
	} catch (e) {
		console.warn('[applyMosaicAt] getImageData failed', e);
		return;
	}

	const data = imageData.data;
	const bs = Math.max(4, blockSize);

	for (let row = 0; row < sh; row += bs) {
		for (let col = 0; col < sw; col += bs) {
			let rSum = 0;
			let gSum = 0;
			let bSum = 0;
			let aSum = 0;
			let count = 0;
			const rowEnd = Math.min(row + bs, sh);
			const colEnd = Math.min(col + bs, sw);

			for (let py = row; py < rowEnd; py++) {
				for (let px = col; px < colEnd; px++) {
					const i = (py * sw + px) * 4;
					rSum += data[i];
					gSum += data[i + 1];
					bSum += data[i + 2];
					aSum += data[i + 3];
					count++;
				}
			}

			const avgR = Math.round(rSum / count);
			const avgG = Math.round(gSum / count);
			const avgB = Math.round(bSum / count);
			const avgA = Math.round(aSum / count);

			for (let py = row; py < rowEnd; py++) {
				for (let px = col; px < colEnd; px++) {
					const i = (py * sw + px) * 4;
					data[i] = avgR;
					data[i + 1] = avgG;
					data[i + 2] = avgB;
					data[i + 3] = avgA;
				}
			}
		}
	}

	ctx.putImageData(imageData, sx, sy);
};

/** 绘制文字图层 */
export const drawTextLayer = (ctx, layer) => {
	if (!layer?.text) return;
	const size = layer.fontSize || 28;
	ctx.save();
	ctx.font = `bold ${size}px sans-serif`;
	ctx.fillStyle = layer.color || '#ffffff';
	ctx.textBaseline = 'top';
	if (layer.stroke) {
		ctx.strokeStyle = layer.stroke;
		ctx.lineWidth = Math.max(2, size / 14);
		ctx.strokeText(layer.text, layer.x, layer.y);
	}
	ctx.fillText(layer.text, layer.x, layer.y);
	ctx.restore();
};

/** 计算画布适配尺寸 */
export const calcCanvasLayout = (imgW, imgH, maxW = 345, maxH = 420) => {
	const ratio = Math.min(maxW / imgW, maxH / imgH, 1);
	return {
		width: Math.round(imgW * ratio),
		height: Math.round(imgH * ratio),
		scale: ratio
	};
};
