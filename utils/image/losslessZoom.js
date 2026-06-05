/** 接口固定功能类型 */
export const LOSSLESS_ZOOM_FUNCTION_TYPE = '无损放大';

/** 放大倍数选项（与 imageUpscale.js 保持一致，后端接口恢复时可复用） */
export const ZOOM_SCALE_OPTIONS = [
	{ value: 1, label: '1×' },
	{ value: 1.5, label: '1.5×' },
	{ value: 2, label: '2×' },
	{ value: 3, label: '3×' },
	{ value: 4, label: '4×' },
	{ value: 5, label: '5×' },
	{ value: 6, label: '6×' },
	{ value: 8, label: '8×' }
];

/** 构建无损放大提交请求体 */
export const buildLosslessZoomPayload = (url, srNum) => ({
	url,
	functionType: LOSSLESS_ZOOM_FUNCTION_TYPE,
	srNum: String(srNum)
});
