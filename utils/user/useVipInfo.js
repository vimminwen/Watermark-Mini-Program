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



/** type 字段 → 中文套餐类型 */
export const formatVipTypeLabel = (type) => {
	const t = String(type ?? '').trim().toLowerCase()
	const map = {
		month: '包月会员',
		quarter: '季度会员',
		season: '季度会员',
		year: '年度会员'
	}
	return map[t] || (type ? String(type) : '')
}



/** 展示用会员名称：优先 model，否则 type 中文 */
export const formatVipPlanName = (vipData) => {
	if (!vipData || typeof vipData !== 'object') return ''
	const model = String(vipData.model ?? '').trim()
	if (model) return model
	return formatVipTypeLabel(vipData.type)
}



/** 是否为有效会员（兼容无 expirationTime，仅有 model/type） */
export const isActiveVipMember = (vipData) => {
	if (!vipData || typeof vipData !== 'object') return false
	if (vipData.ifVip === true || vipData.ifVip === 1 || vipData.ifVip === 'true') {
		return true
	}
	const hasPlan = !!(String(vipData.model ?? '').trim() || String(vipData.type ?? '').trim())
	if (!hasPlan) return false
	const exp = resolveVipExpirationRaw(vipData)
	if (!exp) return true
	return parseExpirationTime(exp) > Date.now()
}



export const formatVipExpireDate = (expirationTime) => {
	const ts = parseExpirationTime(expirationTime)
	if (!ts) return null
	const d = new Date(ts)
	const y = d.getFullYear()
	const m = String(d.getMonth() + 1).padStart(2, '0')
	const day = String(d.getDate()).padStart(2, '0')
	return `${y}-${m}-${day}`
}



/** 接口返回的到期时间字段（多种命名） */
export const resolveVipExpirationRaw = (vipData) => {
	if (!vipData || typeof vipData !== 'object') return null
	const raw =
		vipData.expirationTime ??
		vipData.expireTime ??
		vipData.expireAt ??
		vipData.endTime ??
		vipData.vipEndTime ??
		vipData.validUntil ??
		vipData.deadline ??
		vipData.expireDate
	if (raw == null || raw === '') return null
	return raw
}



const MS_PER_DAY = 24 * 60 * 60 * 1000



/** 按套餐 type/model 推断周期天数 */
export const getVipPlanDays = (vipData) => {
	const label = `${vipData?.model ?? ''} ${vipData?.type ?? ''}`.toLowerCase()
	if (label.includes('季') || label.includes('quarter') || label.includes('season')) {
		return 90
	}
	if (label.includes('年') || label.includes('year')) {
		return 365
	}
	return 30
}



/**
 * 解析到期时间：优先接口字段；若无则按开通时间 + 套餐周期估算
 */
export const resolveVipExpirationSource = (vipData) => {
	const raw = resolveVipExpirationRaw(vipData)
	if (raw) return raw
	if (!vipData || !isActiveVipMember(vipData)) return null

	const startRaw =
		vipData.startTime ??
		vipData.createTime ??
		vipData.beginTime ??
		vipData.openTime
	let startTs = parseExpirationTime(startRaw)
	if (!startTs) startTs = Date.now()

	return startTs + getVipPlanDays(vipData) * MS_PER_DAY
}



/** 根据开通/到期时间估算会员周期已使用百分比 */

export const getMembershipUsedPercent = (vipData) => {

	if (!vipData || typeof vipData !== 'object') return 0

	const end = parseExpirationTime(resolveVipExpirationSource(vipData))

	if (!end) return 0

	let start = parseExpirationTime(

		vipData.startTime ?? vipData.createTime ?? vipData.beginTime ?? vipData.openTime

	)

	if (!start) {

		const label = String(vipData.model ?? vipData.type ?? '').toLowerCase()

		let days = 30

		if (label.includes('季') || label.includes('quarter')) days = 90

		else if (label.includes('年') || label.includes('year')) days = 365

		start = end - days * 24 * 60 * 60 * 1000

	}

	if (end <= start) return 0

	const now = Date.now()

	if (now >= end) return 100

	if (now <= start) return 0

	return Math.min(100, Math.max(0, Math.round(((now - start) / (end - start)) * 100)))

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



		const isValid = isActiveVipMember(vipData)

		const expSource = resolveVipExpirationSource(vipData)

		const expireDate = formatExpireDate(expSource) || formatVipExpireDate(expSource)

		userVipInfo.value = {

			ifVip: isValid,

			vipDetail: isValid ? {

				...vipData,

				planName: formatVipPlanName(vipData),

				typeLabel: formatVipTypeLabel(vipData.type),

				expirationTime: parseExpirationTime(expSource),

				remainingDays: getRemainingDays(expSource),

				remainingSeconds: getRemainingSeconds(expSource),

				formatTime: expSource ? formatRemainingTime(expSource) : '',

				expireDate,

				hasExpireDate: !!expireDate,

				isExpireEstimated: !resolveVipExpirationRaw(vipData) && !!expSource

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

		formatRemainingTime,

		getMembershipUsedPercent

	}

}

