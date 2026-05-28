import {

	ref

} from 'vue'

import {

	apiGetUserVip

} from '@/api/api.js'



/** 统一解析到期时间为毫秒时间戳（兼容 2026-06-24T16:00:00.000+0000 等后端格式） */

export const parseExpirationTime = (expirationTime) => {

	if (expirationTime == null || expirationTime === '') return 0

	const num = Number(expirationTime)

	if (!Number.isNaN(num) && num > 1e12) return num

	if (!Number.isNaN(num) && num > 1e9) return num * 1000

	let str = String(expirationTime).trim()

	// 微信小程序部分环境对 +0000 解析不稳定，转为 Z
	if (/\+0000$/.test(str)) {
		str = str.replace(/\+0000$/, 'Z')
	} else {
		// +0800 -> +08:00
		str = str.replace(/([+-]\d{2})(\d{2})$/, '$1:$2')
	}

	const ts = new Date(str).getTime()

	return Number.isNaN(ts) ? 0 : ts

}



/** 从 /vip 接口响应中取出 vip 数据对象 */

export const parseVipApiData = (res) => {

	const body = res?.data

	if (!body) return null



	const isOk =

		body.success === true ||

		body.code === 'success' ||

		String(body.code) === '200' ||

		(body.code == null && body.expirationTime != null)



	if (!isOk) return null



	if (body.data != null && typeof body.data === 'object') {

		return body.data

	}

	if (body.expirationTime != null || body.type != null || body.model != null) {

		const { code, success, message, msg, ...rest } = body

		return rest

	}

	return null

}



export const useVipInfo = () => {

	const userVipInfo = ref({

		ifVip: false,

		vipDetail: null

	})



	const isVipValid = (expirationTime) => {

		const ts = parseExpirationTime(expirationTime)

		return ts > Date.now()

	}



	const getRemainingDays = (expirationTime) => {

		const ts = parseExpirationTime(expirationTime)

		if (!ts) return 0

		const remainingMs = ts - Date.now()

		if (remainingMs <= 0) return 0

		return Math.ceil(remainingMs / (1000 * 60 * 60 * 24))

	}



	const getRemainingSeconds = (expirationTime) => {

		const ts = parseExpirationTime(expirationTime)

		if (!ts) return 0

		const remainingMs = ts - Date.now()

		if (remainingMs <= 0) return 0

		return Math.floor(remainingMs / 1000)

	}



	const formatExpireDate = (expirationTime) => {

		const ts = parseExpirationTime(expirationTime)

		if (!ts) return null

		const d = new Date(ts)

		const y = d.getFullYear()

		const m = String(d.getMonth() + 1).padStart(2, '0')

		const day = String(d.getDate()).padStart(2, '0')

		return `${y}-${m}-${day}`

	}



	const formatRemainingTime = (expirationTime) => {

		const days = getRemainingDays(expirationTime)

		if (days === 0) return '已过期'

		if (days >= 365) return `${Math.floor(days / 365)}年`

		if (days >= 30) return `${Math.floor(days / 30)}个月`

		return `${days}天`

	}



	/** 根据接口响应更新本地会员状态 */

	const applyVipResponse = (res) => {

		const vipData = parseVipApiData(res)

		if (!vipData) {

			userVipInfo.value = { ifVip: false, vipDetail: null }

			return userVipInfo.value

		}



		const exp = vipData.expirationTime ?? vipData.expireTime

		const isValid = isVipValid(exp)



		userVipInfo.value = {

			ifVip: isValid,

			vipDetail: isValid ? {

				...vipData,

				expirationTime: parseExpirationTime(exp),

				remainingDays: getRemainingDays(exp),

				remainingSeconds: getRemainingSeconds(exp),

				formatTime: formatRemainingTime(exp),

				expireDate: formatExpireDate(exp)

			} : null

		}



		uni.setStorageSync('userVipInfoStorage', vipData)

		return userVipInfo.value

	}



	const getVipInfo = async () => {

		const userId = uni.getStorageSync('userIdStorage')

		if (!userId) {

			userVipInfo.value = { ifVip: false, vipDetail: null }

			return userVipInfo.value

		}



		try {

			const res = await apiGetUserVip()

			console.log('[apiGetUserVip] 响应:', res?.data)

			return applyVipResponse(res)

		} catch (err) {

			console.error('[apiGetUserVip] 请求失败:', err)

			userVipInfo.value = { ifVip: false, vipDetail: null }

			return userVipInfo.value

		}

	}



	const refreshVipInfo = () => getVipInfo()



	const checkVipStatus = () => userVipInfo.value.ifVip



	return {

		userVipInfo,

		getVipInfo,

		refreshVipInfo,

		applyVipResponse,

		checkVipStatus,

		isVipValid,

		getRemainingDays,

		getRemainingSeconds,

		formatRemainingTime

	}

}


