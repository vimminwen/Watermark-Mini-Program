import { resolveAiLogResultUrl } from '@/utils/ai/aiLog.js';

/** 水印位置选项 */
export const WATERMARK_POSITIONS = [
	{ value: 'topLeft', label: '左上' },
	{ value: 'topRight', label: '右上' },
	{ value: 'center', label: '居中' },
	{ value: 'bottomLeft', label: '左下' },
	{ value: 'bottomRight', label: '右下' }
];

export const WATERMARK_COLORS = [
	'#ffffff',
	'#000000',
	'#8c8c8c',
	'#ff4d4f',
	'#fa8c16',
	'#ffd700',
	'#fee140',
	'#52c41a',
	'#13c2c2',
	'#4facfe',
	'#722ed1',
	'#eb2f96'
];

export const DEFAULT_WATERMARK_OPTIONS = {
	text: '',
	position: 'bottomRight',
	opacity: 60,
	fontSize: 32,
	color: '#ffffff',
	offsetX: 24,
	offsetY: 24,
	outputFormat: 'jpg'
};

/** 图片加水印仅支持 JPG / PNG */
export const ALLOWED_WATERMARK_IMAGE_FORMATS = ['jpg', 'png']

const formatFromPathOrName = (path = '', file = {}) => {
	const name = String(file.name || file.path || path || '')
	const match = /\.(jpe?g|png)(\?.*)?$/i.exec(name)
	if (!match) return ''
	return match[1].toLowerCase().startsWith('jp') ? 'jpg' : 'png'
}

const formatFromMime = (file = {}) => {
	const mime = String(file.type || file.fileType || '').toLowerCase()
	if (mime.includes('png')) return 'png'
	if (mime.includes('jpeg') || mime.includes('jpg')) return 'jpg'
	return ''
}

/** 读取文件头判断 JPG / PNG */
export const detectWatermarkImageFormat = (filePath) =>
	new Promise((resolve) => {
		if (!filePath) {
			resolve('')
			return
		}

		uni.getFileSystemManager().readFile({
			filePath,
			length: 8,
			success: (res) => {
				const buffer = res.data
				if (!buffer) {
					resolve('')
					return
				}
				const bytes = buffer instanceof ArrayBuffer ? new Uint8Array(buffer) : new Uint8Array()
				if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xd8) {
					resolve('jpg')
					return
				}
				if (
					bytes.length >= 8 &&
					bytes[0] === 0x89 &&
					bytes[1] === 0x50 &&
					bytes[2] === 0x4e &&
					bytes[3] === 0x47
				) {
					resolve('png')
					return
				}
				resolve('')
			},
			fail: () => resolve('')
		})
	})

/** 校验并返回 jpg / png，不支持则抛错 */
export const validateWatermarkImageFile = async (filePath, file = {}) => {
	let format = formatFromPathOrName(filePath, file) || formatFromMime(file)
	if (!format) {
		format = await detectWatermarkImageFormat(filePath)
	}
	if (!ALLOWED_WATERMARK_IMAGE_FORMATS.includes(format)) {
		throw new Error('仅支持 JPG / PNG 图片')
	}
	return format
}

/** 透明度：UI 为 0~100，接口为 0.0~1.0 */
export const normalizeWatermarkOpacity = (value, fallback = 0.6) => {
	const num = Number(value)
	if (Number.isNaN(num)) return fallback
	const alpha = num > 1 ? num / 100 : num
	return Math.max(0.05, Math.min(1, Math.round(alpha * 100) / 100))
}

/**
 * 计算 aspectFit 下图片在容器内的显示区域
 */
export const calcAspectFitImageRect = (containerWidth, containerHeight, imageWidth, imageHeight) => {
	const cw = Number(containerWidth) || 0
	const ch = Number(containerHeight) || 0
	const iw = Number(imageWidth) || 0
	const ih = Number(imageHeight) || 0
	if (!cw || !ch || !iw || !ih) {
		return { left: 0, top: 0, width: cw, height: ch, scale: 1 }
	}
	const scale = Math.min(cw / iw, ch / ih)
	const width = iw * scale
	const height = ih * scale
	return {
		left: (cw - width) / 2,
		top: (ch - height) / 2,
		width,
		height,
		scale
	}
}

