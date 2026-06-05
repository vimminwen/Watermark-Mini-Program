/** 裁剪比例预设（ratio = 宽/高，0 表示自由） */
export const CROP_ASPECT_PRESETS = [
	{ id: 'free', label: '自由', ratio: 0 },
	{ id: '1:1', label: '1:1', ratio: 1 },
	{ id: '4:3', label: '4:3', ratio: 4 / 3 },
	{ id: '3:4', label: '3:4', ratio: 3 / 4 },
	{ id: '16:9', label: '16:9', ratio: 16 / 9 },
	{ id: '9:16', label: '9:16', ratio: 9 / 16 }
];

/**
 * 在 1×1 归一化坐标系内，求给定宽高比的最大内接裁剪框（居中）
 */
export const createNormCropForAspect = (ratio) => {
	if (!ratio || ratio <= 0) {
		return { x: 0.1, y: 0.1, w: 0.8, h: 0.8 };
	}

	let w;
	let h;
	if (ratio >= 1) {
		w = 1;
		h = 1 / ratio;
	} else {
		h = 1;
		w = ratio;
	}

	return {
		x: (1 - w) / 2,
		y: (1 - h) / 2,
		w,
		h
	};
};

/** 裁剪框最小宽高（归一化） */
export const MIN_CROP_NORM_SIZE = 0.08;

/** 限制裁剪框在图片范围内，并保证最小尺寸 */
export const clampNormCrop = (crop) => {
	const minSize = MIN_CROP_NORM_SIZE;
	let { x, y, w, h } = crop || { x: 0, y: 0, w: 1, h: 1 };

	w = Math.max(minSize, Math.min(1, w));
	h = Math.max(minSize, Math.min(1, h));
	x = Math.max(0, Math.min(1 - w, x));
	y = Math.max(0, Math.min(1 - h, y));

	return { x, y, w, h };
};

/**
 * 自由模式下根据拖拽角点调整裁剪框
 */
export const applyCropResize = (snapshot, dx, dy) => {
	const { handle, regionX, regionY, regionW, regionH } = snapshot;
	let x = regionX;
	let y = regionY;
	let w = regionW;
	let h = regionH;

	switch (handle) {
		case 'br':
			w = regionW + dx;
			h = regionH + dy;
			break;
		case 'bl':
			x = regionX + dx;
			w = regionW - dx;
			h = regionH + dy;
			break;
		case 'tr':
			y = regionY + dy;
			w = regionW + dx;
			h = regionH - dy;
			break;
		case 'tl':
			x = regionX + dx;
			y = regionY + dy;
			w = regionW - dx;
			h = regionH - dy;
			break;
		default:
			return clampNormCrop({ x, y, w, h });
	}

	return clampNormCrop({ x, y, w, h });
};

/**
 * aspectFit 下图片在容器中的显示区域
 */
export const calcAspectFitRect = (containerW, containerH, imgW, imgH) => {
	if (!containerW || !containerH || !imgW || !imgH) {
		return { x: 0, y: 0, w: 0, h: 0, scale: 1 };
	}
	const scale = Math.min(containerW / imgW, containerH / imgH);
	const w = imgW * scale;
	const h = imgH * scale;
	return {
		x: (containerW - w) / 2,
		y: (containerH - h) / 2,
		w,
		h,
		scale
	};
};

/**
 * Canvas 导出裁剪区域
 * @param {{ x: number, y: number, w: number, h: number }} normCrop 相对原图 0~1
 */
export const exportCroppedImage = (
	canvasSelector,
	imagePath,
	normCrop,
	componentInstance,
	quality = 0.92
) =>
	new Promise((resolve, reject) => {
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

				img.onload = () => {
					const sx = Math.round(normCrop.x * img.width);
					const sy = Math.round(normCrop.y * img.height);
					const sw = Math.max(1, Math.round(normCrop.w * img.width));
					const sh = Math.max(1, Math.round(normCrop.h * img.height));

					const dpr = uni.getSystemInfoSync().pixelRatio || 2;
					canvas.width = sw * dpr;
					canvas.height = sh * dpr;
					ctx.setTransform(1, 0, 0, 1, 0, 0);
					ctx.scale(dpr, dpr);
					ctx.clearRect(0, 0, sw, sh);
					ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);

					const options = {
						canvas,
						fileType: 'jpg',
						quality,
						success: (fileRes) => resolve(fileRes.tempFilePath),
						fail: (err) => reject(err)
					};

					if (scope) {
						uni.canvasToTempFilePath(options, scope);
					} else {
						uni.canvasToTempFilePath(options);
					}
				};

				img.onerror = () => reject(new Error('图片加载失败'));
				img.src = imagePath;
			});
	});
