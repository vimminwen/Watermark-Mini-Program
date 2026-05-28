/** 放大倍数选项 */
export const UPSCALE_OPTIONS = [
	{ value: 2, label: '2倍' },
	{ value: 3, label: '3倍' },
	{ value: 4, label: '4倍' }
];

const MAX_OUTPUT_SIDE = 4096;

/** 解析放大接口返回的图片地址 */
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
 * Canvas 本地放大（API 不可用时的降级方案）
 */
export const upscaleImageLocal = (canvasSelector, imagePath, scale, componentInstance) => {
	return new Promise((resolve, reject) => {
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

				uni.getImageInfo({
					src: imagePath,
					success: (info) => {
						let width = info.width;
						let height = info.height;
						const outW = width * scale;
						const outH = height * scale;
						const maxSide = Math.max(outW, outH);

						if (maxSide > MAX_OUTPUT_SIDE) {
							const ratio = MAX_OUTPUT_SIDE / maxSide;
							width = Math.round(width * ratio);
							height = Math.round(height * ratio);
						}

						const targetW = Math.round(width * scale);
						const targetH = Math.round(height * scale);
						const ctx = canvas.getContext('2d');
						const img = canvas.createImage();

						img.onload = () => {
							const dpr = 1;
							canvas.width = targetW * dpr;
							canvas.height = targetH * dpr;
							ctx.setTransform(1, 0, 0, 1, 0, 0);
							ctx.imageSmoothingEnabled = true;
							ctx.imageSmoothingQuality = 'high';
							ctx.clearRect(0, 0, targetW, targetH);
							ctx.drawImage(img, 0, 0, targetW, targetH);

							const options = {
								canvas,
								fileType: 'jpg',
								quality: 0.95,
								success: (fileRes) => resolve({
									tempPath: fileRes.tempFilePath,
									width: targetW,
									height: targetH
								}),
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
					},
					fail: () => reject(new Error('读取图片信息失败'))
				});
			});
	});
};
