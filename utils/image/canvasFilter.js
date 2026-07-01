import { isIdentityFilterEffects } from '@/utils/image/filters.js';

const MAX_EXPORT_SIDE = 1200;

const clamp255 = (value) => Math.max(0, Math.min(255, value));

const rgbToHsl = (r, g, b) => {
	r /= 255;
	g /= 255;
	b /= 255;
	const max = Math.max(r, g, b);
	const min = Math.min(r, g, b);
	let h = 0;
	let s = 0;
	const l = (max + min) / 2;

	if (max !== min) {
		const d = max - min;
		s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
		switch (max) {
			case r:
				h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
				break;
			case g:
				h = ((b - r) / d + 2) / 6;
				break;
			default:
				h = ((r - g) / d + 4) / 6;
				break;
		}
	}

	return [h, s, l];
};

const hslToRgb = (h, s, l) => {
	if (s === 0) {
		const v = l * 255;
		return [v, v, v];
	}

	const hue2rgb = (p, q, t) => {
		let tt = t;
		if (tt < 0) tt += 1;
		if (tt > 1) tt -= 1;
		if (tt < 1 / 6) return p + (q - p) * 6 * tt;
		if (tt < 1 / 2) return q;
		if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
		return p;
	};

	const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
	const p = 2 * l - q;

	return [
		hue2rgb(p, q, h + 1 / 3) * 255,
		hue2rgb(p, q, h) * 255,
		hue2rgb(p, q, h - 1 / 3) * 255
	];
};

/** 与 CSS filter 顺序一致：brightness → contrast → saturate → grayscale → sepia → hue-rotate */
const applyEffectsToPixel = (r, g, b, effects) => {
	const { brightness, contrast, saturate, grayscale, sepia, hueRotate } = effects;

	r *= brightness;
	g *= brightness;
	b *= brightness;

	r = (r - 128) * contrast + 128;
	g = (g - 128) * contrast + 128;
	b = (b - 128) * contrast + 128;

	if (saturate !== 1 || hueRotate !== 0) {
		let [h, s, l] = rgbToHsl(clamp255(r), clamp255(g), clamp255(b));
		if (saturate !== 1) {
			s = Math.min(1, Math.max(0, s * saturate));
		}
		if (hueRotate !== 0) {
			h = (h + hueRotate / 360) % 1;
			if (h < 0) h += 1;
		}
		[r, g, b] = hslToRgb(h, s, l);
	}

	if (grayscale > 0) {
		const gray = 0.299 * r + 0.587 * g + 0.114 * b;
		r = r * (1 - grayscale) + gray * grayscale;
		g = g * (1 - grayscale) + gray * grayscale;
		b = b * (1 - grayscale) + gray * grayscale;
	}

	if (sepia > 0) {
		const sepiaR = r * 0.393 + g * 0.769 + b * 0.189;
		const sepiaG = r * 0.349 + g * 0.686 + b * 0.168;
		const sepiaB = r * 0.272 + g * 0.534 + b * 0.131;
		r = r * (1 - sepia) + sepiaR * sepia;
		g = g * (1 - sepia) + sepiaG * sepia;
		b = b * (1 - sepia) + sepiaB * sepia;
	}

	return [clamp255(r), clamp255(g), clamp255(b)];
};

const applyFilterToImageData = (imageData, effects) => {
	const { data } = imageData;
	const len = data.length;
	for (let i = 0; i < len; i += 4) {
		if (data[i + 3] === 0) continue;
		const [r, g, b] = applyEffectsToPixel(data[i], data[i + 1], data[i + 2], effects);
		data[i] = r;
		data[i + 1] = g;
		data[i + 2] = b;
	}
	return imageData;
};

const exportCanvasToTempFile = (canvas, width, height, scope) =>
	new Promise((resolve, reject) => {
		const doExport = () => {
			const options = {
				canvas,
				x: 0,
				y: 0,
				width,
				height,
				destWidth: width,
				destHeight: height,
				fileType: 'jpg',
				quality: 0.92,
				success: (fileRes) => resolve(fileRes.tempFilePath),
				fail: reject
			};

			if (scope) {
				uni.canvasToTempFilePath(options, scope);
			} else {
				uni.canvasToTempFilePath(options);
			}
		};

		if (typeof requestAnimationFrame === 'function') {
			requestAnimationFrame(() => requestAnimationFrame(doExport));
		} else {
			setTimeout(doExport, 32);
		}
	});

/**
 * 使用 Canvas 2D 导出带滤镜的图片（像素级处理，兼容微信小程序真机）
 * @param {string} canvasSelector - 如 '#exportCanvas'
 * @param {string} imagePath - 本地图片路径
 * @param {object} effects - buildFilterEffects 返回值
 * @param {object} componentInstance - getCurrentInstance()，用于 createSelectorQuery().in()
 */
export const exportImageWithFilter = (canvasSelector, imagePath, effects, componentInstance) => {
	return new Promise((resolve, reject) => {
		if (!imagePath) {
			reject(new Error('图片路径为空'));
			return;
		}

		const query = uni.createSelectorQuery();
		const scope = componentInstance?.proxy ?? componentInstance;
		if (scope) {
			query.in(scope);
		}

		query
			.select(canvasSelector)
			.fields({ node: true, size: true })
			.exec((res) => {
				const canvas = res?.[0]?.node;
				if (!canvas) {
					reject(new Error('Canvas 未初始化'));
					return;
				}

				const ctx = canvas.getContext('2d');
				const img = canvas.createImage();
				const filterEffects = effects || {};
				const needPixelFilter = !isIdentityFilterEffects(filterEffects);

				img.onload = async () => {
					let width = img.width;
					let height = img.height;
					const maxSide = Math.max(width, height);

					if (maxSide > MAX_EXPORT_SIDE) {
						const scale = MAX_EXPORT_SIDE / maxSide;
						width = Math.round(width * scale);
						height = Math.round(height * scale);
					}

					canvas.width = width;
					canvas.height = height;
					ctx.setTransform(1, 0, 0, 1, 0, 0);
					ctx.imageSmoothingEnabled = true;
					ctx.imageSmoothingQuality = 'high';
					ctx.clearRect(0, 0, width, height);
					ctx.filter = 'none';
					ctx.drawImage(img, 0, 0, width, height);

					if (needPixelFilter) {
						try {
							const imageData = ctx.getImageData(0, 0, width, height);
							applyFilterToImageData(imageData, filterEffects);
							ctx.putImageData(imageData, 0, 0);
						} catch (e) {
							console.warn('[exportImageWithFilter] getImageData failed', e);
							reject(new Error('滤镜处理失败，请换一张图片重试'));
							return;
						}
					}

					try {
						const tempPath = await exportCanvasToTempFile(canvas, width, height, scope);
						resolve(tempPath);
					} catch (err) {
						reject(err);
					}
				};

				img.onerror = () => reject(new Error('图片加载失败'));
				img.src = imagePath;
			});
	});
};