/** 图片加水印字号范围（相对原图像素） */
export const WATERMARK_FONT_SIZE_MIN = 32
export const WATERMARK_FONT_SIZE_MAX = 200

/** 小程序 text 组件约 12px 以下不再缩小，预览需用 scale 补偿 */
const MIN_PREVIEW_TEXT_PX = 12

const clampWatermarkFontSize = (value) =>
	Math.max(
		WATERMARK_FONT_SIZE_MIN,
		Math.min(WATERMARK_FONT_SIZE_MAX, Math.round(Number(value) || DEFAULT_WATERMARK_OPTIONS.fontSize))
	)

/** 预览区字号：小于 12px 时用 transform scale 保持与导出比例一致 */
const resolvePreviewFontMetrics = (scaledPx) => {
	const px = Number(scaledPx) || 0
	if (px <= 0) {
		return { fontSize: MIN_PREVIEW_TEXT_PX, fontScale: 1 }
	}
	if (px >= MIN_PREVIEW_TEXT_PX) {
		return { fontSize: Math.round(px), fontScale: 1 }
	}
	return {
		fontSize: MIN_PREVIEW_TEXT_PX,
		fontScale: px / MIN_PREVIEW_TEXT_PX
	}
}

const appendTransform = (base, extra) => {
	if (!extra) return base || 'none'
	if (!base) return extra
	return `${base} ${extra}`
}

/**
 * 计算水印在原始图片上的绘制参数（与 Canvas 导出一致）
 */
export const calcWatermarkDrawParams = (imageWidth, imageHeight, options = {}) => {
	const iw = Number(imageWidth) || 0
	const ih = Number(imageHeight) || 0
	const fs = clampWatermarkFontSize(options.fontSize)
	const ox = Math.round(Number(options.offsetX) || 0)
	const oy = Math.round(Number(options.offsetY) || 0)
	const position = options.position || DEFAULT_WATERMARK_OPTIONS.position
	const color = options.color || DEFAULT_WATERMARK_OPTIONS.color
	const alpha = normalizeWatermarkOpacity(options.opacity)
	const text = String(options.text || '').trim()

	let x = ox
	let y = oy
	let textAlign = 'left'
	let textBaseline = 'top'

	switch (position) {
		case 'topRight':
			x = iw - ox
			y = oy
			textAlign = 'right'
			textBaseline = 'top'
			break
		case 'center':
			x = iw / 2 + ox
			y = ih / 2 + oy
			textAlign = 'center'
			textBaseline = 'middle'
			break
		case 'bottomLeft':
			x = ox
			y = ih - oy
			textAlign = 'left'
			textBaseline = 'bottom'
			break
		case 'bottomRight':
			x = iw - ox
			y = ih - oy
			textAlign = 'right'
			textBaseline = 'bottom'
			break
		case 'topLeft':
		default:
			x = ox
			y = oy
			textAlign = 'left'
			textBaseline = 'top'
			break
	}

	return { x, y, fontSize: fs, color, alpha, textAlign, textBaseline, text }
}

/**
 * 本地实时预览水印样式（与 Canvas 导出同一套坐标）
 */
