/** 对画布区域打马赛克（坐标为逻辑像素；getImageData/putImageData 使用物理像素） */
export const applyMosaicAt = (ctx, cx, cy, radius, blockSize = 12, logicalSize = null, dpr = 1) => {
	const ratio = Math.max(1, Number(dpr) || 1);
	const r = Math.max(8, radius);
	const x = Math.floor(cx - r);
	const y = Math.floor(cy - r);
	const w = Math.ceil(r * 2);
	const h = Math.ceil(r * 2);
	const canvasW = logicalSize?.width
		? Math.round(logicalSize.width * ratio)
		: ctx.canvas.width;
	const canvasH = logicalSize?.height
		? Math.round(logicalSize.height * ratio)
		: ctx.canvas.height;

	const sx = Math.max(0, Math.floor(x * ratio));
	const sy = Math.max(0, Math.floor(y * ratio));
	const sw = Math.min(Math.ceil(w * ratio), canvasW - sx);
	const sh = Math.min(Math.ceil(h * ratio), canvasH - sy);
	if (sw <= 0 || sh <= 0) return;

	let imageData;
	try {
		imageData = ctx.getImageData(sx, sy, sw, sh);
	} catch (e) {
		console.warn('[applyMosaicAt] getImageData failed', e);
		return;
	}

	const data = imageData.data;
	const bs = Math.max(4, Math.floor(blockSize * ratio));

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

/** 测量文字图层占位（逻辑像素） */
export const measureTextLayer = (ctx, layer) => {
	if (!layer?.text) {
		return { x: 0, y: 0, width: 0, height: 0 };
	}
	const size = layer.fontSize || 28;
	ctx.save();
	ctx.font = `bold ${size}px sans-serif`;
	const metrics = ctx.measureText(layer.text);
	ctx.restore();
	return {
		x: layer.x,
		y: layer.y,
		width: metrics.width,
		height: size
	};
};

/** 命中检测：返回最上层文字索引，未命中为 -1 */
export const hitTestTextLayer = (ctx, layers, px, py, padding = 24) => {
	if (!layers?.length) return -1;
	for (let i = layers.length - 1; i >= 0; i--) {
		const box = measureTextLayer(ctx, layers[i]);
		if (
			px >= box.x - padding &&
			px <= box.x + box.width + padding &&
			py >= box.y - padding &&
			py <= box.y + box.height + padding
		) {
			return i;
		}
	}
	return -1;
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

const TEXT_DELETE_HANDLE_R = 9;

/** 文字选中态右上角删除按钮圆心（逻辑像素） */
export const getTextDeleteHandleCenter = (ctx, layer, canvasW = 0, canvasH = 0) => {
	const box = measureTextLayer(ctx, layer);
	if (!box.width) return null;
	const pad = 6;
	let cx = box.x + box.width + pad;
	let cy = box.y - pad;
	const r = TEXT_DELETE_HANDLE_R;
	if (canvasW > 0 && canvasH > 0) {
		cx = Math.min(canvasW - r - 2, Math.max(r + 2, cx));
		cy = Math.min(canvasH - r - 2, Math.max(r + 2, cy));
	}
	return { cx, cy, r };
};

/** 是否点中删除按钮 */
export const hitTestTextDeleteHandle = (ctx, layer, px, py, canvasW = 0, canvasH = 0) => {
	const handle = getTextDeleteHandleCenter(ctx, layer, canvasW, canvasH);
	if (!handle) return false;
	const dx = px - handle.cx;
	const dy = py - handle.cy;
	const touchPad = 8;
	return dx * dx + dy * dy <= (handle.r + touchPad) ** 2;
};

const drawTextDeleteHandle = (ctx, handle) => {
	const { cx, cy, r } = handle;
	ctx.save();
	ctx.fillStyle = '#ff4444';
	ctx.beginPath();
	ctx.arc(cx, cy, r, 0, Math.PI * 2);
	ctx.fill();
	ctx.strokeStyle = '#ffffff';
	ctx.lineWidth = 1.5;
	ctx.stroke();
	ctx.fillStyle = '#ffffff';
	ctx.font = `bold ${Math.round(r * 1.05)}px sans-serif`;
	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';
	ctx.fillText('×', cx, cy - 1);
	ctx.restore();
};

/** 绘制选中框与删除按钮 */
export const drawTextSelection = (ctx, layer, canvasW = 0, canvasH = 0) => {
	const box = measureTextLayer(ctx, layer);
	if (!box.width) return;
	const pad = 6;
	ctx.save();
	ctx.strokeStyle = '#4facfe';
	ctx.lineWidth = 2;
	ctx.setLineDash([6, 4]);
	ctx.strokeRect(
		box.x - pad,
		box.y - pad,
		box.width + pad * 2,
		box.height + pad * 2
	);
	ctx.restore();
	const handle = getTextDeleteHandleCenter(ctx, layer, canvasW, canvasH);
	if (handle) drawTextDeleteHandle(ctx, handle);
};

/** 限制文字图层在画布内 */
export const clampTextLayerPosition = (layer, canvasW, canvasH, ctx) => {
	const box = measureTextLayer(ctx, layer);
	layer.x = Math.max(0, Math.min(canvasW - box.width, layer.x));
	layer.y = Math.max(0, Math.min(canvasH - box.height, layer.y));
};

/** 计算画布适配尺寸（可选限制总像素，降低手机端内存与绘制压力） */
export const calcCanvasLayout = (imgW, imgH, maxW = 345, maxH = 420, maxPixels = 0) => {
	let ratio = Math.min(maxW / imgW, maxH / imgH, 1);
	let width = Math.round(imgW * ratio);
	let height = Math.round(imgH * ratio);
	if (maxPixels > 0 && width * height > maxPixels) {
		const shrink = Math.sqrt(maxPixels / (width * height));
		width = Math.max(1, Math.round(width * shrink));
		height = Math.max(1, Math.round(height * shrink));
	}
	return {
		width,
		height,
		scale: width / imgW
	};
};

/** 编辑画布 DPR 上限，避免 3x 屏上像素量过大 */
export const getEditCanvasDpr = (rawDpr = 2) => Math.min(Math.max(1, Number(rawDpr) || 2), 2);
