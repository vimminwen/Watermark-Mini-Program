/** 接口固定功能类型 */
export const SMART_ERASE_FUNCTION_TYPE = '智能消除笔';

/** 涂抹点最小间距（原图像素） */
export const MIN_MASK_STROKE_DIST = 8;

/** 笔刷大小范围（原图像素） */
export const MIN_MASK_BRUSH = 12;
export const MAX_MASK_BRUSH = 72;

/**
 * 构建智能消除请求体（涂抹蒙版）
 * @param {string} imageUrl OSS 图片地址
 * @param {string} maskUrl OSS 蒙版地址（白=消除，黑=保留）
 */
export const buildSmartErasePayload = (imageUrl, maskUrl) => ({
	functionType: SMART_ERASE_FUNCTION_TYPE,
	image: imageUrl,
	maskUrl
});

/** 是否为分段笔触结构 [[{x,y,brush},...], ...] */
export const isSegmentedMaskStrokes = (strokes) =>
	Array.isArray(strokes) && strokes.some((item) => Array.isArray(item));

/** 是否存在有效涂抹 */
export const hasMaskStrokes = (strokes) => {
	if (!Array.isArray(strokes) || !strokes.length) return false;
	if (isSegmentedMaskStrokes(strokes)) {
		return strokes.some((segment) => segment?.length > 0);
	}
	return true;
};

/** 归一化为分段笔触（兼容旧的一维点数组） */
export const normalizeMaskStrokeSegments = (strokes) => {
	if (!Array.isArray(strokes) || !strokes.length) return [];
	if (isSegmentedMaskStrokes(strokes)) {
		return strokes.filter((segment) => Array.isArray(segment) && segment.length);
	}
	return [strokes];
};

/** 显示坐标 → 原图像素坐标 */
export const displayToOriginPoint = (localX, localY, displayRect, originSize) => {
	const dw = displayRect?.w || 0;
	const dh = displayRect?.h || 0;
	const ow = originSize?.width || 0;
	const oh = originSize?.height || 0;
	if (!dw || !dh || !ow || !oh) return null;
	return {
		x: Math.max(0, Math.min(ow, (localX / dw) * ow)),
		y: Math.max(0, Math.min(oh, (localY / dh) * oh))
	};
};

/** 原图像素笔刷 → 显示笔刷半径 */
export const originBrushToDisplay = (brush, displayRect, originSize) => {
	const ow = originSize?.width || 1;
	const dw = displayRect?.w || 1;
	return Math.max(4, (brush / ow) * dw);
};

/** 添加涂抹点（原图像素，自动抽稀） */
export const appendMaskStrokePoint = (segment, x, y, brush) => {
	if (!Array.isArray(segment)) return false;
	const last = segment[segment.length - 1];
	if (last) {
		const dx = x - last.x;
		const dy = y - last.y;
		if (dx * dx + dy * dy < MIN_MASK_STROKE_DIST * MIN_MASK_STROKE_DIST) {
			return false;
		}
	}
	segment.push({ x, y, brush });
	return true;
};

const drawMaskSegmentOnCanvas = (ctx, segment, drawPoint) => {
	if (!segment?.length) return;
	segment.forEach((point, index) => {
		const current = drawPoint(point);
		ctx.beginPath();
		ctx.arc(current.x, current.y, current.radius, 0, Math.PI * 2);
		ctx.fill();
		if (index > 0) {
			const prev = drawPoint(segment[index - 1]);
			ctx.lineWidth = current.lineWidth;
			ctx.beginPath();
			ctx.moveTo(prev.x, prev.y);
			ctx.lineTo(current.x, current.y);
			ctx.stroke();
		}
	});
};

/** 绘制预览蒙版（半透明粉） */
export const drawMaskPreview = (ctx, strokes, displayRect, originSize) => {
	const w = displayRect?.w || 0;
	const h = displayRect?.h || 0;
	if (!ctx || !w || !h) return;
	ctx.clearRect(0, 0, w, h);

	const segments = normalizeMaskStrokeSegments(strokes);
	if (!segments.length) return;

	const ow = originSize?.width || 1;
	const oh = originSize?.height || 1;
	ctx.fillStyle = 'rgba(79, 172, 254, 0.55)';
	ctx.strokeStyle = 'rgba(79, 172, 254, 0.55)';
	ctx.lineCap = 'round';
	ctx.lineJoin = 'round';

	segments.forEach((segment) => {
		drawMaskSegmentOnCanvas(ctx, segment, (point) => {
			const radius = originBrushToDisplay(point.brush, displayRect, originSize) / 2;
			return {
				x: (point.x / ow) * w,
				y: (point.y / oh) * h,
				radius,
				lineWidth: radius * 2
			};
		});
	});
};

/** 绘制导出蒙版（黑底白字） */
export const drawMaskExport = (ctx, strokes, originSize) => {
	const w = originSize?.width || 0;
	const h = originSize?.height || 0;
	if (!ctx || !w || !h) return;
	ctx.setTransform(1, 0, 0, 1, 0, 0);
	ctx.fillStyle = '#000000';
	ctx.fillRect(0, 0, w, h);

	const segments = normalizeMaskStrokeSegments(strokes);
	if (!segments.length) return;

	ctx.fillStyle = '#ffffff';
	ctx.strokeStyle = '#ffffff';
	ctx.lineCap = 'round';
	ctx.lineJoin = 'round';

	segments.forEach((segment) => {
		drawMaskSegmentOnCanvas(ctx, segment, (point) => ({
			x: point.x,
			y: point.y,
			radius: point.brush / 2,
			lineWidth: point.brush
		}));
	});
};

/** 深拷贝分段笔触 */
export const cloneMaskStrokeSegments = (strokes) =>
	normalizeMaskStrokeSegments(strokes).map((segment) => segment.map((point) => ({ ...point })));