export const buildWatermarkPreviewStyle = (options = {}) => {
	const {
		containerWidth = 0,
		containerHeight = 0,
		imageWidth = 0,
		imageHeight = 0,
		text = '',
		...rest
	} = options

	const rect = calcAspectFitImageRect(containerWidth, containerHeight, imageWidth, imageHeight)
	const scale = rect.scale || 1
	const params = calcWatermarkDrawParams(imageWidth, imageHeight, { ...rest, text })
	const scaledPx = params.fontSize * scale
	const { fontSize: previewFontPx, fontScale } = resolvePreviewFontMetrics(scaledPx)
	const scaleTransform = fontScale < 1 ? `scale(${fontScale})` : ''

	const base = {
		position: 'absolute',
		fontSize: `${previewFontPx}px`,
		color: params.color,
		opacity: params.alpha,
		fontWeight: '600',
		lineHeight: 1.2,
		whiteSpace: 'nowrap',
		pointerEvents: 'none',
		zIndex: 2,
		maxWidth: `${Math.max(0, rect.width - 16)}px`,
		overflow: 'visible',
		textOverflow: 'clip'
	}

	const px = rect.left + params.x * scale
	const py = rect.top + params.y * scale

	if (params.textAlign === 'center') {
		return {
			...base,
			left: `${px}px`,
			top: `${py}px`,
			transform: appendTransform('translate(-50%, -50%)', scaleTransform),
			transformOrigin: 'center center',
			textAlign: 'center'
		}
	}

	if (params.textAlign === 'right' && params.textBaseline === 'bottom') {
		return {
			...base,
			left: `${px}px`,
			top: `${py}px`,
			transform: appendTransform('translate(-100%, -100%)', scaleTransform),
			transformOrigin: 'right bottom'
		}
	}

	if (params.textAlign === 'right') {
		return {
			...base,
			left: `${px}px`,
			top: `${py}px`,
			transform: appendTransform('translateX(-100%)', scaleTransform),
			transformOrigin: 'right top'
		}
	}

	if (params.textBaseline === 'bottom') {
		return {
			...base,
			left: `${px}px`,
			top: `${py}px`,
			transform: appendTransform('translateY(-100%)', scaleTransform),
			transformOrigin: 'left bottom'
		}
	}

	return {
		...base,
		left: `${px}px`,
		top: `${py}px`,
		transform: scaleTransform || 'none',
		transformOrigin: 'left top'
	}
}

/** Canvas 导出最长边上限（微信小程序 buffer 限制） */
const MAX_WATERMARK_EXPORT_SIDE = 4096

/**
 * 使用 Canvas 2D 本地合成水印（与预览坐标一致，避免服务端基线偏差）
 */
export const exportImageWithWatermark = (
	canvasSelector,
	imagePath,
	options = {},
	componentInstance
) =>
	new Promise((resolve, reject) => {
		if (!imagePath) {
			reject(new Error('图片路径为空'))
			return
		}

		const text = String(options.text || '').trim()
		if (!text) {
			reject(new Error('水印文字为空'))
			return
		}

		const outputFormat = ALLOWED_WATERMARK_IMAGE_FORMATS.includes(options.outputFormat)
			? options.outputFormat
			: 'jpg'

		const query = uni.createSelectorQuery()
		const scope = componentInstance?.proxy ?? componentInstance
		if (scope) query.in(scope)

		query
			.select(canvasSelector)
			.fields({ node: true, size: true })
			.exec((res) => {
				const canvas = res?.[0]?.node
				if (!canvas) {
					reject(new Error('Canvas 未初始化'))
					return
				}

				const ctx = canvas.getContext('2d')
				const img = canvas.createImage()

				img.onload = () => {
					let width = img.width
					let height = img.height
					if (!width || !height) {
						reject(new Error('图片尺寸无效'))
						return
					}

					const maxSide = Math.max(width, height)
					if (maxSide > MAX_WATERMARK_EXPORT_SIDE) {
						const scale = MAX_WATERMARK_EXPORT_SIDE / maxSide
						width = Math.round(width * scale)
						height = Math.round(height * scale)
					}

					canvas.width = width
					canvas.height = height
					ctx.setTransform(1, 0, 0, 1, 0, 0)
					ctx.imageSmoothingEnabled = true
					ctx.imageSmoothingQuality = 'high'
					ctx.clearRect(0, 0, width, height)
					ctx.drawImage(img, 0, 0, width, height)

					const params = calcWatermarkDrawParams(width, height, { ...options, text })
					ctx.save()
					ctx.font = `600 ${params.fontSize}px sans-serif`
					ctx.fillStyle = params.color
					ctx.globalAlpha = params.alpha
					ctx.textAlign = params.textAlign
					ctx.textBaseline = params.textBaseline
					ctx.fillText(params.text, params.x, params.y)
					ctx.restore()

					const doExport = (fileType = outputFormat === 'png' ? 'png' : 'jpg') => {
						const exportOptions = {
							canvas,
							x: 0,
							y: 0,
							width,
							height,
							destWidth: width,
							destHeight: height,
							fileType,
							quality: fileType === 'png' ? 1 : 0.92,
							success: (fileRes) => resolve(fileRes.tempFilePath),
							fail: (err) => {
								if (fileType === 'png') {
									doExport('jpg')
									return
								}
								reject(err)
							}
						}

						if (scope) {
							uni.canvasToTempFilePath(exportOptions, scope)
						} else {
							uni.canvasToTempFilePath(exportOptions)
						}
					}

					// 等待绘制完成后再导出，避免 convert native buffer 失败
					if (typeof requestAnimationFrame === 'function') {
						requestAnimationFrame(() => requestAnimationFrame(doExport))
					} else {
						setTimeout(doExport, 32)
					}
				}

				img.onerror = () => reject(new Error('图片加载失败'))
				img.src = imagePath
			})
	})

