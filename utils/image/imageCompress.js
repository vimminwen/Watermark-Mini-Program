const DEFAULT_MAX_SIDE = 1920;

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
	const quality = Math.min(1, Math.max(0.1, Number(options.quality) ?? 0.7));
	const maxSide = Number(options.maxSide) || DEFAULT_MAX_SIDE;
	const fileType = options.fileType === 'png' ? 'png' : 'jpg';

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
					const longest = Math.max(width, height);

					if (longest > maxSide) {
						const scale = maxSide / longest;
						width = Math.round(width * scale);
						height = Math.round(height * scale);
					}

					const dpr = uni.getSystemInfoSync().pixelRatio || 2;
					canvas.width = width * dpr;
					canvas.height = height * dpr;
					ctx.setTransform(1, 0, 0, 1, 0, 0);
					ctx.scale(dpr, dpr);
					ctx.clearRect(0, 0, width, height);
					ctx.drawImage(img, 0, 0, width, height);

					const exportOptions = {
						canvas,
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
