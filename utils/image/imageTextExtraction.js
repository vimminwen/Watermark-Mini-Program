import { parseTextTransformationSubmit, resolveAiLogText } from '@/utils/ai/aiLog.js';

export const IMAGE_TO_TEXT_FUNCTION_TYPE = 'IMAGE_TO_TEXT';

/** 构建图片转文字请求体 */
export const buildImageTextExtractionPayload = (imageUrl) => ({
	functionType: IMAGE_TO_TEXT_FUNCTION_TYPE,
	image: imageUrl
});

/** 从提交接口响应中解析识别文本 */
export const resolveImageTextFromBody = (body) => resolveAiLogText(body);

/** 提交后解析：有效文本直接返回；占位 text 时返回 aiLogId 供轮询 */
export const parseImageTextSubmit = (body) => parseTextTransformationSubmit(body);
