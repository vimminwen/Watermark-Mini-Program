// 微信 openId 获取 + 手机号快捷登录
import { apiGetWechatPhoneLogin, apiPhoneLogin } from '@/api/api.js'
import { autoRegisterAndLogin } from './register.js'
import { getOpenId } from './openId.js'
import { isApiSuccess, shouldAutoRegister, getApiMessage } from './authHelper.js'

const parsePhoneNumber = (phoneRes) => {
	const body = phoneRes?.data
	if (!body) {
		throw new Error('获取手机号失败')
	}

	// { code: "success", data: "{\"phone_info\":{...}}" }
	let payload = body
	if (body.data != null && (body.code === 'success' || body.success === true)) {
		payload = body.data
	}

	let phoneData
	if (typeof payload === 'string') {
		let cleanedData = payload.replace(/\n/g, '').replace(/\s+/g, '')
		cleanedData = cleanedData.replace(/"\s*:/g, '":').replace(/:\s*"/g, ':"')
		try {
			phoneData = JSON.parse(cleanedData)
		} catch (e) {
			console.error('解析手机号数据失败:', e, cleanedData)
			throw new Error('手机号数据格式错误')
		}
	} else if (typeof payload === 'object') {
		phoneData = payload
	} else {
		throw new Error(`未知的数据类型: ${typeof payload}`)
	}

	const phoneInfo = phoneData?.phone_info || phoneData?.phoneInfo
	const phoneNumber =
		phoneInfo?.phoneNumber ||
		phoneInfo?.purePhoneNumber ||
		phoneData?.phoneNumber ||
		phoneData?.purePhoneNumber ||
		phoneData?.phone ||
		''

	if (!phoneNumber) {
		throw new Error('获取手机号失败')
	}

	return phoneNumber
}

const fetchPhoneNumberByCode = async (code) => {
	const phoneRes = await apiGetWechatPhoneLogin({ code })
	const body = phoneRes?.data
	if (!isApiSuccess(body)) {
		throw new Error(getApiMessage(body, '获取手机号失败'))
	}
	return parsePhoneNumber(phoneRes)
}

/** 从 getPhoneNumber 回调 detail 解析手机号（使用 /wx/getPhoneNumber） */
const resolvePhoneNumberFromDetail = async (detail) => {
	const code = detail?.code
	if (!code) {
		throw new Error('未获取到手机号授权 code，请使用真机或更新微信基础库后重试')
	}
	return fetchPhoneNumberByCode(code)
}

const loginWithOpenIdAndPhone = async (openId, phoneNumber) => {
	try {
		const loginRes = await apiPhoneLogin({
			openId,
			phone: phoneNumber
		})
		const loginData = loginRes.data

		console.log('快捷登录接口返回:', loginData)

		if (isApiSuccess(loginData)) {
			return loginData
		}

		if (shouldAutoRegister(loginData)) {
			console.log('用户未注册，开始自动注册并登录:', loginData.message)
			return autoRegisterAndLogin(phoneNumber, openId)
		}

		throw {
			message: loginData?.message || loginData?.msg || '登录失败',
			type: 'BUSINESS_ERROR',
			data: loginData
		}
	} catch (loginError) {
		if (shouldAutoRegister(loginError.data, loginError)) {
			console.log('快捷登录未注册，自动注册并登录:', loginError.message || loginError.data?.message)
			return autoRegisterAndLogin(phoneNumber, openId)
		}

		console.error('手机号快捷登录失败:', loginError)
		throw loginError
	}
}

/**
 * 从 button getphonenumber 事件 detail 快捷登录（模拟器/真机通用）
 */
const phoneQuickLoginFromDetail = async (detail) => {
	console.log('开始手机号快捷登录...', detail)

	const { openId } = await getOpenId(true)
	console.log('获取到最新 openId:', openId)

	const phoneNumber = await resolvePhoneNumberFromDetail(detail)
	console.log('成功获取手机号:', phoneNumber)
	uni.setStorageSync('userPhoneNumberStorage', phoneNumber)

	return loginWithOpenIdAndPhone(openId, phoneNumber)
}

export { getOpenId, phoneQuickLoginFromDetail }

export default getOpenId
