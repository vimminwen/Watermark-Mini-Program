import {
	isPrivacyScopeNotDeclared,
	isUserCancelError,
	showMediaPrivacyScopeNotDeclaredModal
} from '@/utils/wx/privacy.js'

/**
 * 选择本地图片（微信端优先 chooseMedia）
 * 说明：若在 manifest 开启 __usePrivacyCheck__，须在 mp 后台隐私指引声明「选中的照片或视频信息」
 * @returns {Promise<{ path: string, size: number, width: number, height: number }>}
 */
export const pickLocalImage = async (options = {}) => {
	const count = options.count ?? 1
	const maxSize = options.maxSize ?? 0
	const sourceType = options.sourceType ?? ['album', 'camera']

	return new Promise((resolve, reject) => {
		const finish = (path, fileMeta = {}) => {
			if (!path) {
				reject(new Error('未选择图片'))
				return
			}
			const size = Number(fileMeta.size) || 0
			if (maxSize > 0 && size > maxSize) {
				reject(new Error(`图片请小于 ${Math.round(maxSize / 1024 / 1024)}MB`))
				return
			}
			resolve({
				path,
				size,
				width: Number(fileMeta.width) || 0,
				height: Number(fileMeta.height) || 0
			})
		}

		const onFail = (err) => {
			console.warn('[pickLocalImage] fail:', err)
			reject(err || new Error('选择图片失败'))
		}

		// #ifdef MP-WEIXIN
		if (typeof uni.chooseMedia === 'function') {
			uni.chooseMedia({
				count,
				mediaType: ['image'],
				sourceType,
				success: (res) => {
					const file = res.tempFiles?.[0]
					finish(file?.tempFilePath, file)
				},
				fail: onFail
			})
			return
		}
		// #endif

		uni.chooseImage({
			count,
			sizeType: options.sizeType ?? ['compressed', 'original'],
			sourceType,
			success: (res) => {
				finish(res.tempFilePaths?.[0], res.tempFiles?.[0] || {})
			},
			fail: onFail
		})
	})
}

/** 选图失败时的用户提示 */
export const handlePickLocalImageError = (err) => {
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
		title: msg.replace(/^choose(Image|Media):fail\s*/i, '') || '选择图片失败',
		icon: 'none'
	})
}
