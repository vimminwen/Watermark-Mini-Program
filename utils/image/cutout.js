/** 接口固定功能类型 */
export const CUTOUT_FUNCTION_TYPE = 'AI抠图';

/** 构建抠图请求体 */
export const buildCutoutPayload = (url) => ({
	url,
	functionType: CUTOUT_FUNCTION_TYPE
});
