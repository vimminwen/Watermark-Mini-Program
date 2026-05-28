/**
 * 微信小程序隐私合规相关 API
 *
 * manifest 中 mp-weixin.__usePrivacyCheck__ 为 true 时，选图/手机号等接口均须在
 * 公众平台「用户隐私保护指引」声明对应项，否则全站选图、上传都会报 errno 112。
 * 未在后台配置完成前，请勿开启 __usePrivacyCheck__。
 */

const isWx = () => typeof wx !== 'undefined'

/** errno 112：后台「用户隐私保护指引」未声明对应接口（如手机号） */
export const isPrivacyScopeNotDeclared = (detail = {}) => {
	const errMsg = String(detail.errMsg || '')
	const errno = detail.errno
	return errno === 112 || /scope is not declared|未在隐私协议|未声明/i.test(errMsg)
}

export const isPrivacyAuthorizeOk = (errMsg = '') =>
	String(errMsg).includes('agreePrivacyAuthorization:ok')

/** 查询是否需要弹出隐私授权 */
export const getPrivacySetting = () =>
	new Promise((resolve) => {
		if (!isWx() || !wx.getPrivacySetting) {
			resolve({ needAuthorization: false, privacyContractName: '' })
			return
		}
		wx.getPrivacySetting({
			success: (res) =>
				resolve({
					needAuthorization: !!res?.needAuthorization,
					privacyContractName: res?.privacyContractName || '《用户隐私保护指引》'
				}),
			fail: () => resolve({ needAuthorization: false, privacyContractName: '' })
		})
	})

/** 打开微信隐私协议页 */
export const openPrivacyContract = () =>
	new Promise((resolve) => {
		if (!isWx() || !wx.openPrivacyContract) {
			resolve(false)
			return
		}
		wx.openPrivacyContract({
			success: () => resolve(true),
			fail: () => resolve(false)
		})
	})

/** 后台未声明手机号时的说明（需运营在 mp 后台配置，代码无法绕过） */
export const showPrivacyScopeNotDeclaredModal = () => {
	uni.showModal({
		title: '暂无法获取手机号',
		content:
			'当前小程序在微信公众平台尚未声明「手机号」用途。\n\n请管理员登录 mp.weixin.qq.com → 设置 → 用户隐私保护指引，添加「手机号」并填写用途（如：快捷登录），保存并重新编译后再试。',
		showCancel: false,
		confirmText: '我知道了'
	})
}

/** 后台未声明相册/选图时的说明 */
export const showMediaPrivacyScopeNotDeclaredModal = () => {
	uni.showModal({
		title: '暂无法选择图片',
		content:
			'当前小程序尚未在微信公众平台声明「选中的照片或视频信息」。\n\n请管理员登录 mp.weixin.qq.com → 设置 → 用户隐私保护指引，添加该项并填写用途（如：图片处理），保存并重新编译后再试。',
		showCancel: false,
		confirmText: '我知道了'
	})
}

/** 用户点击选图/拍照前，先走微信隐私授权（须在 tap 回调里调用） */
export const requirePrivacyAuthorize = () =>
	new Promise((resolve, reject) => {
		if (!isWx() || !wx.requirePrivacyAuthorize) {
			resolve(true)
			return
		}
		wx.requirePrivacyAuthorize({
			success: () => resolve(true),
			fail: (err) => reject(err || new Error('未同意隐私协议'))
		})
	})

export const isUserCancelError = (err) =>
	/cancel|取消|deny|拒绝/i.test(String(err?.errMsg || err?.message || ''))
