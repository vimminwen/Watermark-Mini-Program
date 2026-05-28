/** 消除类型 */
export const REMOVAL_FUNCTION_TYPES = [
	{ id: 'subtitle_removal', label: '字幕消除' },
	{ id: 'watermark_removal', label: '水印消除' },
	{ id: 'object_removal', label: '物体消除' }
];

/** 常用消除区域（相对视频 0~1） */
export const REMOVAL_REGION_PRESETS = [
	{ id: 'bottom', label: '底部字幕', region: { x: 0.05, y: 0.72, w: 0.9, h: 0.22 } },
	{ id: 'top', label: '顶部区域', region: { x: 0.05, y: 0.05, w: 0.9, h: 0.18 } },
	{ id: 'center', label: '居中区域', region: { x: 0.15, y: 0.35, w: 0.7, h: 0.3 } },
	{ id: 'fullscreen', label: '全屏', region: { x: 0, y: 0, w: 1, h: 1 } }
];

export const DEFAULT_REMOVAL_REGION = { ...REMOVAL_REGION_PRESETS[0].region };

const isSnowflakeId = (value) => {
	if (value == null || value === '') return false;
	if (typeof value === 'number') return Number.isFinite(value) && value > 1e15;
	const text = String(value).trim();
	return /^\d{15,}$/.test(text) && !/^https?:\/\//i.test(text);
};

/** 解析接口返回的视频地址（data 为雪花 ID 时返回空，由轮询 ai-log 获取） */
export const normalizeRemovalVideoUrl = (body) => {
	if (!body || typeof body !== 'object') return '';
	const data = body.data ?? body.result ?? body;
	if (isSnowflakeId(data)) return '';
	if (typeof data === 'string' && /^https?:\/\//i.test(data)) {
		return data;
	}
	if (data && typeof data === 'object') {
		return (
			data.videoUrl ??
			data.url ??
			data.resultUrl ??
			data.outputUrl ??
			data.video ??
			''
		);
	}
	return '';
};

/**
 * 构建字幕/区域消除请求体
 * @param {object} params
 * @param {string} params.videoUrl
 * @param {{ x: number, y: number, w: number, h: number }} params.normRegion 0~1
 * @param {number} params.videoWidth
 * @param {number} params.videoHeight
 * @param {number} params.duration 秒
 * @param {string} params.functionType
 */
export const buildSubtitleRemovalPayload = ({
	videoUrl,
	normRegion,
	videoWidth,
	videoHeight,
	duration,
	functionType
}) => {
	const w = Math.max(1, Math.round(videoWidth || 0));
	const h = Math.max(1, Math.round(videoHeight || 0));
	const region = normRegion || DEFAULT_REMOVAL_REGION;

	return {
		videoUrl,
		x: Math.round(region.x * w),
		y: Math.round(region.y * h),
		w: Math.max(1, Math.round(region.w * w)),
		h: Math.max(1, Math.round(region.h * h)),
		functionType: functionType || 'subtitle_removal',
		width: w,
		height: h,
		duration: Math.max(1, Math.round(Number(duration) || 1))
	};
};
