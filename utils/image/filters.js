export const FILTER_DEFAULT_INTENSITY = 50;

export const FILTER_PRESETS = [
	{ id: 'original', name: '原图', effects: null, emoji: '🖼️' },
	{
		id: 'bright',
		name: '明亮',
		effects: { brightness: 1.35, contrast: 1.15, saturate: 1.1 },
		emoji: '☀️'
	},
	{
		id: 'vivid',
		name: '鲜艳',
		effects: { saturate: 2, contrast: 1.2 },
		emoji: '🌈'
	},
	{
		id: 'warm',
		name: '暖色',
		effects: { sepia: 0.35, saturate: 1.4, hueRotate: -12 },
		emoji: '🌅'
	},
	{
		id: 'cool',
		name: '冷色',
		effects: { saturate: 1.3, hueRotate: 30, brightness: 1.08 },
		emoji: '❄️'
	},
	{
		id: 'bw',
		name: '黑白',
		effects: { grayscale: 1, contrast: 1.15 },
		emoji: '⚫'
	},
	{
		id: 'soft',
		name: '柔和',
		effects: { brightness: 1.12, contrast: 0.88, saturate: 0.85 },
		emoji: '🌸'
	},
	{
		id: 'fresh',
		name: '清新',
		effects: { brightness: 1.15, contrast: 1.05, saturate: 1.25, hueRotate: 8 },
		emoji: '🍃'
	},
	{
		id: 'vintage',
		name: '复古',
		effects: { sepia: 0.55, contrast: 1.1, saturate: 0.75, brightness: 0.95 },
		emoji: '📷'
	},
	{
		id: 'sunset',
		name: '日落',
		effects: { sepia: 0.25, saturate: 1.5, hueRotate: -18, brightness: 1.05, contrast: 1.1 },
		emoji: '🌇'
	},
	{
		id: 'forest',
		name: '森系',
		effects: { saturate: 1.2, hueRotate: 25, contrast: 1.08, brightness: 0.92 },
		emoji: '🌲'
	},
	{
		id: 'ocean',
		name: '海洋',
		effects: { saturate: 1.35, hueRotate: 45, brightness: 1.05, contrast: 1.12 },
		emoji: '🌊'
	},
	{
		id: 'rose',
		name: '玫瑰',
		effects: { saturate: 1.3, sepia: 0.15, hueRotate: -25, brightness: 1.08 },
		emoji: '🌹'
	},
	{
		id: 'golden',
		name: '金色',
		effects: { sepia: 0.45, saturate: 1.35, brightness: 1.18, contrast: 1.08 },
		emoji: '✨'
	},
	{
		id: 'moody',
		name: '暗调',
		effects: { brightness: 0.78, contrast: 1.35, saturate: 0.8 },
		emoji: '🌑'
	},
	{
		id: 'fade',
		name: '褪色',
		effects: { saturate: 0.55, contrast: 0.9, brightness: 1.1 },
		emoji: '🌫️'
	},
	{
		id: 'film',
		name: '胶片',
		effects: { contrast: 1.25, saturate: 0.9, sepia: 0.12, brightness: 0.98 },
		emoji: '🎞️'
	},
	{
		id: 'ink',
		name: '墨水',
		effects: { grayscale: 0.85, contrast: 1.45, brightness: 0.9 },
		emoji: '🖋️'
	},
	{
		id: 'dramatic',
		name: '戏剧',
		effects: { contrast: 1.55, brightness: 0.88, saturate: 1.15 },
		emoji: '🎭'
	},
	{
		id: 'pastel',
		name: '粉彩',
		effects: { brightness: 1.2, saturate: 0.65, contrast: 0.85 },
		emoji: '🎨'
	},
	{
		id: 'neon',
		name: '霓虹',
		effects: { saturate: 2.2, contrast: 1.3, brightness: 1.1, hueRotate: 15 },
		emoji: '💡'
	},
	{
		id: 'autumn',
		name: '秋日',
		effects: { sepia: 0.4, saturate: 1.25, hueRotate: -8, brightness: 1.02 },
		emoji: '🍂'
	},
	{
		id: 'spring',
		name: '春日',
		effects: { brightness: 1.18, saturate: 1.2, hueRotate: 12, contrast: 0.95 },
		emoji: '🌷'
	},
	{
		id: 'winter',
		name: '冬日',
		effects: { brightness: 1.12, saturate: 0.6, hueRotate: 35, contrast: 1.05 },
		emoji: '⛄'
	},
	{
		id: 'summer',
		name: '夏阳',
		effects: { brightness: 1.28, saturate: 1.45, contrast: 1.1, hueRotate: -5 },
		emoji: '🏖️'
	},
	{
		id: 'night',
		name: '夜景',
		effects: { brightness: 0.72, contrast: 1.4, saturate: 1.1, hueRotate: 20 },
		emoji: '🌃'
	},
	{
		id: 'coffee',
		name: '咖啡',
		effects: { sepia: 0.65, saturate: 0.85, brightness: 0.92, contrast: 1.05 },
		emoji: '☕'
	},
	{
		id: 'candy',
		name: '糖果',
		effects: { saturate: 1.8, brightness: 1.15, contrast: 0.95, hueRotate: 8 },
		emoji: '🍬'
	},
	{
		id: 'retro',
		name: '怀旧',
		effects: { sepia: 0.35, contrast: 1.18, saturate: 0.7, brightness: 0.94 },
		emoji: '📺'
	},
	{
		id: 'clarity',
		name: '清晰',
		effects: { contrast: 1.35, saturate: 1.08, brightness: 1.05 },
		emoji: '🔍'
	}
];

