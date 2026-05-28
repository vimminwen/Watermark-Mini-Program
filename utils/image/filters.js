/** 滤镜预设（CSS filter，预览与 Canvas 2D 导出共用） */
export const FILTER_PRESETS = [
	{ id: 'original', name: '原图', css: 'none', emoji: '🖼️' },
	{ id: 'bright', name: '明亮', css: 'brightness(1.12) contrast(1.08) saturate(1.05)', emoji: '☀️' },
	{ id: 'vivid', name: '鲜艳', css: 'saturate(1.45) contrast(1.1)', emoji: '🌈' },
	{ id: 'soft', name: '柔和', css: 'brightness(1.05) contrast(0.92) saturate(0.88)', emoji: '🌸' },
	{ id: 'warm', name: '暖色', css: 'sepia(0.22) saturate(1.25) hue-rotate(-8deg)', emoji: '🌅' },
	{ id: 'cool', name: '冷色', css: 'saturate(1.1) hue-rotate(18deg) brightness(1.03)', emoji: '❄️' },
	{ id: 'vintage', name: '复古', css: 'sepia(0.45) contrast(1.05) brightness(0.95)', emoji: '📷' },
	{ id: 'film', name: '胶片', css: 'contrast(1.15) saturate(0.85) sepia(0.15)', emoji: '🎞️' },
	{ id: 'bw', name: '黑白', css: 'grayscale(1) contrast(1.08)', emoji: '⚫' },
	{ id: 'ink', name: '油墨', css: 'grayscale(0.85) contrast(1.35)', emoji: '🖋️' }
];

export const getFilterById = (id) =>
	FILTER_PRESETS.find((item) => item.id === id) || FILTER_PRESETS[0];

/** 根据强度（0-100）混合滤镜效果（100 为完整效果） */
export const buildFilterCss = (preset, intensity = 100) => {
	if (!preset || preset.css === 'none') {
		return 'none';
	}
	const val = Math.max(0, Math.min(100, intensity));
	if (val >= 100) {
		return preset.css;
	}
	if (val <= 0) {
		return 'none';
	}
	const ratio = val / 100;
	// 强度越低，饱和度/对比度越接近原图
	return `saturate(${0.55 + ratio * 0.45}) contrast(${0.94 + ratio * 0.06}) ${preset.css}`;
};
