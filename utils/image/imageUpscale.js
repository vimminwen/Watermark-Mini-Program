/** 放大倍数选项（纯前端 Canvas 放大） */
export const UPSCALE_OPTIONS = [
	{ value: 1, label: '1×' },
	{ value: 1.5, label: '1.5×' },
	{ value: 2, label: '2×' },
	{ value: 3, label: '3×' },
	{ value: 4, label: '4×' },
	{ value: 5, label: '5×' },
	{ value: 6, label: '6×' },
	{ value: 8, label: '8×' }
];

export const MAX_UPSCALE_OUTPUT_SIDE = 4096;

/** 计算放大后的实际输出尺寸（与 upscaleImageLocal 逻辑一致） */
export const computeUpscaleOutputSize = (srcWidth, srcHeight, scale) => {
	const upscaleScale = Number(scale) || 1;
	const srcW = Math.round(Number(srcWidth) || 0);
	const srcH = Math.round(Number(srcHeight) || 0);

	if (!srcW || !srcH) {
		return { width: 0, height: 0, capped: false };
	}

	if (upscaleScale === 1) {
		return { width: srcW, height: srcH, capped: false };
	}

	let targetW = Math.round(srcW * upscaleScale);
	let targetH = Math.round(srcH * upscaleScale);
	const maxSide = Math.max(targetW, targetH);
	let capped = maxSide > MAX_UPSCALE_OUTPUT_SIDE;

	if (capped) {
		// 直接对目标尺寸等比压缩，最长边压到 4096，避免「先缩原图再放大」的二次取整误差
		const capRatio = MAX_UPSCALE_OUTPUT_SIDE / maxSide;
		targetW = Math.max(1, Math.min(MAX_UPSCALE_OUTPUT_SIDE, Math.round(targetW * capRatio)));
		targetH = Math.max(1, Math.min(MAX_UPSCALE_OUTPUT_SIDE, Math.round(targetH * capRatio)));
	}

	return { width: targetW, height: targetH, capped };
};

/** 该倍数下输出是否已达当前图片可放大的上限（更高倍数尺寸不再增大） */
export const isScaleAtMaxOutput = (srcWidth, srcHeight, scale) => {
	const out = computeUpscaleOutputSize(srcWidth, srcHeight, scale);
	if (!out.width || !out.height) return false;

	let maxSide = 0;
	for (const opt of UPSCALE_OPTIONS) {
		const o = computeUpscaleOutputSize(srcWidth, srcHeight, opt.value);
		maxSide = Math.max(maxSide, o.width, o.height);
	}

	const thisSide = Math.max(out.width, out.height);
	if (thisSide < maxSide) return false;

	const scaleNum = Number(scale) || 1;
	if (scaleNum === 1) {
		const next = computeUpscaleOutputSize(srcWidth, srcHeight, 2);
		return Math.max(next.width, next.height) === thisSide;
	}

	return true;
};

/** 解析放大接口返回的图片地址（后端接口备用） */
export const normalizeUpscaleResult = (body) => {
	if (!body || typeof body !== 'object') return '';
	const data = body.data ?? body.result ?? body;
	if (typeof data === 'string' && /^https?:\/\//i.test(data)) {
		return data;
	}
	if (data && typeof data === 'object') {
		return (
			data.imageUrl ??
			data.image ??
			data.url ??
			data.resultUrl ??
			data.outputUrl ??
			''
		);
	}
	return '';
};

/**
 * Canvas 本地放大（纯前端）
 */
export const upscaleImageLocal = (canvasSelector, imagePath, scale, componentInstance) => {
	const upscaleScale = Number(scale) || 1;

	return new Promise((resolve, reject) => {
		if (!imagePath) {
			reject(new Error('图片路径为空'));
			return;
		}

		uni.getImageInfo({
			src: imagePath,
			success: (info) => {
				let width = info.width;
				let height = info.height;

				if (upscaleScale === 1) {
					resolve({
						tempPath: imagePath,
						width,
						height
					});
					return;
				}

				const { width: targetW, height: targetH } = computeUpscaleOutputSize(
					width,
					height,
					upscaleScale
				);

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
							canvas.width = targetW;
							canvas.height = targetH;
							ctx.setTransform(1, 0, 0, 1, 0, 0);
							ctx.imageSmoothingEnabled = true;
							ctx.imageSmoothingQuality = 'high';
							ctx.clearRect(0, 0, targetW, targetH);
							ctx.drawImage(img, 0, 0, targetW, targetH);

							const exportOptions = {
								canvas,
								destWidth: targetW,
								destHeight: targetH,
								fileType: 'jpg',
								quality: 0.92,
								success: (fileRes) =>
									resolve({
										tempPath: fileRes.tempFilePath,
										width: targetW,
										height: targetH
									}),
								fail: (err) => reject(err)
							};

							if (scope) {
								uni.canvasToTempFilePath(exportOptions, scope);
							} else {
								uni.canvasToTempFilePath(exportOptions);
							}
						};

						img.onerror = () => reject(new Error('图片加载失败'));
						img.src = imagePath;
					});
			},
			fail: () => reject(new Error('读取图片信息失败'))
		});
	});
};
