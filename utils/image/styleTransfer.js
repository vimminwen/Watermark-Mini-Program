import { apiGetStyleList } from '@/api/api.js';
import { isApiSuccess, getApiMessage } from '@/utils/user/authHelper.js';

/** 跨次元相机风格配置 */
export const STYLE_TRANSFER_PRESETS = {
	anime: {
		key: 'anime',
		pageTitle: '图片动漫化',
		processText: '开始动漫化',
		reprocessText: '重新生成',
		categoryNames: ['动漫化'],
		tips: [
			'选择人像或场景照片，主体清晰效果更佳',
			'先选择下方动漫风格，再点击生成',
			'生成完成后在原图位置查看效果',
			'满意后保存到相册'
		]
	},
	cyber: {
		key: 'cyber',
		pageTitle: '图片赛博化',
		processText: '开始赛博化',
		reprocessText: '重新生成',
		categoryNames: ['幻幻化', '科幻化'],
		tips: [
			'适合城市夜景、人像等题材',
			'先选择下方赛博/科幻风格，再点击生成',
			'生成完成后在原图位置查看效果',
			'满意后保存到相册'
		]
	},
	guofeng: {
		key: 'guofeng',
		pageTitle: '图片古风化',
		processText: '开始古风化',
		reprocessText: '重新生成',
		categoryNames: ['古风化'],
		tips: [
			'适合人像、风景等转国风插画',
			'先选择下方古风样式，再点击生成',
			'生成完成后在原图位置查看效果',
			'满意后保存到相册'
		]
	}
};

export const DEFAULT_STYLE_KEY = 'anime';

export const DEFAULT_STRENGTH = 0.65;

export const getStylePreset = (styleKey) =>
	STYLE_TRANSFER_PRESETS[styleKey] || STYLE_TRANSFER_PRESETS[DEFAULT_STYLE_KEY];

/** 从接口分类列表中提取当前功能对应的风格项 */
export const pickStylesForPreset = (categories, styleKey) => {
	const preset = getStylePreset(styleKey);
	const names = preset.categoryNames || [];
	const list = Array.isArray(categories) ? categories : [];

	return list
		.filter((item) => names.includes(item?.category))
		.flatMap((item) =>
			(item?.styles || []).map((style) => ({
				id: String(style.id),
				name: style.name || '',
				description: style.description || '',
				category: item.category
			}))
		);
};

/** 拉取并解析当前功能可用的风格列表 */
export const fetchStylesForPreset = async (styleKey) => {
	const res = await apiGetStyleList();
	const body = res?.data;
	if (!isApiSuccess(body)) {
		throw new Error(getApiMessage(body, '获取风格列表失败'));
	}

	const categories = body?.data ?? body?.result ?? body;
	const styles = pickStylesForPreset(categories, styleKey);
	if (!styles.length) {
		throw new Error('暂无可用风格，请稍后重试');
	}
	return styles;
};

/**
 * 构建风格转换请求体：imageUrl、styleId、strength
 */
export const buildStyleTransferPayload = (imageUrl, styleItem, strength) => {
	if (!styleItem?.id) {
		throw new Error('请选择风格');
	}

	const value = Number(strength);
	const safeStrength = Number.isFinite(value)
		? Math.min(1, Math.max(0, value))
		: DEFAULT_STRENGTH;

	return {
		imageUrl,
		styleId: String(styleItem.id),
		styleType: styleItem.name || '',
		strength: safeStrength
	};
};
