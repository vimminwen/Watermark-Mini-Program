/** 跨次元相机风格配置 */
export const STYLE_TRANSFER_PRESETS = {
	anime: {
		key: 'anime',
		styleType: '日系动漫',
		pageTitle: '图片动漫化',
		processText: '开始动漫化',
		reprocessText: '重新生成',
		tips: [
			'选择人像或场景照片，主体清晰效果更佳',
			'调节「风格强度」可控制动漫化浓淡',
			'生成完成后在原图位置查看效果',
			'满意后保存到相册'
		]
	},
	cyber: {
		key: 'cyber',
		styleType: '赛博朋克',
		pageTitle: '图片赛博化',
		processText: '开始赛博化',
		reprocessText: '重新生成',
		tips: [
			'适合城市夜景、人像等题材',
			'强度越高霓虹与对比越明显',
			'生成完成后在原图位置查看效果',
			'满意后保存到相册'
		]
	},
	guofeng: {
		key: 'guofeng',
		styleType: '国风插画',
		pageTitle: '图片古风化',
		processText: '开始古风化',
		reprocessText: '重新生成',
		tips: [
			'适合人像、风景等转国风插画',
			'可调节强度获得水墨或工笔感',
			'生成完成后在原图位置查看效果',
			'满意后保存到相册'
		]
	}
};

export const DEFAULT_STYLE_KEY = 'anime';

export const DEFAULT_STRENGTH = 0.65;

export const getStylePreset = (styleKey) =>
	STYLE_TRANSFER_PRESETS[styleKey] || STYLE_TRANSFER_PRESETS[DEFAULT_STYLE_KEY];

/** 从预设解析 styleType（兼容旧字段 functionType） */
export const resolveStyleType = (styleKey) => {
	const preset = getStylePreset(styleKey);
	return preset.styleType || preset.functionType || '';
};

/**
 * 构建跨次元相机请求体：imageUrl、styleType、strength
 * @param {string} imageUrl OSS 公网地址
 * @param {string} styleKey anime | cyber | guofeng
 * @param {number} strength 0~1
 */
export const buildStyleTransferPayload = (imageUrl, styleKey, strength) => {
	const styleType = resolveStyleType(styleKey);
	if (!styleType) {
		throw new Error('未配置风格类型 styleType');
	}

	const value = Number(strength);
	const safeStrength = Number.isFinite(value)
		? Math.min(1, Math.max(0, value))
		: DEFAULT_STRENGTH;

	return {
		imageUrl,
		styleType,
		strength: safeStrength
	};
};
