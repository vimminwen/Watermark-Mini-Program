/** 登录态相关本地缓存键（与 request / session 共用，避免循环依赖） */
export const AUTH_STORAGE_KEYS = [
	'token',
	'userInfo',
	'userInfoStorage',
	'userIdStorage',
	'userVipInfoStorage',
	'userPhoneNumberStorage',
	'openIdStorage',
	'sessionKeyStorage'
]

export const clearAuthStorage = () => {
	AUTH_STORAGE_KEYS.forEach((key) => {
		try {
			uni.removeStorageSync(key)
		} catch (e) {
			console.warn('[clearAuthStorage]', key, e)
		}
	})
}

export const getStoredToken = () => {
	const token = uni.getStorageSync('token')
	if (token === undefined || token === null) return ''
	return String(token).trim()
}

export const hasStoredToken = () => getStoredToken().length > 0
