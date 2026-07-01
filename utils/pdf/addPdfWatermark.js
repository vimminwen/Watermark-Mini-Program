import { IMAGE_WATERMARK_APP_ID } from '@/utils/image/addWatermark.js';
import { resolveAiLogResultUrl } from '@/utils/ai/aiLog.js';

/** PDF 加水印接口固定 appId */
export const PDF_WATERMARK_APP_ID = IMAGE_WATERMARK_APP_ID

/** PDF 水印位置（接口 position 字段） */
export const PDF_WATERMARK_POSITIONS = [
	{ value: 'top-left', label: '左上' },
	{ value: 'top-center', label: '上中' },
	{ value: 'top-right', label: '右上' },
	{ value: 'left-center', label: '左中' },
	{ value: 'center', label: '居中' },
	{ value: 'right-center', label: '右中' },
	{ value: 'bottom-left', label: '左下' },
	{ value: 'bottom-center', label: '下中' },
	{ value: 'bottom-right', label: '右下' },
	{ value: 'tile', label: '平铺' }
]

/** 历史/别名 → 接口标准值 */
const PDF_WATERMARK_POSITION_ALIASES = {
	'center-left': 'left-center',
	'center-right': 'right-center'
}

export const PDF_WATERMARK_POSITION_VALUES = PDF_WATERMARK_POSITIONS.map((item) => item.value)

/** PDF 水印字号范围 */
export const PDF_WATERMARK_FONT_SIZE_MIN = 11
export const PDF_WATERMARK_FONT_SIZE_MAX = 100

export const DEFAULT_PDF_WATERMARK_OPTIONS = {
	text: '',
	watermarkImageUrl: '',
	fontSize: 36,
	opacity: 0.5,
	scale: 0.5,
	position: 'tile'
}

const clampPdfFontSize = (value) =>
	Math.max(
		PDF_WATERMARK_FONT_SIZE_MIN,
		Math.min(
			PDF_WATERMARK_FONT_SIZE_MAX,
			Math.round(Number(value) || DEFAULT_PDF_WATERMARK_OPTIONS.fontSize)
		)
	)

export { clampPdfFontSize }

const clamp01 = (value, fallback = 0.5) => {
	const num = Number(value)
	if (Number.isNaN(num)) return fallback
	return Math.max(0.05, Math.min(1, num))
};

/** 构建 PDF 加水印请求体 */
export const buildAddPdfWatermarkPayload = (pdfUrl, options = {}) => {
	const merged = { ...DEFAULT_PDF_WATERMARK_OPTIONS, ...options }
	const payload = {
		appId: PDF_WATERMARK_APP_ID,
		pdfUrl,
		pdfBase64: '',
		text: String(merged.text || '').trim(),
		fontSize: clampPdfFontSize(merged.fontSize),
		opacity: clamp01(merged.opacity, DEFAULT_PDF_WATERMARK_OPTIONS.opacity),
		scale: clamp01(merged.scale, DEFAULT_PDF_WATERMARK_OPTIONS.scale),
		position: (() => {
			const raw = String(merged.position || '').trim()
			const normalized = PDF_WATERMARK_POSITION_ALIASES[raw] || raw
			return PDF_WATERMARK_POSITION_VALUES.includes(normalized)
				? normalized
				: DEFAULT_PDF_WATERMARK_OPTIONS.position
		})()
	}

	const imageUrl = String(merged.watermarkImageUrl || '').trim()
	if (imageUrl) {
		payload.watermarkImageUrl = imageUrl
	}

	return payload
}

/** 解析 PDF 加水印结果 URL */
export const resolveAddPdfWatermarkResultUrl = (body) => {
	if (!body || typeof body !== 'object') return ''

	const data = body.data ?? body.result ?? body
	if (typeof data === 'string' && /^https?:\/\//i.test(data.trim())) {
		return data.trim()
	}

	if (data && typeof data === 'object') {
		const url =
			data.pdfUrl ??
			data.url ??
			data.resultUrl ??
			data.outputUrl ??
			data.fileUrl ??
			''
		if (typeof url === 'string' && /^https?:\/\//i.test(url.trim())) {
			return url.trim()
		}
	}

	return resolveAiLogResultUrl(body)
}
