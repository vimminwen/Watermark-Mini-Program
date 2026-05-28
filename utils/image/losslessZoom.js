/** 接口固定功能类型 */
export const LOSSLESS_ZOOM_FUNCTION_TYPE = '无损放大';

/** 放大倍数选项（srNum 传字符串） */
export const ZOOM_SCALE_OPTIONS = [
	{ value: 2, label: '2倍' },
	{ value: 3, label: '3倍' },
	{ value: 4, label: '4倍' }
];

/** 构建无损放大提交请求体 */
export const buildLosslessZoomPayload = (url, srNum) => ({
	url,
	functionType: LOSSLESS_ZOOM_FUNCTION_TYPE,
	srNum: String(srNum)
});
