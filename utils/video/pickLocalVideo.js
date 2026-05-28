import {
	isPrivacyScopeNotDeclared,
	isUserCancelError,
	showMediaPrivacyScopeNotDeclaredModal
} from '@/utils/wx/privacy.js'

const DEFAULT_MAX_SIZE = 100 * 1024 * 1024
const DEFAULT_MAX_DURATION = 60

/**
 * 选择本地视频
 * @returns {Promise<{ path: string, thumbPath: string, size: number, width: number, height: number, duration: number }>}
 */
export const pickLocalVideo = (options = {}) => {
	const maxSize = options.maxSize ?? DEFAULT_MAX_SIZE
	const maxDuration = options.maxDuration ?? DEFAULT_MAX_DURATION

	return new Promise((resolve, reject) => {
		const finish = (file) => {
			const path = file?.tempFilePath
			if (!path) {
				reject(new Error('未选择视频'))
				return
			}
			const size = Number(file.size) || 0
			if (maxSize > 0 && size > maxSize) {
				reject(new Error(`视频请小于 ${Math.round(maxSize / 1024 / 1024)}MB`))
				return
			}
			resolve({
				path,
				thumbPath: file.thumbTempFilePath || '',
				size,
				width: Number(file.width) || 0,
				height: Number(file.height) || 0,
				duration: Math.round(Number(file.duration) || 0)
			})
		}

		const onFail = (err) => {
			console.warn('[pickLocalVideo] fail:', err)
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
					duration: res.duration
				}),
			fail: onFail
		})
	})
}

export const handlePickLocalVideoError = (err) => {
	if (isUserCancelError(err)) return

	if (isPrivacyScopeNotDeclared(err)) {
		showMediaPrivacyScopeNotDeclaredModal()
		return
	}

	const msg = String(err?.errMsg || err?.message || '')
	if (/auth|authorize|permission/i.test(msg)) {
		uni.showModal({
			title: '需要相册/相机权限',
			content: '请在小程序设置中允许访问相册和相机',
			confirmText: '去设置',
			success: (res) => {
				if (res.confirm) uni.openSetting()
			}
		})
		return
	}

	uni.showToast({
		title: msg.replace(/^choose(Video|Media):fail\s*/i, '') || '选择视频失败',
		icon: 'none'
	})
}