/** 各滤镜参数的默认（无效果）值 */
const FILTER_IDENTITY = {
	brightness: 1,
	contrast: 1,
	saturate: 1,
	grayscale: 0,
	sepia: 0,
	hueRotate: 0
};

const lerp = (from, to, t) => from + (to - from) * t;

const formatFilterNum = (value) => {
	const rounded = Math.round(value * 1000) / 1000;
	return Number.isInteger(rounded) ? String(rounded) : String(rounded);
};

/** 按强度计算滤镜参数（供 Canvas 像素处理与 CSS 预览共用） */
export const buildFilterEffects = (preset, intensity = 100) => {
	const identity = { ...FILTER_IDENTITY };
	if (!preset?.effects) {
		return identity;
	}

	const t = Math.max(0, Math.min(100, Number(intensity) || 0)) / 100;
	if (t <= 0) {
		return identity;
	}

	const effects = preset.effects;
	return {
		brightness:
			effects.brightness != null
				? lerp(FILTER_IDENTITY.brightness, effects.brightness, t)
				: FILTER_IDENTITY.brightness,
		contrast:
			effects.contrast != null
				? lerp(FILTER_IDENTITY.contrast, effects.contrast, t)
				: FILTER_IDENTITY.contrast,
		saturate:
			effects.saturate != null
				? lerp(FILTER_IDENTITY.saturate, effects.saturate, t)
				: FILTER_IDENTITY.saturate,
		grayscale:
			effects.grayscale != null
				? lerp(FILTER_IDENTITY.grayscale, effects.grayscale, t)
				: FILTER_IDENTITY.grayscale,
		sepia:
			effects.sepia != null
				? lerp(FILTER_IDENTITY.sepia, effects.sepia, t)
				: FILTER_IDENTITY.sepia,
		hueRotate:
			effects.hueRotate != null
				? lerp(FILTER_IDENTITY.hueRotate, effects.hueRotate, t)
				: FILTER_IDENTITY.hueRotate
	};
};

export const isIdentityFilterEffects = (effects) => {
	if (!effects) return true;
	return (
		effects.brightness === 1 &&
		effects.contrast === 1 &&
		effects.saturate === 1 &&
		effects.grayscale === 0 &&
		effects.sepia === 0 &&
		effects.hueRotate === 0
	);
};

export const getFilterById = (id) =>
	FILTER_PRESETS.find((item) => item.id === id) || FILTER_PRESETS[0];

/**
 * 按强度 0~100 在原图与目标滤镜之间线性插值
 * 0% → 原图；100% → 完整滤镜；全程连续变化
 */
export const buildFilterCss = (preset, intensity = 100) => {
	const effects = buildFilterEffects(preset, intensity);
	if (isIdentityFilterEffects(effects)) {
		return 'none';
	}

	const parts = [];

	if (effects.brightness !== 1) {
		parts.push(`brightness(${formatFilterNum(effects.brightness)})`);
	}
	if (effects.contrast !== 1) {
		parts.push(`contrast(${formatFilterNum(effects.contrast)})`);
	}
	if (effects.saturate !== 1) {
		parts.push(`saturate(${formatFilterNum(effects.saturate)})`);
	}
	if (effects.grayscale !== 0) {
		parts.push(`grayscale(${formatFilterNum(effects.grayscale)})`);
	}
	if (effects.sepia !== 0) {
		parts.push(`sepia(${formatFilterNum(effects.sepia)})`);
	}
	if (effects.hueRotate !== 0) {
		parts.push(`hue-rotate(${formatFilterNum(effects.hueRotate)}deg)`);
	}

	return parts.length ? parts.join(' ') : 'none';
};

/** 缩略图预览：100% 强度 */
export const getFilterPreviewCss = (preset) => buildFilterCss(preset, 100);
