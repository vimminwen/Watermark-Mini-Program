const DEFAULT_MAX_SIDE = 1280;
const DEFAULT_COMPRESS_QUALITY = 0.5;

export { DEFAULT_MAX_SIDE, DEFAULT_COMPRESS_QUALITY };

/**
 * 根据原图体积与尺寸计算压缩参数
 */
export const resolveCompressOptions = (fileSizeBytes = 0, width = 0, height = 0) => {
	const mb = (Number(fileSizeBytes) || 0) / (1024 * 1024);
	const longest = Math.max(Number(width) || 0, Number(height) || 0);
	const pixels = (Number(width) || 0) * (Number(height) || 0);

	let maxSide = DEFAULT_MAX_SIDE;
	let quality = DEFAULT_COMPRESS_QUALITY;

	if (mb >= 3 || pixels >= 4000000) {
		maxSide = 1080;
		quality = 0.42;
	} else if (mb >= 1.5 || pixels >= 2500000) {
		maxSide = 1280;
		quality = 0.48;
	} else if (mb >= 0.8 || longest > 1600) {
		maxSide = 1440;
		quality = 0.52;
	} else if (mb >= 0.4) {
		maxSide = 1600;
		quality = 0.55;
	}

	return { maxSide, quality, fileType: 'jpg' };
};

/**
 * 格式化文件大小
 */
export const formatFileSize = (bytes) => {
	const n = Number(bytes) || 0;
	if (n < 1024) return `${n} B`;
	if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
	return `${(n / 1024 / 1024).toFixed(2)} MB`;
};

/**
 * 获取本地文件大小（字节）
 */
export const getFileSize = (filePath) =>
	new Promise((resolve) => {
		if (!filePath) {
			resolve(0);
			return;
		}
		uni.getFileInfo({
			filePath,
			success: (res) => resolve(res.size || 0),
			fail: () => resolve(0)
		});
	});

/**
 * Canvas 2D 压缩导出（纯前端）
 * @param {string} canvasSelector
 * @param {string} imagePath
 * @param {{ quality?: number, maxSide?: number, fileType?: 'jpg'|'png' }} options
 * @param {object} componentInstance
 */
export const compressImageToTempFile = (
	canvasSelector,
	imagePath,
	options = {},
	componentInstance
) => {
	const fileType = options.fileType === 'png' ? 'png' : 'jpg';
	const fileSizeBytes = Number(options.fileSizeBytes) || 0;
	const useAdaptive = options.adaptive !== false;

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

				img.onload = () => {
					let width = img.width;
					let height = img.height;

					let quality;
					let maxSide;
					if (useAdaptive) {
						const resolved = resolveCompressOptions(fileSizeBytes, width, height);
						maxSide = resolved.maxSide;
						quality = resolved.quality;
					} else {
						quality = Math.min(
							1,
							Math.max(0.1, Number(options.quality) ?? DEFAULT_COMPRESS_QUALITY)
						);
						maxSide = Number(options.maxSide) || DEFAULT_MAX_SIDE;
					}

					const longest = Math.max(width, height);

					if (longest > maxSide) {
						const scale = maxSide / longest;
						width = Math.round(width * scale);
						height = Math.round(height * scale);
					}

					// 离屏导出无需 DPR，避免输出分辨率虚高导致压缩效果差
					canvas.width = width;
					canvas.height = height;
					ctx.setTransform(1, 0, 0, 1, 0, 0);
					ctx.clearRect(0, 0, width, height);
					ctx.drawImage(img, 0, 0, width, height);

					const exportOptions = {
						canvas,
						destWidth: width,
						destHeight: height,
						fileType,
						quality: fileType === 'jpg' ? quality : undefined,
						success: (fileRes) => resolve(fileRes.tempFilePath),
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
	});
};
