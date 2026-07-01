/** 接口固定功能类型 */
export const REMOVE_WATERMARK_FUNCTION_TYPE = '图片去水印';

/** 构建图片去水印请求体 */
export const buildRemoveWatermarkPayload = (url) => ({
	url,
	functionType: REMOVE_WATERMARK_FUNCTION_TYPE
});
