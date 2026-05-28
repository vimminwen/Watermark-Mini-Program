import { parseTextTransformationSubmit, resolveAiLogText } from '@/utils/ai/aiLog.js'

export const VIDEO_TO_TEXT_FUNCTION_TYPE = 'VIDEO_TO_TEXT'
export const AUDIO_TO_TEXT_FUNCTION_TYPE = 'AUDIO_TO_TEXT'

/** 构建音视频转文字请求体（接口字段均为 videoUrl） */
export const buildMediaTextExtractionPayload = (mediaUrl, functionType) => ({
	functionType,
	videoUrl: mediaUrl
})

export const buildVideoTextExtractionPayload = (mediaUrl) =>
	buildMediaTextExtractionPayload(mediaUrl, VIDEO_TO_TEXT_FUNCTION_TYPE)

export const buildAudioTextExtractionPayload = (mediaUrl) =>
	buildMediaTextExtractionPayload(mediaUrl, AUDIO_TO_TEXT_FUNCTION_TYPE)

export const resolveMediaTextFromBody = (body) => resolveAiLogText(body)

export const parseMediaTextSubmit = (body) => parseTextTransformationSubmit(body)

// 兼容旧引用
export { parseMediaTextSubmit as parseVideoTextSubmit }
