/** 接口固定功能类型 */
export const SMART_ERASE_FUNCTION_TYPE = '智能消除笔';

/** 默认消除区域（相对原图 0~1） */
export const DEFAULT_ERASE_REGION = { x: 0.25, y: 0.25, w: 0.5, h: 0.5 };

/**
 * 构建智能消除请求体
 * @param {string} imageUrl OSS 图片地址
 * @param {{ x: number, y: number, w: number, h: number }} normRegion
 * @param {{ width: number, height: number }} imageSize
 */
export const buildSmartErasePayload = (imageUrl, normRegion, imageSize) => {
	const w = Math.max(1, Math.round(imageSize?.width || 0));
	const h = Math.max(1, Math.round(imageSize?.height || 0));
	const region = normRegion || DEFAULT_ERASE_REGION;

	return {
		functionType: SMART_ERASE_FUNCTION_TYPE,
		image: imageUrl,
		rectangles: [
			{
				x: Math.round(region.x * w),
				y: Math.round(region.y * h),
				width: Math.max(1, Math.round(region.w * w)),
				height: Math.max(1, Math.round(region.h * h))
			}
		]
	};
};

/** 归一化区域 → 像素矩形（展示用） */
export const normRegionToPixel = (normRegion, imageSize) => {
	const w = imageSize?.width || 0;
	const h = imageSize?.height || 0;
	if (!w || !h) {
		return { x: 0, y: 0, width: 0, height: 0 };
	}
	const region = normRegion || DEFAULT_ERASE_REGION;
	return {
		x: Math.round(region.x * w),
		y: Math.round(region.y * h),
		width: Math.max(1, Math.round(region.w * w)),
		height: Math.max(1, Math.round(region.h * h))
	};
};
