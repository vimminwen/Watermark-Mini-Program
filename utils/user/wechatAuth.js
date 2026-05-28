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

/**
 * 微信手机号快捷登录（未注册时自动注册并再次登录）
 */
const phoneQuickLogin = async (encryptedData, iv) => {
	console.log("开始手机号快捷登录...");

	const {
		openId
	} = await getOpenId(true);
	console.log("获取到最新 openId:", openId);

	const phoneRes = await decryptPhone(encryptedData, iv);
	const phoneNumber = parsePhoneNumber(phoneRes);

	console.log('成功获取手机号:', phoneNumber);
	uni.setStorageSync("userPhoneNumberStorage", phoneNumber);

	// 先尝试快捷登录
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

		// 业务失败：未注册则自动注册
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
		// HTTP 500「请注册账号」或业务层未注册：自动注册后再登录
		if (shouldAutoRegister(loginError.data, loginError)) {
			console.log('快捷登录未注册，自动注册并登录:', loginError.message || loginError.data?.message);
			return autoRegisterAndLogin(phoneNumber, openId);
		}

		console.error('手机号快捷登录失败:', loginError);
		throw loginError;
	}
};

export {
	getOpenId,
	decryptPhone,
	phoneQuickLogin
};

export default getOpenId;
