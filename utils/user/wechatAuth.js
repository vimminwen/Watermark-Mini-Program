// 微信 openId 获取 + 手机号解密 + 快捷登录 工具
import {
	apiDecryptPhone,
	apiPhoneLogin
} from '@/api/api.js';
import { autoRegisterAndLogin } from './register.js';
import { getOpenId } from './openId.js';
import {
	isApiSuccess,
	shouldAutoRegister
} from './authHelper.js';

/**
 * 解密微信手机号（自带重试 + sessionKey 自动刷新）
 */
const decryptPhone = async (encryptedData, iv, maxRetries = 2) => {
	let lastError = null;

	for (let i = 0; i < maxRetries; i++) {
		try {
			const forceRefresh = i === 0;

			console.log(`第${i + 1}次尝试解密，强制刷新: ${forceRefresh}`);
			const {
				sessionKey
			} = await getOpenId(forceRefresh);

			if (!sessionKey) {
				throw new Error('sessionKey 不存在');
			}

			const decryptRes = await apiDecryptPhone({
				encryptedData: encryptedData,
				sessionKey: sessionKey,
				iv: iv
			});

			console.log('解密接口返回:', decryptRes.data);

			if (decryptRes.data && decryptRes.data.data) {
				return decryptRes.data;
			}

			if (decryptRes.data?.code === '500' || decryptRes.data?.success === false) {
				lastError = new Error(decryptRes.data.message || '解密失败');

				if (i < maxRetries - 1) {
					uni.removeStorageSync("sessionKeyStorage");
					continue;
				}
			}

			return decryptRes.data;

		} catch (error) {
			console.error(`第${i + 1}次解密失败:`, error);
			lastError = error;

			if (i < maxRetries - 1) {
				uni.removeStorageSync("sessionKeyStorage");
				continue;
			}
		}
	}

	throw lastError || new Error('解密失败');
};

const parsePhoneNumber = (phoneRes) => {
	let phoneData;
	if (typeof phoneRes.data === 'string') {
		let cleanedData = phoneRes.data.replace(/\n/g, '').replace(/\s+/g, '');
		cleanedData = cleanedData.replace(/"\s*:/g, '":').replace(/:\s*"/g, ':"');
		try {
			phoneData = JSON.parse(cleanedData);
		} catch (e) {
			console.error("解析手机号数据失败:", e, cleanedData);
			throw new Error("手机号数据格式错误");
		}
	} else if (typeof phoneRes.data === 'object') {
		phoneData = phoneRes.data;
	} else {
		throw new Error(`未知的数据类型: ${typeof phoneRes.data}`);
	}

	const phoneNumber = phoneData?.phoneNumber ||
		phoneData?.purePhoneNumber ||
		phoneData?.phone ||
		'';

	if (!phoneNumber) {
		throw new Error('获取手机号失败');
	}

	return phoneNumber;
};

/** 从 getPhoneNumber 回调 detail 解析手机号（兼容 encryptedData 与新版 code） */
const resolvePhoneNumberFromDetail = async (detail) => {
	if (detail?.encryptedData && detail?.iv) {
		const phoneRes = await decryptPhone(detail.encryptedData, detail.iv);
		return parsePhoneNumber(phoneRes);
	}

	if (detail?.code) {
		const phoneRes = await apiDecryptPhone({ code: detail.code });
		return parsePhoneNumber(phoneRes);
	}

	throw new Error('获取手机号失败，请检查微信授权或开发者工具模拟配置');
};

const loginWithOpenIdAndPhone = async (openId, phoneNumber) => {
	try {
		const loginRes = await apiPhoneLogin({
			openId,
			phone: phoneNumber
		});
		const loginData = loginRes.data;

		console.log('快捷登录接口返回:', loginData);

		if (isApiSuccess(loginData)) {
			return loginData;
		}

		if (shouldAutoRegister(loginData)) {
			console.log('用户未注册，开始自动注册并登录:', loginData.message);
			return autoRegisterAndLogin(phoneNumber, openId);
		}

		throw {
			message: loginData?.message || loginData?.msg || '登录失败',
			type: 'BUSINESS_ERROR',
			data: loginData
		};
	} catch (loginError) {
		if (shouldAutoRegister(loginError.data, loginError)) {
			console.log('快捷登录未注册，自动注册并登录:', loginError.message || loginError.data?.message);
			return autoRegisterAndLogin(phoneNumber, openId);
		}

		console.error('手机号快捷登录失败:', loginError);
		throw loginError;
	}
};

/**
 * 微信手机号快捷登录（未注册时自动注册并再次登录）
 */
const phoneQuickLogin = async (encryptedData, iv) =>
	phoneQuickLoginFromDetail({ encryptedData, iv });

/**
 * 从 button getphonenumber 事件 detail 快捷登录（模拟器/真机通用）
 */
const phoneQuickLoginFromDetail = async (detail) => {
	console.log('开始手机号快捷登录...', detail);

	const { openId } = await getOpenId(true);
	console.log('获取到最新 openId:', openId);

	const phoneNumber = await resolvePhoneNumberFromDetail(detail);
	console.log('成功获取手机号:', phoneNumber);
	uni.setStorageSync('userPhoneNumberStorage', phoneNumber);

	return loginWithOpenIdAndPhone(openId, phoneNumber);
};

export {
	getOpenId,
	decryptPhone,
	phoneQuickLogin,
	phoneQuickLoginFromDetail
};

export default getOpenId;
