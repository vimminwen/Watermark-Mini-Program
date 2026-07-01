import {
	isPrivacyScopeNotDeclared,
	isUserCancelError,
	showMediaPrivacyScopeNotDeclaredModal
} from '@/utils/wx/privacy.js'
import {
	isVideoWithinRemovePixelLimit,
	getVideoRemovePixelLimitMessage
} from '@/utils/video/subtitleRemoval.js'
import { beforeUploadCheck } from '@/utils/user/auth.js'

/** 音视频转文字：最长时长（秒） */
export const TEXT_MEDIA_MAX_DURATION = 45

export const TEXT_MEDIA_MAX_SIZE = 100 * 1024 * 1024

const AUDIO_EXTENSIONS = ['.mp3', '.m4a', '.wav', '.aac', '.amr', '.flac', '.ogg']

const rejectIfOverDuration = (duration, maxDuration) => {
	const seconds = Math.ceil(Number(duration) || 0)
	if (seconds > maxDuration) {
		throw new Error(`时长不能超过 ${maxDuration} 秒（当前约 ${seconds} 秒）`)
	}
	return seconds
}

const rejectIfOverPixels = (width, height) => {
	const w = Math.round(Number(width) || 0)
	const h = Math.round(Number(height) || 0)
	if (w && h && !isVideoWithinRemovePixelLimit(w, h)) {
		throw new Error(getVideoRemovePixelLimitMessage(w, h))
	}
}

const getVideoInfoSafe = (src) =>
	new Promise((resolve) => {
		if (!src || typeof uni.getVideoInfo !== 'function') {
			resolve(null)
			return
		}
		uni.getVideoInfo({
			src,
			success: (info) => resolve(info),
			fail: () => resolve(null)
		})
	})

const resolveVideoDimensions = async (path, width, height) => {
	let w = Math.round(Number(width) || 0)
	let h = Math.round(Number(height) || 0)
	if (w && h) return { width: w, height: h }
	const info = await getVideoInfoSafe(path)
	w = Math.round(Number(info?.width) || 0)
	h = Math.round(Number(info?.height) || 0)
	return { width: w, height: h }
}

/** 获取本地音频时长（秒） */
export const getLocalAudioDuration = (filePath) =>
	new Promise((resolve) => {
		if (!filePath) {
			resolve(0)
			return
		}
		const ctx = uni.createInnerAudioContext()
		ctx.src = filePath
		let settled = false
		const done = (value) => {
			if (settled) return
			settled = true
			try {
				ctx.destroy()
			} catch (e) {
				// ignore
			}
			resolve(value)
		}
		ctx.onCanplay(() => {
			setTimeout(() => done(Math.ceil(ctx.duration || 0)), 120)
		})
		ctx.onError(() => done(0))
		setTimeout(() => done(Math.ceil(ctx.duration || 0)), 3000)
	})

/**
 * 选择视频（转文字）
 * @returns {Promise<{ path, thumbPath, size, width, height, duration, mediaType: 'video', name: string }>}
 */
export const pickLocalVideoForText = async (options = {}) => {
	if (!options.skipUploadGuard) {
		const allowed = await beforeUploadCheck()
		if (!allowed) {
			const err = new Error('UPLOAD_AUTH_DENIED')
			err.code = 'UPLOAD_AUTH_DENIED'
			throw err
		}
	}

	const maxSize = options.maxSize ?? TEXT_MEDIA_MAX_SIZE
	const maxDuration = options.maxDuration ?? TEXT_MEDIA_MAX_DURATION

	return new Promise((resolve, reject) => {
		const finish = async (file) => {
			try {
				const path = file?.tempFilePath
				if (!path) {
					reject(new Error('未选择视频'))
					return
				}
				const size = Number(file.size) || 0
				if (maxSize > 0 && size > maxSize) {
					reject(new Error(`文件请小于 ${Math.round(maxSize / 1024 / 1024)}MB`))
					return
				}
				const duration = rejectIfOverDuration(file.duration, maxDuration)
				const { width, height } = await resolveVideoDimensions(path, file.width, file.height)
				rejectIfOverPixels(width, height)
				resolve({
					path,
					thumbPath: file.thumbTempFilePath || '',
					size,
					width,
					height,
					duration,
					mediaType: 'video',
					name: file.name || '视频'
				})
			} catch (err) {
				reject(err)
			}
		}

		const onFail = (err) => {
			console.warn('[pickLocalVideoForText] fail:', err)
			reject(err || new Error('选择视频失败'))
		}

		// #ifdef MP-WEIXIN
		if (typeof uni.chooseMedia === 'function') {
			uni.chooseMedia({
				count: 1,
				mediaType: ['video'],
				sourceType: options.sourceType ?? ['album', 'camera'],
				maxDuration,
				success: (res) => finish(res.tempFiles?.[0]),
				fail: onFail
			})
			return
		}
		// #endif

		uni.chooseVideo({
			sourceType: options.sourceType ?? ['album', 'camera'],
			compressed: options.compressed !== false,
			maxDuration,
			success: (res) =>
				finish({
					tempFilePath: res.tempFilePath,
					thumbTempFilePath: res.thumbTempFilePath,
					size: res.size,
					width: res.width,
					height: res.height,
					duration: res.duration,
					name: '视频'
				}),
			fail: onFail
		})
	})
}

