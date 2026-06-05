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
	let width = Math.round(Number(srcWidth) || 0);
	let height = Math.round(Number(srcHeight) || 0);

	if (!width || !height) {
		return { width: 0, height: 0, capped: false };
	}

	if (upscaleScale === 1) {
		return { width, height, capped: false };
	}

	const outW = width * upscaleScale;
	const outH = height * upscaleScale;
	const maxSide = Math.max(outW, outH);
	let capped = false;

	if (maxSide > MAX_UPSCALE_OUTPUT_SIDE) {
		const ratio = MAX_UPSCALE_OUTPUT_SIDE / maxSide;
		width = Math.round(width * ratio);
		height = Math.round(height * ratio);
		capped = true;
	}

	return {
		width: Math.round(width * upscaleScale),
		height: Math.round(height * upscaleScale),
		capped
	};
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
