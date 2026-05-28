const MAX_EXPORT_SIDE = 1200;

/**
 * 使用 Canvas 2D 导出带滤镜的图片
 * @param {string} canvasSelector - 如 '#exportCanvas'
 * @param {string} imagePath - 本地图片路径
 * @param {string} filterCss - CSS filter 字符串
 * @param {object} componentInstance - getCurrentInstance()，用于 createSelectorQuery().in()
 */
export const exportImageWithFilter = (canvasSelector, imagePath, filterCss, componentInstance) => {
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
					const maxSide = Math.max(width, height);

					if (maxSide > MAX_EXPORT_SIDE) {
						const scale = MAX_EXPORT_SIDE / maxSide;
						width = Math.round(width * scale);
						height = Math.round(height * scale);
					}

					const dpr = uni.getSystemInfoSync().pixelRatio || 2;
					canvas.width = width * dpr;
					canvas.height = height * dpr;
					ctx.setTransform(1, 0, 0, 1, 0, 0);
					ctx.scale(dpr, dpr);
					ctx.clearRect(0, 0, width, height);
					ctx.filter = filterCss && filterCss !== 'none' ? filterCss : 'none';
					ctx.drawImage(img, 0, 0, width, height);

					const options = {
						canvas,
						fileType: 'jpg',
						quality: 0.92,
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
};