/** 图片加水印接口固定 appId */
export const IMAGE_WATERMARK_APP_ID = 'wx97e66d5fd8999a93'

/** 获取小程序 appId（PDF 加水印等复用） */
export const getWatermarkAppId = () => IMAGE_WATERMARK_APP_ID

/** 构建图片加水印请求体 */
export const buildAddWatermarkPayload = (imageUrl, options = {}) => {
	const merged = { ...DEFAULT_WATERMARK_OPTIONS, ...options }
	return {
		appId: IMAGE_WATERMARK_APP_ID,
		imageUrl,
		outputFormat: ALLOWED_WATERMARK_IMAGE_FORMATS.includes(merged.outputFormat)
			? merged.outputFormat
			: 'jpg',
		text: String(merged.text || '').trim(),
		position: merged.position || DEFAULT_WATERMARK_OPTIONS.position,
		opacity: normalizeWatermarkOpacity(
			merged.opacity,
			normalizeWatermarkOpacity(DEFAULT_WATERMARK_OPTIONS.opacity)
		),
		fontSize: clampWatermarkFontSize(merged.fontSize),
		color: merged.color || DEFAULT_WATERMARK_OPTIONS.color,
		offsetX: Math.round(Number(merged.offsetX) || 0),
		offsetY: Math.round(Number(merged.offsetY) || 0)
	}
}

/** 从接口响应中解析结果图片地址 */
export const resolveAddWatermarkResultUrl = (body) => resolveAiLogResultUrl(body)

/** base64 结果写入临时文件 */
export const writeBase64ImageToTemp = (base64Data) =>
	new Promise((resolve, reject) => {
		const raw = String(base64Data || '').trim()
		if (!raw) {
			reject(new Error('无效的图片数据'))
			return
		}

		const commaIdx = raw.indexOf(',')
		const base64 = commaIdx >= 0 ? raw.slice(commaIdx + 1) : raw
		const ext = /png/i.test(raw) ? 'png' : 'jpg'
		const userDataPath =
			(typeof wx !== 'undefined' && wx.env?.USER_DATA_PATH) ||
			(typeof uni !== 'undefined' && uni.env?.USER_DATA_PATH) ||
			''
		if (!userDataPath) {
			reject(new Error('当前环境不支持写入临时文件'))
			return
		}
		const filePath = `${userDataPath}/watermark_${Date.now()}.${ext}`

		uni.getFileSystemManager().writeFile({
			filePath,
			data: base64,
			encoding: 'base64',
			success: () => resolve(filePath),
			fail: (err) => reject(err)
		})
	})

/** 解析加水印结果（URL 或 base64） */
export const resolveAddWatermarkResult = async (body) => {
	const url = resolveAddWatermarkResultUrl(body)
	if (url) return url

	const data = body?.data
	if (typeof data === 'string') {
		const trimmed = data.trim()
		if (/^https?:\/\//i.test(trimmed)) return trimmed
		if (trimmed.startsWith('data:image') || trimmed.length > 128) {
			return writeBase64ImageToTemp(trimmed)
		}
	}

	if (data && typeof data === 'object') {
		const nested = data.imageUrl ?? data.url ?? data.resultUrl ?? data.content
		if (typeof nested === 'string' && /^https?:\/\//i.test(nested)) return nested
		if (typeof nested === 'string' && nested.length > 128) {
			return writeBase64ImageToTemp(nested)
		}
	}

	return ''
}