/**
 * 选择音频文件（转文字）
 */
export const pickLocalAudioForText = (options = {}) => {
	const maxSize = options.maxSize ?? TEXT_MEDIA_MAX_SIZE
	const maxDuration = options.maxDuration ?? TEXT_MEDIA_MAX_DURATION

	return new Promise((resolve, reject) => {
		const onFail = (err) => {
			console.warn('[pickLocalAudioForText] fail:', err)
			reject(err || new Error('选择音频失败'))
		}

		const finish = async (file) => {
			try {
				const path = file?.path || file?.tempFilePath
				if (!path) {
					reject(new Error('未选择音频'))
					return
				}
				const size = Number(file.size) || 0
				if (maxSize > 0 && size > maxSize) {
					reject(new Error(`文件请小于 ${Math.round(maxSize / 1024 / 1024)}MB`))
					return
				}
				let duration = Number(file.duration) || 0
				if (!duration) {
					duration = await getLocalAudioDuration(path)
				}
				duration = rejectIfOverDuration(duration, maxDuration)
				resolve({
					path,
					thumbPath: '',
					size,
					width: 0,
					height: 0,
					duration,
					mediaType: 'audio',
					name: file.name || '音频'
				})
			} catch (err) {
				reject(err)
			}
		}

		if (typeof uni.chooseMessageFile === 'function') {
			uni.chooseMessageFile({
				count: 1,
				type: 'file',
				extension: options.extensions ?? AUDIO_EXTENSIONS,
				success: (res) => finish(res.tempFiles?.[0]),
				fail: onFail
			})
			return
		}

		// #ifdef MP-WEIXIN
		if (typeof uni.chooseMedia === 'function') {
			uni.chooseMedia({
				count: 1,
				mediaType: ['video'],
				sourceType: ['album'],
				maxDuration,
				success: async (res) => {
					const file = res.tempFiles?.[0]
					if (!file?.tempFilePath) {
						reject(new Error('未选择音频'))
						return
					}
					const ext = /\.(\w+)$/i.exec(file.tempFilePath)?.[1]?.toLowerCase() || ''
					const audioExts = ['mp3', 'm4a', 'wav', 'aac', 'amr', 'flac', 'ogg']
					if (!audioExts.includes(ext)) {
						reject(new Error('请选择音频文件（mp3/m4a/wav 等）'))
						return
					}
					finish({
						tempFilePath: file.tempFilePath,
						size: file.size,
						duration: file.duration,
						name: `音频.${ext}`
					})
				},
				fail: onFail
			})
			return
		}
		// #endif

		reject(new Error('当前环境不支持选择音频文件'))
	})
}

/** 弹窗选择视频或音频 */
export const showPickTextMediaSheet = () =>
	new Promise((resolve, reject) => {
		uni.showActionSheet({
			itemList: ['选择视频', '选择音频'],
			success: async (res) => {
				try {
					if (res.tapIndex === 0) {
						resolve(await pickLocalVideoForText())
						return
					}
					if (res.tapIndex === 1) {
						resolve(await pickLocalAudioForText())
						return
					}
					reject(new Error('cancel'))
				} catch (err) {
					reject(err)
				}
			},
			fail: () => reject(new Error('cancel'))
		})
	})

export const handlePickTextMediaError = (err) => {
	if (err?.code === 'UPLOAD_AUTH_DENIED') return
	if (isUserCancelError(err)) return

	if (isPrivacyScopeNotDeclared(err)) {
		showMediaPrivacyScopeNotDeclaredModal()
		return
	}

	const msg = String(err?.errMsg || err?.message || '')
	if (/auth|authorize|permission/i.test(msg)) {
		uni.showModal({
			title: '需要相册/文件权限',
			content: '请在小程序设置中允许访问相册或文件',
			confirmText: '去设置',
			success: (res) => {
				if (res.confirm) uni.openSetting()
			}
		})
		return
	}

	uni.showToast({
		title: msg.replace(/^choose\w+:fail\s*/i, '') || '选择文件失败',
		icon: 'none'
	})
}
